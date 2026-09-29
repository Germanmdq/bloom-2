import { NextResponse } from "next/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const TERMINAL_STATUSES = new Set([
  "entregado",
  "cancelado",
  "delivered",
  "cancelled",
  "completed",
]);

function isActiveOrderStatus(status: string | null | undefined): boolean {
  if (status == null || String(status).trim() === "") return true;
  return !TERMINAL_STATUSES.has(String(status).trim().toLowerCase());
}

/** Resumen para la home del dashboard (solo admin). */
export async function GET() {
  try {
    const adminUser = await requireDashboardAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const svc = createServiceRoleClient();

    const { count: registeredCustomerCount, error: cErr } = await svc
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_customer", true);
    if (cErr) {
      console.error("[dashboard/stats] profiles count", cErr);
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }

    const { data: orders, error: oErr } = await svc
      .from("orders")
      .select("customer_id, status")
      .not("customer_id", "is", null);
    if (oErr) {
      console.error("[dashboard/stats] orders", oErr);
      return NextResponse.json({ error: oErr.message }, { status: 500 });
    }

    const activeCustomerIds = new Set<string>();
    for (const row of orders ?? []) {
      const cid = row.customer_id as string | null;
      if (!cid || !isActiveOrderStatus(row.status as string | null)) continue;
      activeCustomerIds.add(cid);
    }

    return NextResponse.json({
      registeredCustomerCount: registeredCustomerCount ?? 0,
      customersWithActiveOrdersCount: activeCustomerIds.size,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json({ error: "Falta configuración del servidor" }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
