import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, MerchantOrder, Payment } from "mercadopago";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago-access-token";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { applyDebtPayment } from "@/lib/cuenta-corriente";

function parseNotificationPayload(raw: string, url: URL) {
  let topic = url.searchParams.get("topic") || url.searchParams.get("type");
  let resourceId = url.searchParams.get("id") || url.searchParams.get("data.id");

  if (raw.trim()) {
    if (raw.trim().startsWith("{")) {
      try {
        const j = JSON.parse(raw) as {
          type?: string;
          topic?: string;
          action?: string;
          data?: { id?: string | number };
        };
        topic = j.type || j.topic || j.action || topic;
        if (j.data?.id != null) resourceId = String(j.data.id);
      } catch {
        /* ignore */
      }
    } else {
      const p = new URLSearchParams(raw);
      topic = p.get("topic") || p.get("type") || topic;
      resourceId = p.get("id") || p.get("data.id") || resourceId;
    }
  }

  return { topic: topic?.toLowerCase() ?? "", resourceId };
}

type ApprovedPayment = { id: string; amount: number; currency: string | null; externalRef: string | null };

/** Marca el pedido como pagado SOLO si lo acreditado cubre el total del pedido. Idempotente. */
async function markOrderPaid(orderId: string, payment: { id: string; amount: number }) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    console.error("[payments/webhook] Falta SUPABASE_SERVICE_ROLE_KEY");
    return false;
  }
  const supabase = createClient(getSupabaseUrl(), serviceKey);

  const { data: orderData } = await supabase
    .from("orders")
    .select("customer_id, debt_payment_amount, items, total, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!orderData) {
    console.error("[payments/webhook] pedido inexistente", orderId);
    return false;
  }
  if (String(orderData.status).toLowerCase() === "paid") return true; // reintento de MP: ya procesado

  const expected = Number(orderData.total) || 0;
  if (payment.amount + 0.01 < expected) {
    console.error(`[payments/webhook] monto acreditado (${payment.amount}) menor al total del pedido (${expected}); no se marca pagado`, orderId);
    return false;
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_method: "MERCADO_PAGO",
      payment_notes: `Pagado vía Mercado Pago (pago ${payment.id})`,
    })
    .eq("id", orderId);

  if (error) {
    console.error("[payments/webhook] update", error);
    return false;
  }

  // --- LÓGICA DE DESCUENTO DE STOCK ---
  try {
    const items = Array.isArray(orderData?.items) ? orderData.items : [];
    for (const item of items as any[]) {
      const productName = item.name;
      const quantity = Number(item.quantity || 1);

      const { data: prod } = await supabase
        .from("products")
        .select("raw_product_id")
        .eq("name", productName)
        .maybeSingle();

      if (prod?.raw_product_id) {
        const { data: rawProd } = await supabase
          .from("raw_products")
          .select("current_stock")
          .eq("id", prod.raw_product_id)
          .single();

        if (rawProd) {
          const newStock = Number(rawProd.current_stock ?? 0) - quantity;
          await supabase
            .from("raw_products")
            .update({ current_stock: newStock })
            .eq("id", prod.raw_product_id);
        }
      }
    }
  } catch (err) {
    console.error("[Webhook] Error al descontar stock:", err);
  }

  // La parte del pedido que paga deuda de cuenta corriente queda como movimiento del cliente.
  // (La caja ya cuenta el total completo en este mismo pedido, por eso sin asiento adicional.)
  const debtAmount = Number(orderData?.debt_payment_amount ?? 0);
  const customerId = orderData?.customer_id as string | null;
  if (debtAmount > 0 && customerId) {
    const result = await applyDebtPayment(supabase, customerId, debtAmount, {
      method: "MERCADO_PAGO",
      reference: `MP:${payment.id}:pedido`,
      cashEntry: false,
    });
    if (result.status === "error") console.error("[payments/webhook] deuda del pedido", result.message);
  }

  await supabase.rpc("release_table_for_paid_order", { p_order_id: orderId }).then(({ data, error: rpcErr }) => {
    if (rpcErr) console.error("[payments/webhook] release_table_for_paid_order error:", rpcErr.message);
    else console.log("[payments/webhook] release_table result:", JSON.stringify(data));
  });

  return true;
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = getMercadoPagoAccessToken();
    if (!accessToken) {
      console.error("[payments/webhook] sin MERCADOPAGO_ACCESS_TOKEN");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const url = new URL(request.url);
    const raw = await request.text();
    const { topic, resourceId } = parseNotificationPayload(raw, url);
    if (!resourceId) return NextResponse.json({ ok: true }, { status: 200 });

    const mpConfig = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
    const paymentApi = new Payment(mpConfig);
    const toApproved = (p: any): ApprovedPayment | null =>
      p?.status === "approved"
        ? { id: String(p.id), amount: Number(p.transaction_amount) || 0, currency: p.currency_id ?? null, externalRef: p.external_reference ?? null }
        : null;

    // Siempre se consulta a Mercado Pago: nunca se confía en el cuerpo de la notificación.
    const approved: ApprovedPayment[] = [];
    let merchantOrderRef: string | undefined;
    let merchantOrderPaid = 0;

    if (topic === "merchant_order" || topic === "topic_merchant_order_wh") {
      const mo = await new MerchantOrder(mpConfig).get({ merchantOrderId: resourceId });
      merchantOrderRef = mo.external_reference ?? undefined;
      for (const pay of mo.payments ?? []) {
        if (pay.status !== "approved" || !pay.id) continue;
        const full = toApproved(await paymentApi.get({ id: String(pay.id) }));
        if (full) {
          approved.push(full);
          merchantOrderPaid += full.amount;
        }
      }
    } else {
      try {
        const one = toApproved(await paymentApi.get({ id: resourceId }));
        if (one) approved.push(one);
      } catch {
        /* id que no es un pago */
      }
    }

    for (const p of approved) {
      const ref = p.externalRef ?? merchantOrderRef ?? "";
      if (/^[0-9a-f-]{36}$/i.test(ref)) {
        // Para merchant_order se acumula lo acreditado entre todos los pagos aprobados de la orden.
        await markOrderPaid(ref, { id: p.id, amount: topic.includes("merchant_order") ? merchantOrderPaid : p.amount });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[payments/webhook]", e);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
