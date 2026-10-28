import type { SupabaseClient } from "@supabase/supabase-js";
import type { Draft, PricedLine } from "./core";

/**
 * Crea el pedido del agente igual que el pedido web normal (/api/orders): fila en `orders` (estado pending,
 * impago, pago al retirar/recibir) + comanda en `kitchen_tickets` para que aparezca en cocina.
 * Los precios son los de la base (ya calculados por el servidor en `lines`), nunca los del modelo.
 */
export async function createAgentOrder(
  db: SupabaseClient,
  args: { draft: Draft; lines: PricedLine[]; total: number; customerId: string | null },
): Promise<{ orderId: string | null }> {
  const { draft, lines, total, customerId } = args;
  const isDelivery = draft.orderType === "delivery";
  const name = draft.name ?? "Cliente Web";

  // Descuento de stock de productos con control de stock (misma regla que /api/orders).
  const ids = lines.map((l) => l.id);
  const { data: prods } = await db.from("products").select("id, stock, track_stock, vendidos, total_vendidos").in("id", ids);
  for (const l of lines) {
    const p: any = (prods ?? []).find((x: any) => x.id === l.id);
    if (p?.track_stock) {
      await db
        .from("products")
        .update({
          stock: (Number(p.stock) || 0) - l.quantity,
          vendidos: (Number(p.vendidos) || 0) + l.quantity,
          total_vendidos: (Number(p.total_vendidos) || 0) + l.quantity,
        })
        .eq("id", p.id);
    }
  }

  const items = lines.map((l) => ({
    id: l.id,
    product_id: l.id,
    name: l.name,
    price: l.unitPrice,
    quantity: l.quantity,
    ...(l.notes ? { observations: l.notes } : {}),
  }));

  const { data: order, error } = await db
    .from("orders")
    .insert([
      {
        customer_id: customerId,
        customer_name: name,
        customer_phone: draft.phone,
        order_type: isDelivery ? "DELIVERY" : "TAKEAWAY",
        delivery_type: isDelivery ? "delivery" : "retiro",
        delivery_info: isDelivery ? draft.address : null,
        table_id: null,
        items,
        total,
        status: "pending",
        paid: false,
        stock_applied: true,
        stock_deducted: true,
        payment_method: "PENDING",
        payment_notes: "Pedido tomado por el asistente de voz",
        created_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();
  if (error || !order) throw new Error(error?.message ?? "No se pudo crear el pedido");

  const kitchenNotes = [
    name,
    isDelivery ? `DELIVERY: ${draft.address}` : "RETIRO EN LOCAL",
    draft.phone ? `Tel: ${draft.phone}` : null,
    "Pedido por voz",
  ]
    .filter(Boolean)
    .join(" | ");
  const { error: kitchenError } = await db.from("kitchen_tickets").insert([
    {
      table_id: 0,
      items: lines.map((l) => ({ name: l.name, quantity: l.quantity, price: l.unitPrice, ...(l.notes ? { notes: l.notes } : {}) })),
      status: "PENDING",
      notes: kitchenNotes,
      created_at: new Date().toISOString(),
    },
  ]);
  // El pedido ya existe y es visible en el panel; si falla solo la comanda se avisa (no se pierde el pedido).
  if (kitchenError) console.error("[agent/order] kitchen_tickets", kitchenError.message);

  return { orderId: order.id as string };
}
