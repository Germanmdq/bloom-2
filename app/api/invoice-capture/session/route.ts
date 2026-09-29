import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(request: Request) {
  const user = await requireDashboardAdmin();
  if (!user) return NextResponse.json({ error: "Tu sesión no tiene acceso al panel." }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Falta configurar la clave privada de Supabase en el servidor." }, { status: 503 });

  const token = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("invoice_upload_tokens").insert({ token_hash: tokenHash, expires_at: expiresAt, created_by: user.id });
  if (error) return NextResponse.json({ error: "No se pudo crear la sesión de carga. Revisá que la migración esté aplicada." }, { status: 500 });

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return NextResponse.json({ url: `${origin}/cargar-facturas?token=${token}`, expiresAt });
}
