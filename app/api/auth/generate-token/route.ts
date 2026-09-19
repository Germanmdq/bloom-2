import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { supabaseSessionCookieOptions } from "@/lib/supabase/cookie-options";
import { isAdminEmail } from "@/lib/auth/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bloommdp.com";

export async function POST(request: NextRequest) {
  // Verificar que el caller es admin
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: supabaseSessionCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { userId, label } = body as { userId?: string; label?: string };

  if (!userId) {
    return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // Verificar que el usuario existe
  const { data: { user: targetUser }, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Crear token
  const { data, error } = await admin
    .from("login_tokens")
    .insert({ user_id: userId, label: label ?? null })
    .select("token, expires_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Error al generar token" }, { status: 500 });
  }

  const link = `${SITE_URL}/ingresar?t=${data.token}`;
  return NextResponse.json({ link, expiresAt: data.expires_at });
}
