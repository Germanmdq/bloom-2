import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago-access-token";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  amountToPointApiCents,
  getMercadoPagoDeviceId,
  pointCancelCurrentIntent,
  pointCreatePaymentIntent,
  pointGetPaymentIntent,
} from "@/lib/mercadopago-point";
import { sumCartSubtotal, type CartLineForMp } from "@/lib/payments/build-mp-line-items";

type PostBody = {
  table_id: number;
  items: CartLineForMp[];
  subtotal: number;
  final_total: number;
  waiter_id?: string | null;
};

function buildTicketNumber(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return `B${String(n).padStart(6, "0")}`;
}

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

    const deviceId = getMercadoPagoDeviceId();
    if (!deviceId) {
      return NextResponse.json(
        {
          error:
            "Falta MERCADOPAGO_DEVICE_ID. Obtené el id con GET /api/payments/point-devices y agregalo a .env.local / Vercel.",
        },
        { status: 500 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceKey) {
      return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const body = (await req.json()) as PostBody;
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

    const amountCents = amountToPointApiCents(finalTotal);
    const description = `Bloom Café - Mesa ${tableId}`;

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
      payment_method: "MERCADO_PAGO",
      payment_notes: "Mercado Pago Point Smart (pendiente en terminal)",
      customer_name: `Mesa / POS ${tableId}`,
    };
    const wid = body.waiter_id?.trim();
    if (wid) insertRow.waiter_id = wid;

    const { data: inserted, error: insErr } = await svc.from("orders").insert(insertRow).select("id").maybeSingle();

    if (insErr || !inserted?.id) {
      console.error("[point-intent] insert", insErr);
      return NextResponse.json({ error: insErr?.message ?? "No se pudo crear el pedido" }, { status: 500 });
    }

    const orderId = String(inserted.id);

    const mpBodyPrimary = {
      amount: amountCents,
      additional_info: {
        external_reference: orderId,
        print_on_terminal: false,
        ticket_number: buildTicketNumber(),
      },
    };

    let mpResp = await pointCreatePaymentIntent(deviceId, mpBodyPrimary);
    let mpJson = (await mpResp.json().catch(() => ({}))) as { id?: string; message?: string; error?: string; status?: number };
    console.log("[PI] status=" + mpResp.status);
    console.log("[PI] msg=" + (mpJson.message ?? "none"));
    console.log("[PI] err=" + (mpJson.error ?? "none"));
    console.log("[PI] keys=" + Object.keys(mpJson).join(","));

    // Si hay un intent colgado, cancelarlo y reintentar
    const isQueued =
      !mpResp.ok &&
      (String(mpJson.message ?? "").toLowerCase().includes("queued") ||
        String(mpJson.error ?? "").toLowerCase().includes("queued"));

    if (isQueued) {
      console.warn("[PI] queued — cancelando");
      await pointCancelCurrentIntent(deviceId).catch((e) => console.warn("[PI] cancel error:", e));
      await new Promise((r) => setTimeout(r, 3000)); // esperar 3s para que MP libere
      mpResp = await pointCreatePaymentIntent(deviceId, mpBodyPrimary);
      mpJson = (await mpResp.json().catch(() => ({}))) as { id?: string; message?: string; error?: string; status?: number };
      console.log("[PI] retry status=" + mpResp.status + " msg=" + (mpJson.message ?? "none"));
    }


    if (!mpResp.ok) {
      await svc.from("orders").delete().eq("id", orderId);
      return NextResponse.json(
        {
          error: mpJson.message || mpJson.error || "Mercado Pago no aceptó la orden en el terminal",
          details: mpJson,
        },
        { status: 502 }
      );
    }

    if (!mpJson.id) {
      await svc.from("orders").delete().eq("id", orderId);
      return NextResponse.json({ error: "Respuesta sin payment intent id" }, { status: 502 });
    }

    return NextResponse.json({
      payment_intent_id: mpJson.id,
      order_id: orderId,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    console.error("[point-intent] POST", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Consulta estado del intent en Point. Si terminó aprobado, marca `orders.paid`.
 * (MP recomienda webhooks; esto complementa el POS con polling acotado.)
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseSession = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabaseSession.auth.getUser();
    if (userErr || !user?.email || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const paymentIntentId = request.nextUrl.searchParams.get("payment_intent_id")?.trim();
    if (!paymentIntentId) {
      return NextResponse.json({ error: "payment_intent_id requerido" }, { status: 400 });
    }

    const accessToken = getMercadoPagoAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Falta MERCADOPAGO_ACCESS_TOKEN" }, { status: 500 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceKey) {
      return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const mpResp = await pointGetPaymentIntent(paymentIntentId);
    const data = (await mpResp.json().catch(() => ({}))) as {
      state?: string;
      payment?: { id?: number };
      additional_info?: { external_reference?: string };
      message?: string;
    };

    if (!mpResp.ok) {
      return NextResponse.json(
        { error: data.message || "No se pudo consultar el intent", details: data },
        { status: 502 }
      );
    }

    const state = String(data.state ?? "").toUpperCase();
    const orderId = data.additional_info?.external_reference?.trim();

    const terminalFail = ["CANCELED", "CANCELLED", "FAILED", "REJECTED"].includes(state);

    if (terminalFail) {
      return NextResponse.json({
        state: data.state,
        paid: false,
        failed: true,
        order_id: orderId ?? null,
      });
    }

    if (state === "FINISHED" && data.payment?.id != null && orderId && /^[0-9a-f-]{36}$/i.test(orderId)) {
      const mpConfig = new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
      const paymentApi = new Payment(mpConfig);
      const p = await paymentApi.get({ id: String(data.payment.id) });
      const approved = p.status === "approved";
      if (approved) {
        const svc = createServiceRoleClient();
        await svc
          .from("orders")
          .update({
            status: "paid",
            payment_method: "MERCADO_PAGO",
            payment_notes: "Mercado Pago Point Smart (N950)",
          })
          .eq("id", orderId);
        
        // Liberar la mesa de forma segura (solo si no fue re-ocupada)
        await svc.rpc('release_table_for_paid_order', { p_order_id: orderId })
          .then(({ data, error: rpcErr }) => {
            if (rpcErr) console.error("[point-intent] release_table_for_paid_order error:", rpcErr.message);
            else console.log("[point-intent] release_table result:", JSON.stringify(data));
          });

        return NextResponse.json({
          state: data.state,
          paid: true,
          order_id: orderId,
          payment_id: data.payment.id,
        });
      }
      return NextResponse.json({
        state: data.state,
        paid: false,
        failed: true,
        order_id: orderId,
        payment_status: p.status,
      });
    }

    return NextResponse.json({
      state: data.state ?? "UNKNOWN",
      paid: false,
      pending: true,
      order_id: orderId ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    console.error("[point-intent] GET", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
