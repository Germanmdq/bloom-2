import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bloommdp.com";

function bail(reason: string) {
  return NextResponse.redirect(new URL(`/auth?error=${reason}`, SITE_URL));
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) return bail("link_invalido");

  const admin = createServiceRoleClient();

  // Buscar y validar token
  const { data, error } = await admin
    .from("login_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token", token)
    .single();

  if (error || !data) return bail("link_invalido");
  if (data.used_at) return bail("link_ya_usado");
  if (new Date(data.expires_at) < new Date()) return bail("link_expirado");

  // Marcar como usado antes de continuar (evita replay attacks)
  await admin
    .from("login_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  // Obtener email del usuario
  const { data: { user }, error: userErr } = await admin.auth.admin.getUserById(data.user_id);
  if (userErr || !user?.email) return bail("usuario_no_encontrado");

  // Generar magic link de Supabase
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
    options: { redirectTo: `${SITE_URL}/cuenta` },
  });

  if (linkErr || !linkData.properties?.action_link) return bail("error_sesion");

  return NextResponse.redirect(linkData.properties.action_link);
}
