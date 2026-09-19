import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago-access-token";
import { getSupabaseUrl } from "@/lib/supabase/env";

const NOTIFICATION_URL = "https://www.bloommdp.com/api/payments/webhook";
const PRODUCTION_SITE = "https://www.bloommdp.com";

type CreatePreferenceBody = {
  items?: Array<{ title: string; quantity: number; unit_price: number }>;
  customer?: { name?: string; phone?: string };
  order_id: string;
  /** Monto de deuda CC incluido en el pago. */
  debt_payment_amount?: number;
};

type OrderRow = {
  id: string;
  total: number | string;
  items: unknown;
  status: string | null;
  paid: boolean;
  customer_name: string | null;
  customer_phone: string | null;
};

function normalizePhoneForPayer(phone: string): { area_code?: string; number?: string } | undefined {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length >= 10) {
    return { area_code: digits.slice(0, 2), number: digits.slice(2) };
  }
  return { number: digits };
}

export async function POST(req: Request) {
  try {
    const accessToken = getMercadoPagoAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Falta MERCADOPAGO_ACCESS_TOKEN en el servidor" }, { status: 500 });
    }

    const body = (await req.json()) as any;
    const orderId = body.order_id?.trim();
    const isDebtOnly = body.metadata?.type === 'DEBT_PAYMENT';

    if (!orderId && !isDebtOnly) {
      return NextResponse.json({ error: "order_id requerido" }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceKey) {
      return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY para validar el pago" }, { status: 500 });
    }

    const supabase = createClient(getSupabaseUrl(), serviceKey);

    let mpItems: any[] = [];
    let payerName = "Cliente";
    let payerPhoneRaw = "";
    let externalReference = orderId || `DEBT_${body.metadata?.customer_id}_${Date.now()}`;

    if (isDebtOnly) {
      // Flujo de pago de deuda solamente
      payerName = body.customer?.name || "Cliente Bloom";
      mpItems = (body.items || []).map((it: any, idx: number) => ({
        id: it.id || `debt_${idx}`,
        title: it.name || it.title || "Pago de Saldo",
        quantity: it.quantity || 1,
        unit_price: Number(it.unit_price || it.price),
        currency_id: "ARS"
      }));
    } else {
      // Flujo de pedido (Order)
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("id,total,items,status,paid,customer_name,customer_phone")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        console.error("[payments/create-preference] order", orderErr);
        return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
      }

      const row = order as OrderRow;
      if (row.paid) {
        return NextResponse.json({ error: "Este pedido ya está pagado" }, { status: 400 });
      }
      if (row.status !== "pending_payment") {
        return NextResponse.json({ error: "El pedido no está pendiente de pago online" }, { status: 400 });
      }

      const rawItems = Array.isArray(row.items) ? row.items : [];
      type Line = { name?: string; price?: number; quantity?: number };
      const lines = rawItems as Line[];
      if (!lines.length) {
        return NextResponse.json({ error: "El pedido no tiene ítems" }, { status: 400 });
      }

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        const title = String(line.name ?? "Producto").slice(0, 256);
        const quantity = Math.max(1, Number(line.quantity) || 1);
        const unit_price = Number(line.price);
        if (!Number.isFinite(unit_price) || unit_price < 0) {
          return NextResponse.json({ error: "Precio inválido en el pedido" }, { status: 400 });
        }
        mpItems.push({
          id: String(idx + 1),
          title,
          quantity,
          unit_price,
          currency_id: "ARS",
        });
      }

      const debtAmount = Number(body.debt_payment_amount ?? 0);
      if (debtAmount > 0) {
        mpItems.push({
          id: String(mpItems.length + 1),
          title: "Pago Cuenta Corriente",
          quantity: 1,
          unit_price: debtAmount,
          currency_id: "ARS",
        });
      }

      payerName = (body.customer?.name ?? row.customer_name ?? "Cliente").trim() || "Cliente";
      payerPhoneRaw = (body.customer?.phone ?? row.customer_phone ?? "").trim();
    }

    const phoneObj = payerPhoneRaw ? normalizePhoneForPayer(payerPhoneRaw) : undefined;
    const baseUrl = (process.env.NEXT_PUBLIC_URL ?? PRODUCTION_SITE).replace(/\/$/, "");

    const mpConfig = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
    const preference = new Preference(mpConfig);

    const result = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: payerName,
          ...(phoneObj ? { phone: phoneObj } : {}),
        },
        back_urls: {
          success: isDebtOnly ? `${baseUrl}/cuenta` : `${baseUrl}/menu?payment=success`,
          failure: isDebtOnly ? `${baseUrl}/cuenta` : `${baseUrl}/menu?payment=failure`,
          pending: isDebtOnly ? `${baseUrl}/cuenta` : `${baseUrl}/menu?payment=pending`,
        },
        auto_return: "approved",
        external_reference: externalReference,
        notification_url: NOTIFICATION_URL,
        statement_descriptor: "BLOOM CAFE",
        metadata: body.metadata,
      },
    });

    const initPoint = result.init_point ?? result.sandbox_init_point;
    if (!initPoint) {
      console.error("[payments/create-preference] sin init_point", result);
      return NextResponse.json({ error: "Mercado Pago no devolvió URL de pago" }, { status: 502 });
    }

    return NextResponse.json({ init_point: initPoint, preference_id: result.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    console.error("[payments/create-preference]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
