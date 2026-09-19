import { NextResponse } from "next/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Pedidos en `orders` que aún requieren atención (web y similares). */
function isPendingOrderStatus(status: unknown): boolean {
  const t = String(status ?? "").trim().toLowerCase();
  return t === "pending" || t === "pending_payment";
}

export type PendingQueueOrder = Record<string, unknown>;

export type PendingKitchenTicket = {
  id: string;
  table_id: number;
  items: unknown;
  notes: string | null;
  created_at: string;
};

export type PendingQueueEntry =
  | { kind: "order"; created_at: string; order: PendingQueueOrder }
  | { kind: "kitchen_ticket"; created_at: string; ticket: PendingKitchenTicket };

/**
 * Cola unificada para la home: órdenes `pending` / `pending_payment` + tickets de cocina PENDING en mesas.
 * Orden: created_at ascendente (primero en llegar, primero en la lista).
 */
export async function GET() {
  try {
    const admin = await requireDashboardAdmin();
    if (!admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const svc = createServiceRoleClient();

    const [{ data: allOrders, error: oErr }, { data: tickets, error: tErr }] = await Promise.all([
      svc.from("orders").select("*").order("created_at", { ascending: true }).limit(500),
      svc
        .from("kitchen_tickets")
        .select("id, table_id, items, notes, created_at, status")
        .eq("status", "PENDING")
        .order("created_at", { ascending: true })
        .limit(200),
    ]);

    if (oErr) {
      console.error("[pending-queue] orders", oErr);
      return NextResponse.json({ error: oErr.message }, { status: 500 });
    }
    if (tErr) {
      console.error("[pending-queue] kitchen_tickets", tErr);
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }

    const pendingOrders = (allOrders ?? []).filter((row) => {
      const paid = Boolean((row as { paid?: boolean }).paid);
      if (paid) return false;
      return isPendingOrderStatus(row.status);
    });

    const entries: PendingQueueEntry[] = [];

    for (const order of pendingOrders) {
      const created = String((order as { created_at?: string }).created_at ?? "");
      entries.push({ kind: "order", created_at: created, order: order as PendingQueueOrder });
    }

    for (const t of tickets ?? []) {
      const row = t as PendingKitchenTicket & { table_id: number | string };
      const tid = typeof row.table_id === "string" ? parseInt(row.table_id, 10) : row.table_id;
      entries.push({
        kind: "kitchen_ticket",
        created_at: row.created_at,
        ticket: {
          id: String(row.id),
          table_id: Number.isFinite(tid) ? tid : 0,
          items: row.items,
          notes: row.notes ?? null,
          created_at: row.created_at,
        },
      });
    }

    entries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return NextResponse.json({ entries });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json({ error: "Falta configuración del servidor" }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
