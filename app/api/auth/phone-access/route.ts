import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { supabaseSessionCookieOptions } from "@/lib/supabase/cookie-options";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * Acceso de clientes por teléfono, sin contraseña ni código.
 *
 * El servidor decide todo: busca al cliente por su teléfono normalizado (10 dígitos), y si existe
 * abre la sesión con un token de un solo uso que se genera y se canjea dentro de este mismo request
 * (nunca viaja al navegador). Las contraseñas de los clientes son aleatorias y no se usan.
 * La cookie de sesión de Supabase (400 días, renovable) mantiene al dispositivo logueado.
 *
 * Respuestas:
 *   { status: "ok", name, created }       -> sesión abierta
 *   { status: "needs_registration" }      -> teléfono nuevo: pedir nombre y dirección
 */

// Limitador best-effort por IP (en memoria: en serverless se reinicia por instancia).
const hits = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 20;
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

/** Abre sesión para un usuario de Auth sin contraseña. Devuelve true si quedó logueado. */
async function openSession(
  request: NextRequest,
  response: NextResponse,
  service: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  phone: string,
) {
  const { data: found, error: userError } = await service.auth.admin.getUserById(userId);
  if (userError || !found.user) return false;

  // Usuarios sin email (identidades antiguas por teléfono) reciben uno interno para poder abrir sesión.
  let email = found.user.email;
  if (!email) {
    email = `${phone}@clientes.bloom.local`;
    const { error } = await service.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) return false;
  }

  const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) return false;

  const { error: verifyError } = await sessionClient(request, response).auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  return !verifyError;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un minuto." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "El acceso de clientes no está configurado en el servidor." }, { status: 503 });
  }

  const fullName = String(body.fullName ?? "").trim().slice(0, 120);
  const address = String(body.address ?? "").trim().slice(0, 300);

  const service = createServiceRoleClient();

  // Solo cuentas de cliente: el personal nunca entra por esta vía.
  const { data: profile, error: lookupError } = await service
    .from("profiles")
    .select("id, full_name")
    .eq("phone", phone)
    .eq("is_customer", true)
    .limit(1)
    .maybeSingle();
  if (lookupError) {
    console.error("[phone-access] lookup", lookupError.message);
    return NextResponse.json({ error: "No pudimos verificar el número. Intentá de nuevo." }, { status: 500 });
  }

  if (profile) {
    const response = NextResponse.json({ status: "ok", name: profile.full_name?.trim() || "", created: false });
    if (!(await openSession(request, response, service, profile.id, phone))) {
      return NextResponse.json({ error: "No pudimos iniciar tu sesión. Intentá de nuevo." }, { status: 500 });
    }
    return response;
  }

  // Teléfono nuevo: hace falta registrarse.
  if (!fullName || !address) return NextResponse.json({ status: "needs_registration" });

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: `${phone}@clientes.bloom.local`,
    password: randomBytes(32).toString("hex"), // contraseña aleatoria: no se usa nunca para entrar
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created.user) {
    console.error("[phone-access] createUser", createError?.message);
    return NextResponse.json({ error: "No pudimos crear tu cuenta. Intentá de nuevo." }, { status: 500 });
  }

  // Siempre cliente, nunca staff. No se envía `role`: queda el valor por defecto de la base.
  const { error: profileError } = await service.from("profiles").upsert(
    { id: created.user.id, full_name: fullName, phone, default_address: address, is_customer: true },
    { onConflict: "id" },
  );
  if (profileError) {
    console.error("[phone-access] profile", profileError.message);
    await service.auth.admin.deleteUser(created.user.id); // deshace solo el usuario recién creado
    const duplicate = profileError.code === "23505";
    return NextResponse.json(
      { error: duplicate ? "Ese teléfono ya está registrado. Probá ingresar de nuevo." : "No pudimos guardar tus datos. Intentá de nuevo." },
      { status: duplicate ? 409 : 500 },
    );
  }

  const response = NextResponse.json({ status: "ok", name: fullName, created: true });
  if (!(await openSession(request, response, service, created.user.id, phone))) {
    return NextResponse.json({ error: "Tu cuenta se creó, pero no pudimos iniciar la sesión. Volvé a ingresar con tu teléfono." }, { status: 500 });
  }
  return response;
}
