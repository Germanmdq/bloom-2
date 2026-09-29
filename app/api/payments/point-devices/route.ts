import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { pointListDevices, pointSetOperatingMode } from "@/lib/mercadopago-point";

/**
 * Lista los terminales Point asociados a la cuenta (para configurar MERCADOPAGO_DEVICE_ID).
 * Solo staff con email admin del panel.
 */
export async function GET() {
  try {
    const supabaseSession = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabaseSession.auth.getUser();
    if (userErr || !user?.email || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const resp = await pointListDevices();
    const body = (await resp.json().catch(() => ({}))) as unknown;
    if (!resp.ok) {
      return NextResponse.json(
        { error: "No se pudo listar dispositivos Point", details: body },
        { status: resp.status === 401 ? 401 : 502 }
      );
    }

    return NextResponse.json(body);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    if (message.includes("Falta MERCADOPAGO")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    console.error("[point-devices]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH /api/payments/point-devices — cambia el operating_mode del dispositivo */
export async function PATCH(req: NextRequest) {
  try {
    const supabaseSession = await createClient();
    const { data: { user }, error: userErr } = await supabaseSession.auth.getUser();
    if (userErr || !user?.email || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { device_id, mode } = (await req.json()) as { device_id?: string; mode?: string };
    if (!device_id) return NextResponse.json({ error: "device_id requerido" }, { status: 400 });
    if (mode !== "PDV" && mode !== "STANDALONE") {
      return NextResponse.json({ error: "mode debe ser PDV o STANDALONE" }, { status: 400 });
    }

    const resp = await pointSetOperatingMode(device_id, mode);
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json({ error: "No se pudo cambiar el modo", details: body }, { status: 502 });
    }
    return NextResponse.json({ ok: true, device_id, mode, details: body });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    console.error("[point-devices PATCH]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
