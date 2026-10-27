import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { supabaseSessionCookieOptions } from "@/lib/supabase/cookie-options";
import { argentinaE164, customerLoginEmail, customerPasswords, phoneDigits, uniquePhoneVariants } from "@/lib/auth/customer-phone";

const normalizePhone = phoneDigits;

// Acepta el mismo número ingresado como 223..., +54 223... o +54 9 223...
// sin hacer coincidir por los últimos seis dígitos (que son solo la clave
// interna y no identifican de forma segura a un teléfono).
function samePhone(left: string, right: string) {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  if (a === b) return true;
  return a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10);
}

type CustomerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_customer: boolean | null;
  role: string | null;
};

function sessionClient(request: NextRequest, response: NextResponse) {
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: supabaseSessionCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
}

async function startCustomerSession(
  request: NextRequest,
  response: NextResponse,
  phones: string[],
  emails: string[],
) {
  const client = sessionClient(request, response);
  let lastError: { message?: string } | null = null;

  // Bloom ya tenía clientes migrados con `numero@bloom.local`; las cuentas
  // creadas en una versión intermedia usaron identidad de teléfono. Probamos
  // ambos formatos internamente para que el cliente siempre vea un solo campo.
  for (const password of customerPasswords(phones[0] ?? "")) {
    for (const email of emails) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (!error) return { error: null };
      lastError = error;
    }
    for (const phone of phones) {
      const { error } = await client.auth.signInWithPassword({ phone: argentinaE164(phone), password });
      if (!error) return { error: null };
      lastError = error;
    }
  }

  return { error: lastError };
}

function publicClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  const fullName = String(body.fullName ?? "").trim();

  if (phone.length < 7 || phone.length > 15) {
    return NextResponse.json({ error: "Ingresá un número de teléfono válido." }, { status: 400 });
  }

  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  // El proyecto permite esta lectura para reconocer clientes. No usamos la
  // clave de servicio en este paso: una clave vieja o de otro proyecto no
  // puede impedir que un cliente existente entre a su cuenta.
  const { data: profiles, error: lookupError } = await publicClient()
    .from("profiles")
    .select("id, full_name, phone, is_customer, role")
    .not("phone", "is", null)
    .limit(1000);

  if (lookupError) {
    console.error("[phone-access] profile lookup", lookupError);
    return NextResponse.json({ error: "No pudimos verificar el número. Intentá de nuevo." }, { status: 500 });
  }

  const matchingProfiles = ((profiles ?? []) as CustomerProfile[]).filter((candidate) =>
    samePhone(candidate.phone ?? "", phone),
  );
  // Si el mismo teléfono también pertenece a un administrador, el acceso de
  // clientes no debe intentar reutilizar ni modificar esa cuenta. Priorizamos
  // siempre la cuenta marcada como cliente y dejamos crear una separada.
  const profile = matchingProfiles.find((candidate) => candidate.is_customer)
    ?? matchingProfiles.find((candidate) => candidate.role !== "ADMIN");

  if (!profile && !fullName) {
    return NextResponse.json({ status: "needs_name" });
  }

  if (profile) {
    const response = NextResponse.json({ status: "ok", name: profile.full_name?.trim() || "", created: false });
    const variants = uniquePhoneVariants(phone, profile.phone);
    const { error: signInError } = await startCustomerSession(
      request,
      response,
      variants,
      variants.map(customerLoginEmail),
    );
    if (signInError) {
      console.error("[phone-access] sign in", signInError);
      if (!fullName) {
        return NextResponse.json({ status: "needs_name" });
      }
      // Si existe un perfil antiguo sin identidad de acceso compatible,
      // continuar con el alta crea una cuenta de cliente independiente.
      // No se toca la cuenta de personal o administración existente.
    }
    if (!signInError) return response;
  }

  if (!hasServiceRole) {
    return NextResponse.json(
      { error: "El alta de clientes todavía no está configurada. Intentá más tarde." },
      { status: 503 },
    );
  }

  const service = createServiceRoleClient();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: customerLoginEmail(phone),
    password: customerPasswords(phone)[0],
    email_confirm: true,
    user_metadata: { full_name: fullName, is_customer: true },
  });

  if (createError || !created.user) {
    console.error("[phone-access] customer creation", createError);
    return NextResponse.json({ error: "No pudimos crear tu cuenta. Intentá de nuevo." }, { status: 500 });
  }

  const { error: profileError } = await service.from("profiles").upsert({
    id: created.user.id,
    full_name: fullName,
    phone,
    is_customer: true,
  }, { onConflict: "id" });

  if (profileError) {
    console.error("[phone-access] profile update", profileError);
    return NextResponse.json({ error: "Tu cuenta se creó, pero no pudimos completar tus datos. Intentá nuevamente." }, { status: 500 });
  }

  const response = NextResponse.json({ status: "ok", name: fullName, created: true });
  const { error: signInError } = await startCustomerSession(
    request,
    response,
    [phone],
    [customerLoginEmail(phone)],
  );
  if (signInError) {
    console.error("[phone-access] sign in", signInError);
    return NextResponse.json({ error: "No pudimos iniciar tu sesión. Intentá de nuevo." }, { status: 500 });
  }

  return response;
}
