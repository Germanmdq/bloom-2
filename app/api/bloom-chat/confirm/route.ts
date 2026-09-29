import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { WEB_ORDER_TABLE_DELIVERY, WEB_ORDER_TABLE_RETIRO } from "@/lib/orders/web-virtual-tables";

type ConfirmBody = {
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    observations?: string;
    variants?: { name: string }[];
  }>;
  customer_name: string;
  customer_phone: string;
  /** Retiro en local vs delivery (dashboard) */
  delivery_type: "local" | "delivery";
  delivery_address?: string;
  /** Cliente confirmó la dirección tal como está (delivery) */
  address_confirmed?: boolean;
  /** Web encargo: contra entrega → CASH; transferencia → BANK_TRANSFER; MP → MERCADO_PAGO + pending_payment */
  payment_method?: "cash_on_delivery" | "bank_transfer" | "mercadopago";
  /** Monto de deuda de cuenta corriente incluido en el pago MP. */
  debt_payment_amount?: number;
  access_token?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ConfirmBody;
    const { items, customer_name, customer_phone } = body;

    if (!items?.length || !customer_name?.trim()) {
      return NextResponse.json({ error: "Faltan datos del pedido o del cliente" }, { status: 400 });
    }

    const phone = (customer_phone ?? "").trim();
    if (!phone) {
      return NextResponse.json({ error: "Necesitamos un teléfono de contacto" }, { status: 400 });
    }

    const deliveryType: "local" | "delivery" =
      body.delivery_type === "delivery" ? "delivery" : "local";

    let deliveryAddress = "";
    if (deliveryType === "delivery") {
      deliveryAddress = (body.delivery_address ?? "").trim();
      if (!deliveryAddress) {
        return NextResponse.json({ error: "Ingresá la dirección de entrega" }, { status: 400 });
      }
    }

    let customerId: string | null = null;
    if (body.access_token?.trim()) {
      const authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        global: { headers: { Authorization: `Bearer ${body.access_token.trim()}` } },
      });
      const {
        data: { user },
        error: userErr,
      } = await authClient.auth.getUser();
      if (!userErr && user?.id) {
        customerId = user.id;
      }
    }

    const total = items.reduce((acc, i) => acc + Number(i.price) * Number(i.quantity), 0);
    const debtPayment = Number(body.debt_payment_amount ?? 0);
    const orderTotal = debtPayment > 0 ? total + debtPayment : total;
    const itemsJson = items.map((i) => ({
      product_id: i.product_id,
      name: i.name,
      price: Number(i.price),
      quantity: Number(i.quantity),
      ...(i.observations?.trim() ? { observations: i.observations.trim() } : {}),
      ...(i.variants?.length ? { variants: i.variants } : {}),
    }));

    const url = getSupabaseUrl();
    const anon = getSupabaseAnonKey();

    const pay: "cash_on_delivery" | "bank_transfer" | "mercadopago" =
      body.payment_method === "bank_transfer"
        ? "bank_transfer"
        : body.payment_method === "mercadopago"
          ? "mercadopago"
          : "cash_on_delivery";

    /** DB enum suele ser CASH | CARD | MERCADO_PAGO (+ BANK_TRANSFER si corriste la migración). Usamos CASH + notas para transferencia para no fallar si el enum aún no tiene BANK_TRANSFER. */
    const paymentMethodDb: "CASH" | "MERCADO_PAGO" = pay === "mercadopago" ? "MERCADO_PAGO" : "CASH";
    const paymentNotes =
      pay === "bank_transfer"
        ? "Transferencia bancaria (pedido web)"
        : pay === "mercadopago"
          ? "Mercado Pago (pendiente de pago)"
          : null;
    const orderStatus = pay === "mercadopago" ? "pending_payment" : "pending";

    let deliveryInfo: string;
    if (deliveryType === "delivery") {
      const confirmed = body.address_confirmed === true;
      deliveryInfo = [
        deliveryAddress,
        confirmed ? "Dirección confirmada por el cliente." : "Cliente indicó que revisa o corrige la dirección.",
      ].join("\n");
    } else {
      deliveryInfo = "Retiro en local";
    }

    const insertRow: Record<string, unknown> = {
      table_id: deliveryType === "delivery" ? WEB_ORDER_TABLE_DELIVERY : WEB_ORDER_TABLE_RETIRO,
      customer_name: customer_name.trim(),
      customer_phone: phone,
      delivery_type: deliveryType,
      delivery_info: deliveryInfo,
      items: itemsJson,
      total: orderTotal,
      status: orderStatus,
      order_type: "web",
      paid: false,
      payment_method: paymentMethodDb,
      ...(paymentNotes ? { payment_notes: paymentNotes } : {}),
      ...(debtPayment > 0 ? { debt_payment_amount: debtPayment } : {}),
    };

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const db =
      serviceKey
        ? createClient(url, serviceKey)
        : customerId && body.access_token?.trim()
          ? createClient(url, anon, {
              global: { headers: { Authorization: `Bearer ${body.access_token.trim()}` } },
            })
          : createClient(url, anon);

    if (customerId) {
      insertRow.customer_id = customerId;
    }

    let { data: inserted, error } = await db.from("orders").insert(insertRow).select("id").maybeSingle();

    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("payment_notes") || msg.includes("debt_payment_amount") || msg.includes("column")) {
        const rest = { ...insertRow };
        delete rest.payment_notes;
        delete rest.debt_payment_amount;
        const second = await db.from("orders").insert(rest).select("id").maybeSingle();
        inserted = second.data;
        error = second.error;
      }
    }

    if (error) {
      console.error("[bloom-chat/confirm]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      ...(inserted?.id ? { order_id: inserted.id as string } : {}),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
