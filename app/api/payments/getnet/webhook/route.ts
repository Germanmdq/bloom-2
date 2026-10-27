import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { applyDebtPayment } from "@/lib/cuenta-corriente";
import { basicAuthMatches, creditedCoversDeclared, getnetConfig, getPaymentIntent, parseOrderId } from "@/lib/getnet";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Webhook de Getnet (Web Checkout). Getnet reintenta hasta 5 veces y luego cada hora por 72 h salvo que
 * respondamos 200, así que:
 *  - 401 si el Basic Auth no coincide (notificación no auténtica);
 *  - 200 para todo lo que no hay que reintentar (rechazado, pendiente, duplicado, no es de cuenta corriente);
 *  - 500 solo ante un fallo transitorio nuestro o de Getnet (para que reintente).
 * Nunca se confía en el cuerpo: estado y monto se confirman consultando el payment intent a Getnet.
 */
export async function POST(request: Request) {
  const cfg = getnetConfig();
  if (!cfg.enabled) return NextResponse.json({ error: "Getnet no está habilitado" }, { status: 503 });

  if (!basicAuthMatches(request.headers.get("authorization"), cfg.webhookUser, cfg.webhookPassword)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { payment_intent_id?: string } | null;
  const intentId = payload?.payment_intent_id?.trim();
  if (!intentId) return NextResponse.json({ ok: true, ignored: "sin payment_intent_id" });

  let intent: Awaited<ReturnType<typeof getPaymentIntent>> = null;
  try {
    intent = await getPaymentIntent(intentId);
  } catch (e) {
    console.error("[getnet/webhook] no se pudo consultar a Getnet", e instanceof Error ? e.message : e);
  }
  if (!intent) return NextResponse.json({ error: "No se pudo consultar a Getnet" }, { status: 500 }); // reintentar

  // Solo pagos aprobados.
  const resultStatus = String(intent.payment?.result?.status ?? "");
  if (intent.status !== "paid" || !["Authorized", "Approved"].includes(resultStatus)) {
    return NextResponse.json({ ok: true, ignored: `estado ${intent.status}/${resultStatus}` });
  }

  // Solo payment intents creados por /api/cuenta/pagar (order_id propio) y para un cliente válido.
  const declared = parseOrderId(intent.order_id);
  const customerId = intent.customer?.customer_id;
  if (!declared || !customerId || !UUID.test(customerId)) {
    return NextResponse.json({ ok: true, ignored: "no es un pago de cuenta corriente" });
  }
  if (intent.payment?.currency !== "ARS") {
    console.error("[getnet/webhook] moneda inesperada", intent.payment?.currency, intentId);
    return NextResponse.json({ ok: true, ignored: "moneda" });
  }

  // El monto realmente acreditado (consultado a Getnet) debe cubrir el declarado.
  if (!creditedCoversDeclared(intent.payment?.amount, declared.cents)) {
    console.error(`[getnet/webhook] monto acreditado ${intent.payment?.amount} no coincide con el declarado ${declared.cents}`, intentId);
    return NextResponse.json({ ok: true, ignored: "monto no coincide" });
  }

  // Idempotente: la referencia GN:<payment_intent_id> se registra una sola vez aunque llegue repetida.
  const result = await applyDebtPayment(createServiceRoleClient(), customerId.toLowerCase(), declared.cents / 100, {
    method: "GETNET",
    reference: `GN:${intentId}`,
  });
  if (result.status === "error") {
    console.error("[getnet/webhook]", result.message, intentId);
    return NextResponse.json({ error: "Error registrando el pago" }, { status: 500 }); // reintentar
  }
  if (result.status === "no_debt" || (result.status === "applied" && result.excess > 0)) {
    console.error("[getnet/webhook] pagó de más / sin deuda: revisar devolución", intentId, JSON.stringify(result));
  }
  return NextResponse.json({ ok: true, result: result.status });
}
