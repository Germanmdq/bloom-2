import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, MerchantOrder, Payment } from "mercadopago";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago-access-token";
import { getSupabaseUrl } from "@/lib/supabase/env";

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

async function markOrderPaid(orderId: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    console.error("[payments/webhook] Falta SUPABASE_SERVICE_ROLE_KEY");
    return false;
  }
  const supabase = createClient(getSupabaseUrl(), serviceKey);

  // Leer el pedido para ver si tiene productos vinculados a stock e insumos
  const { data: orderData } = await supabase
    .from("orders")
    .select("customer_id, debt_payment_amount, items")
    .eq("id", orderId)
    .maybeSingle();

  const { error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_method: "MERCADO_PAGO",
      payment_notes: "Pagado vía Mercado Pago",
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

      // Buscamos el producto en la DB para ver si tiene un insumo vinculado
      const { data: prod } = await supabase
        .from("products")
        .select("raw_product_id")
        .eq("name", productName)
        .maybeSingle();

      if (prod?.raw_product_id) {
        // Descontamos del stock del insumo (raw_product)
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
          
          console.log(`[Webhook] Stock descontado: ${productName} -> Insumo ID: ${prod.raw_product_id}. Nuevo stock: ${newStock}`);
        }
      }
    }
  } catch (err) {
    console.error("[Webhook] Error al descontar stock:", err);
  }
  // -------------------------------------

  // Reducir saldo de cuenta corriente si corresponde
  const debtAmount = Number(orderData?.debt_payment_amount ?? 0);
  const customerId = orderData?.customer_id as string | null;
  if (debtAmount > 0 && customerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", customerId)
      .single();
    if (profile) {
      const currentBalance = Number(profile.balance ?? 0);
      const newBalance = Math.max(0, currentBalance - debtAmount);
      const { error: balErr } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", customerId);
      if (balErr) console.error("[payments/webhook] balance update", balErr);
    }
  }

  // Intentar liberar la mesa de forma segura (solo si no fue re-ocupada)
  await supabase.rpc('release_table_for_paid_order', { p_order_id: orderId })
    .then(({ data, error: rpcErr }) => {
      if (rpcErr) console.error("[payments/webhook] release_table_for_paid_order error:", rpcErr.message);
      else console.log("[payments/webhook] release_table result:", JSON.stringify(data));
    });

  return true;
}

export async function GET(request: NextRequest) {
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

    if (!resourceId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const mpConfig = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });

    let debtMetadata: { type?: string; customer_id?: string; amount?: number | string } | null = null;
    let externalRef: string | undefined;
    let approved = false;

    if (topic === "payment" || topic === "payment.updated" || topic === "payment.created") {
      const paymentApi = new Payment(mpConfig);
      const p = await paymentApi.get({ id: resourceId });
      approved = p.status === "approved";
      externalRef = p.external_reference ?? undefined;
      debtMetadata = p.metadata;
    } else if (topic === "merchant_order" || topic === "topic_merchant_order_wh") {
      const moApi = new MerchantOrder(mpConfig);
      const mo = await moApi.get({ merchantOrderId: resourceId });
      externalRef = mo.external_reference ?? undefined;
      approved =
        mo.order_status === "paid" ||
        Boolean(mo.payments?.some((pay) => pay.status === "approved"));
      
      // Si es una orden comercial, buscamos el pago aprobado para sacar la metadata
      const approvedPayment = mo.payments?.find(p => p.status === "approved");
      if (approvedPayment?.id) {
        try {
          const paymentApi = new Payment(mpConfig);
          const p = await paymentApi.get({ id: String(approvedPayment.id) });
          debtMetadata = p.metadata;
        } catch (e) {
          console.error("[Webhook] No se pudo obtener metadata del pago de la orden", e);
        }
      }
    } else {
      // Fallback intentando tratar el id como pago
      try {
        const paymentApi = new Payment(mpConfig);
        const p = await paymentApi.get({ id: resourceId });
        approved = p.status === "approved";
        externalRef = p.external_reference ?? undefined;
        debtMetadata = p.metadata;
      } catch {
        try {
          const moApi = new MerchantOrder(mpConfig);
          const mo = await moApi.get({ merchantOrderId: resourceId });
          externalRef = mo.external_reference ?? undefined;
          approved =
            mo.order_status === "paid" ||
            Boolean(mo.payments?.some((pay) => pay.status === "approved"));
        } catch { /* ignore */ }
      }
    }

    if (approved) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      const supabaseAdmin = createClient(getSupabaseUrl(), serviceKey || "");

      // Prioridad 1: Tenemos metadata explícita de DEBT_PAYMENT
      if (debtMetadata?.type === "DEBT_PAYMENT" && debtMetadata.customer_id && debtMetadata.amount) {
        const cid = debtMetadata.customer_id;
        const amt = Number(debtMetadata.amount);
        
        console.log(`[Webhook] DEBT_PAYMENT detectado -> Cliente: ${cid}, Monto: ${amt}`);
        
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("balance")
          .eq("id", cid)
          .single();

        if (profile) {
          const currentBalance = Number(profile.balance ?? 0);
          const newBalance = Math.max(0, currentBalance - amt);
          await supabaseAdmin
            .from("profiles")
            .update({ balance: newBalance })
            .eq("id", cid);
          console.log(`[Webhook] Balance actualizado de ${currentBalance} a ${newBalance}`);
        }
      } 
      // Prioridad 2: Es una orden normal (puede tener deuda incluida)
      else if (externalRef && (/^[0-9a-f-]{36}$/i.test(externalRef) || externalRef.startsWith("DEBT_"))) {
        console.log(`[Webhook] Procesando pedido normal/deuda con ref: ${externalRef}`);
        await markOrderPaid(externalRef);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[payments/webhook]", e);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
