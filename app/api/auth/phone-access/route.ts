import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { supabaseSessionCookieOptions } from "@/lib/supabase/cookie-options";

const normalizePhone = (value: string) => value.replace(/\D/g, "");

type CustomerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_customer: boolean | null;
};

function passwordForPhone(phone: string) {
  return phone.slice(-6);
}

function sessionClient(request: NextRequest, response: NextResponse) {
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: supabaseSessionCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
}

async function startCustomerSession(request: NextRequest, response: NextResponse, phone: string) {
  const client = sessionClient(request, response);
  return client.auth.signInWithPassword({ phone, password: passwordForPhone(phone) });
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

  // `profiles` tiene una política de lectura pública. No dependemos de la
  // service_role para reconocer a los clientes ya migrados.
  const { data: profiles, error: lookupError } = await publicClient()
    .from("profiles")
    .select("id, full_name, phone, is_customer")
    .not("phone", "is", null)
    .limit(1000);

  if (lookupError) {
    console.error("[phone-access] profile lookup", lookupError);
    return NextResponse.json({ error: "No pudimos verificar el número. Intentá de nuevo." }, { status: 500 });
  }

  const profile = ((profiles ?? []) as CustomerProfile[]).find((candidate) => normalizePhone(candidate.phone ?? "") === phone);

  if (profile && !profile.is_customer) {
    return NextResponse.json({ error: "El acceso del personal se realiza desde el panel interno." }, { status: 403 });
  }

  if (!profile && !fullName) {
    return NextResponse.json({ status: "needs_name" });
  }

  // Los clientes ya migrados entran con el teléfono y la contraseña interna
  // formada por sus últimos seis dígitos. Este camino no usa service_role.
  if (profile) {
    const response = NextResponse.json({ status: "ok", name: profile.full_name?.trim() || "", created: false });
    const { error: signInError } = await startCustomerSession(request, response, phone);
    if (signInError) {
      console.error("[phone-access] sign in", signInError);
      return NextResponse.json({ error: "No pudimos iniciar tu sesión. Intentá de nuevo." }, { status: 401 });
    }
    return response;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      { error: "El alta de clientes todavía no está configurada. Intentá más tarde." },
      { status: 503 },
    );
  }

  const service = createServiceRoleClient();

  let customerName = fullName;
  if (!profile) {
    const { data: created, error: createError } = await service.auth.admin.createUser({
      phone,
      password: passwordForPhone(phone),
      phone_confirm: true,
      user_metadata: { full_name: fullName, is_customer: true },
    });

    if (createError || !created.user) {
      console.error("[phone-access] customer creation", createError);
      return NextResponse.json({ error: "No pudimos crear tu cuenta. Intentá de nuevo." }, { status: 500 });
    }

    const { error: profileError } = await service.from("profiles").update({
      full_name: fullName,
      phone,
      is_customer: true,
    }).eq("id", created.user.id);

    if (profileError) {
      console.error("[phone-access] profile update", profileError);
      return NextResponse.json({ error: "Tu cuenta se creó, pero no pudimos completar tus datos. Intentá nuevamente." }, { status: 500 });
    }
    customerName = fullName;
  }

  const response = NextResponse.json({ status: "ok", name: customerName, created: !profile });
  const { error: signInError } = await startCustomerSession(request, response, phone);
  if (signInError) {
    console.error("[phone-access] sign in", signInError);
    return NextResponse.json({ error: "No pudimos iniciar tu sesión. Intentá de nuevo." }, { status: 500 });
  }

  return response;
}
