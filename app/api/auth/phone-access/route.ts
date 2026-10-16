import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
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
  return `bloom-${phone.slice(-6)}`;
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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  const fullName = String(body.fullName ?? "").trim();

  if (phone.length < 7 || phone.length > 15) {
    return NextResponse.json({ error: "Ingresá un número de teléfono válido." }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { data: profiles, error: lookupError } = await service
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

  let customerName = profile?.full_name?.trim() || fullName;
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
  } else {
    const { error: passwordError } = await service.auth.admin.updateUserById(profile.id, {
      password: passwordForPhone(phone),
      phone_confirm: true,
    });
    if (passwordError) {
      console.error("[phone-access] customer session setup", passwordError);
      return NextResponse.json({ error: "No pudimos iniciar tu sesión. Intentá de nuevo." }, { status: 500 });
    }
  }

  const response = NextResponse.json({ status: "ok", name: customerName, created: !profile });
  const { error: signInError } = await startCustomerSession(request, response, phone);
  if (signInError) {
    console.error("[phone-access] sign in", signInError);
    return NextResponse.json({ error: "No pudimos iniciar tu sesión. Intentá de nuevo." }, { status: 500 });
  }

  return response;
}
