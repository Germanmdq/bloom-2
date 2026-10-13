import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function hasValidBootstrapToken(request: Request) {
  const expected = process.env.ADMIN_BOOTSTRAP_TOKEN?.trim();
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !received || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

/**
 * Temporal y protegido por ADMIN_BOOTSTRAP_TOKEN. Crea o actualiza el único
 * administrador por teléfono sin exponer la service role al navegador.
 */
export async function POST(request: Request) {
  if (!hasValidBootstrapToken(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const phone = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";
    if (phone.length < 8 || phone.length > 15) {
      return NextResponse.json({ error: "Teléfono inválido." }, { status: 400 });
    }

    const email = `${phone}@bloom.local`;
    const supabase = createServiceRoleClient();
    const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;

    const existing = listed.users.find((user) => user.email?.toLowerCase() === email);
    const authPayload = {
      email,
      password: phone,
      email_confirm: true,
      user_metadata: { full_name: "Administrador Bloom", phone },
    };
    const authResult = existing
      ? await supabase.auth.admin.updateUserById(existing.id, authPayload)
      : await supabase.auth.admin.createUser(authPayload);
    if (authResult.error || !authResult.data.user) throw authResult.error ?? new Error("No se pudo crear el administrador.");

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authResult.data.user.id,
      full_name: "Administrador Bloom",
      phone,
      role: "ADMIN",
      is_customer: false,
    });
    if (profileError) throw profileError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[bootstrap-phone-admin]", error);
    return NextResponse.json({ error: "No se pudo preparar el administrador." }, { status: 500 });
  }
}
