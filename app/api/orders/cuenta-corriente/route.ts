import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";

export const dynamic = "force-dynamic";

const COFFEE_WORDS = ["café", "cafe", "capuccino", "submarino", "chocolatada", "lágrima", "lagrima"];

const coffeeCount = (items: any[]) =>
  items.reduce((acc, item) => {
    const n = String(item?.name ?? "").toLowerCase();
    return COFFEE_WORDS.some((w) => n.includes(w)) ? acc + (Number(item?.quantity) || 0) : acc;
  }, 0);

/**
 * Cobro a cuenta corriente desde el panel, en el servidor:
 * 1. Verifica que el cliente exista (se exige el id, nunca se busca por nombre).
 * 2. Crea la venta (cuenta_corriente, impaga, con el cliente) y libera la mesa.
 * 3. Suma el total al saldo del cliente.
 * El panel solo se cierra si esto responde ok; si algo falla, devuelve el error.
 */
export async function POST(req: Request) {
  const staff = await requireDashboardAdmin();
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const tableId = Number(body?.tableId);
  const isWebTable = body?.isWebTable === true;
  const customerId = String(body?.customerId ?? "").trim();
  const total = Number(body?.total);
  const discount = Number(body?.discount) || 0;
  const items = Array.isArray(body?.items) ? body.items : [];
  const waiterId = body?.waiterId ? String(body.waiterId) : null;
  const deliveryPersonId = body?.deliveryPersonId ? parseInt(String(body.deliveryPersonId), 10) || null : null;
  const webOrderId = body?.webOrderId ? String(body.webOrderId) : null;

  if (!customerId) return NextResponse.json({ error: "Elegí un cliente de la lista para cargar la cuenta corriente." }, { status: 400 });
  if (!Number.isFinite(total) || total <= 0) return NextResponse.json({ error: "El total tiene que ser mayor a cero." }, { status: 400 });
  if (!Number.isFinite(tableId)) return NextResponse.json({ error: "Falta la mesa." }, { status: 400 });

  const db = await createClient();

  const { data: customer, error: customerErr } = await db
    .from("profiles")
    .select("id, full_name")
    .eq("id", customerId)
    .maybeSingle();
  if (customerErr) {
    console.error("[cuenta-corriente] cliente", customerErr.message);
    return NextResponse.json({ error: "No se pudo leer el cliente. Probá de nuevo." }, { status: 500 });
  }
  if (!customer) return NextResponse.json({ error: "El cliente elegido no existe." }, { status: 404 });

  const customerName = customer.full_name || null;

  // ── 1. Venta + liberar mesa ──
  let orderId: string | null = null;
  if (!isWebTable) {
    const { data: rpc, error: rpcErr } = await db.rpc("close_table_and_create_order", {
      p_table_id: tableId,
      p_total: total,
      p_payment_method: "CASH", // "CUENTA_CORRIENTE" no está en el enum; la marca va en cuenta_corriente
      p_status: "pending",
      p_paid: false,
      p_waiter_id: waiterId,
      p_customer_id: customerId,
      p_customer_name: customerName,
      p_discount: discount,
      p_items: items,
      p_delivery_person_id: deliveryPersonId,
    });
    if (rpcErr || !rpc?.order_id) {
      console.error("[cuenta-corriente] close_table_and_create_order", rpcErr?.message);
      return NextResponse.json({ error: "No se pudo registrar la venta. La mesa sigue abierta." }, { status: 500 });
    }
    orderId = String(rpc.order_id);
  } else {
    const { data: order, error: insErr } = await db
      .from("orders")
      .insert({
        table_id: tableId,
        total,
        payment_method: "CASH",
        waiter_id: waiterId,
        customer_id: customerId,
        customer_name: customerName,
        status: "pending",
        paid: false,
        cuenta_corriente: true,
        items,
        discount,
        delivery_person_id: deliveryPersonId,
      })
      .select("id")
      .single();
    if (insErr || !order) {
      console.error("[cuenta-corriente] insert", insErr?.message);
      return NextResponse.json({ error: "No se pudo registrar la venta. La mesa sigue abierta." }, { status: 500 });
    }
    orderId = String(order.id);
    await db.from("salon_tables").update({ status: "FREE", total: 0, items: [] }).eq("id", tableId);
    if (webOrderId) await db.from("orders").update({ status: "completed" }).eq("id", webOrderId);
  }

  // ── 2. Marca de cuenta corriente (la RPC no la recibe) ──
  const { error: flagErr } = await db.from("orders").update({ cuenta_corriente: true }).eq("id", orderId);
  if (flagErr) {
    console.error("[cuenta-corriente] flag", flagErr.message);
    return NextResponse.json(
      { error: "La venta quedó guardada pero sin marcar como cuenta corriente. Avisá al administrador.", orderId },
      { status: 500 },
    );
  }

  // ── 3. Saldo y sellos de café. Escritura condicionada al valor leído para no pisar otro cobro simultáneo. ──
  const cafes = coffeeCount(items);
  let balanceOk = false;
  let newBalance = 0;
  for (let attempt = 0; attempt < 5 && !balanceOk; attempt++) {
    const { data: prof, error: readErr } = await db
      .from("profiles")
      .select("balance, coffee_stamps")
      .eq("id", customerId)
      .single();
    if (readErr || !prof) break;
    const current = Number(prof.balance) || 0;
    const stamps = (Number(prof.coffee_stamps) || 0) + cafes;
    newBalance = current + total;
    let query = db
      .from("profiles")
      .update({ balance: newBalance, coffee_stamps: stamps >= 10 ? stamps - 10 : stamps })
      .eq("id", customerId);
    query = prof.balance === null ? query.is("balance", null) : query.eq("balance", prof.balance);
    const { data: updated, error: updErr } = await query.select("id");
    if (updErr) {
      console.error("[cuenta-corriente] saldo", updErr.message);
      break;
    }
    balanceOk = (updated?.length ?? 0) > 0;
  }

  if (!balanceOk) {
    return NextResponse.json(
      {
        error: `La venta quedó cargada a ${customerName ?? "el cliente"}, pero no se pudo sumar al saldo. Revisalo en Clientes.`,
        orderId,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, orderId, customerName, balance: newBalance });
}
