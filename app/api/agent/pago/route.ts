import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyOrderRef } from "@/lib/agent/core";

/**
 * Medio de pago de un pedido recién tomado por el asistente.
 *  - "cash":   el cliente paga en efectivo al retirar o al recibir. Solo deja la aclaración en el pedido
 *              (sigue pendiente de cobro; el cobro real lo registra el local).
 *  - "online": todavía no disponible (Getnet para pedidos se activa cuando estén las credenciales).
 * Se exige la firma que el servidor entregó junto con ese pedido, así nadie puede tocar pedidos ajenos.
 */
export async function POST(request: Request) {
  const secret = process.env.AGENT_SIGNING_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!secret) return NextResponse.json({ error: "No disponible." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const orderId = String(body?.orderId ?? "");
  const method = String(body?.method ?? "");
  if (!verifyOrderRef(secret, orderId, typeof body?.token === "string" ? body.token : null)) {
    return NextResponse.json({ error: "No se pudo validar el pedido." }, { status: 403 });
  }
  if (method === "online") {
    return NextResponse.json({ error: "El pago online estará disponible próximamente." }, { status: 503 });
  }
  if (method !== "cash") return NextResponse.json({ error: "Medio de pago inválido." }, { status: 400 });

  const db = createServiceRoleClient();
  const { data: order } = await db.from("orders").select("id, paid, delivery_type, payment_notes").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  if (order.paid) return NextResponse.json({ ok: true, message: "El pedido ya figura como pagado." });

  const when = order.delivery_type === "delivery" ? "al recibir" : "al retirar";
  const note = `${order.payment_notes ? `${order.payment_notes} | ` : ""}Paga en efectivo ${when}`;
  const { error } = await db.from("orders").update({ payment_notes: note }).eq("id", orderId);
  if (error) return NextResponse.json({ error: "No pude registrar el medio de pago." }, { status: 500 });
  return NextResponse.json({ ok: true, message: `Perfecto, pagás en efectivo ${when}.` });
}
