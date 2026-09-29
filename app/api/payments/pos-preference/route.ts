import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago-access-token";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { buildMpLineItems, mpItemsTotal, sumCartSubtotal, type CartLineForMp } from "@/lib/payments/build-mp-line-items";

const NOTIFICATION_URL = "https://www.bloommdp.com/api/payments/webhook";
const PRODUCTION_SITE = "https://www.bloommdp.com";

type Body = {
  table_id: number;
  items: CartLineForMp[];
  subtotal: number;
  final_total: number;
  waiter_id?: string | null;
};

export async function POST(req: Request) {
  try {
    const supabaseSession = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabaseSession.auth.getUser();
    if (userErr || !user?.email || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const accessToken = getMercadoPagoAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Falta MERCADOPAGO_ACCESS_TOKEN en el servidor" }, { status: 500 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceKey) {
      return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const body = (await req.json()) as Body;
    const tableId = Number(body.table_id);
    if (!Number.isFinite(tableId) || tableId <= 0) {
      return NextResponse.json({ error: "table_id inválido" }, { status: 400 });
    }

    const lines = Array.isArray(body.items) ? body.items : [];
    if (!lines.length) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }

    const subtotal = sumCartSubtotal(lines);
    const clientSub = Number(body.subtotal);
    if (!Number.isFinite(clientSub) || Math.abs(clientSub - subtotal) > 0.05) {
      return NextResponse.json({ error: "Subtotal inconsistente" }, { status: 400 });
    }

    const finalTotal = Math.round(Number(body.final_total) * 100) / 100;
    if (!Number.isFinite(finalTotal) || finalTotal <= 0) {
      return NextResponse.json({ error: "Total inválido" }, { status: 400 });
    }

    const mpItems = buildMpLineItems(lines, subtotal, finalTotal);
    const sumMp = mpItemsTotal(mpItems);
    if (Math.abs(sumMp - finalTotal) > 0.05) {
      return NextResponse.json({ error: "No se pudo armar el total para Mercado Pago" }, { status: 500 });
    }

    const itemsJson = lines.map((i) => {
      const base = {
        name: String(i.name ?? "Producto").slice(0, 256),
        price: Number(i.price),
        quantity: Math.max(1, Number(i.quantity) || 1),
      };
      const pid = i.id?.trim();
      return pid ? { ...base, product_id: pid } : base;
    });

    const svc = createServiceClient(getSupabaseUrl(), serviceKey);
    const insertRow: Record<string, unknown> = {
      table_id: tableId,
      items: itemsJson,
      total: finalTotal,
      status: "pending_payment",
      order_type: "pos",
      paid: false,
      payment_method: "MERCADO_PAGO",
      payment_notes: "Mercado Pago QR (POS, pendiente de pago)",
      customer_name: `Mesa / POS ${tableId}`,
    };
    const wid = body.waiter_id?.trim();
    if (wid) insertRow.waiter_id = wid;

    const { data: inserted, error: insErr } = await svc.from("orders").insert(insertRow).select("id").maybeSingle();

    if (insErr || !inserted?.id) {
      console.error("[pos-preference] insert", insErr);
      return NextResponse.json({ error: insErr?.message ?? "No se pudo crear el pedido" }, { status: 500 });
    }

    const orderId = String(inserted.id);

    const baseUrl = (process.env.NEXT_PUBLIC_URL ?? PRODUCTION_SITE).replace(/\/$/, "");
    const mpConfig = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
    const preference = new Preference(mpConfig);

    const result = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: "Cliente POS",
        },
        back_urls: {
          success: `${baseUrl}/menu?payment=success`,
          failure: `${baseUrl}/menu?payment=failure`,
          pending: `${baseUrl}/menu?payment=pending`,
        },
        auto_return: "approved",
        external_reference: orderId,
        notification_url: NOTIFICATION_URL,
        statement_descriptor: "BLOOM CAFE",
      },
    });

    const initPoint = result.init_point ?? result.sandbox_init_point;
    if (!initPoint) {
      console.error("[pos-preference] sin init_point", result);
      await svc.from("orders").delete().eq("id", orderId);
      return NextResponse.json({ error: "Mercado Pago no devolvió URL de pago" }, { status: 502 });
    }

    return NextResponse.json({
      init_point: initPoint,
      preference_id: result.id,
      order_id: orderId,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    console.error("[pos-preference]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
