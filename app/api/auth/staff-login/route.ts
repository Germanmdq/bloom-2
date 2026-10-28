import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { supabaseSessionCookieOptions } from "@/lib/supabase/cookie-options";
import { normalizePhone, phoneVariants, PHONE_ERROR } from "@/lib/phone";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["ADMIN", "MANAGER", "WAITER", "KITCHEN"];
const GENERIC_ERROR = "Teléfono o contraseña incorrectos.";

// Limitador best-effort (en memoria): 6 intentos cada 10 minutos por IP + teléfono.
const attempts = new Map<string, { count: number; reset: number }>();
function limited(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + 10 * 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 6;
}

/** Ingreso del personal: teléfono + contraseña. Solo perfiles con is_customer=false y rol operativo. */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const body = await request.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  const password = String(body.password ?? "");
  if (!phone) return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });
  if (!password) return NextResponse.json({ error: "Escribí tu contraseña." }, { status: 400 });
  if (limited(`${ip}:${phone}`)) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá 10 minutos." }, { status: 429 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "El acceso no está configurado en el servidor." }, { status: 503 });
  }

  const service = createServiceRoleClient();
  const { data: matches } = await service
    .from("profiles")
    .select("id, role, is_customer")
    .in("phone", phoneVariants(phone))
    .limit(5);
  const staff = (matches ?? []).filter((p) => p.is_customer === false && STAFF_ROLES.includes(p.role ?? ""));
  if (staff.length !== 1) return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });

  const { data: found } = await service.auth.admin.getUserById(staff[0].id);
  const email = found?.user?.email;
  if (!email) return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });

  const response = NextResponse.json({ status: "ok" });
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: supabaseSessionCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  return response;
}
