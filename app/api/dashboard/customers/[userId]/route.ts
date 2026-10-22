import { NextResponse } from "next/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";
import { createClient } from "@/lib/supabase/server";
import type { CustomerOrderRow } from "@/lib/types/dashboard-customers";

/** Pedidos de un cliente (solo admin). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const adminUser = await requireDashboardAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { userId } = await context.params;
    const customerId = userId?.trim();
    if (!customerId) {
      return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    }

    const svc = await createClient();

    const { data: profile, error: pErr } = await svc
      .from("profiles")
      .select("id, full_name, phone, default_address, is_customer")
      .eq("id", customerId)
      .maybeSingle();
    if (pErr || !profile?.is_customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const displayName = String(profile.full_name ?? "").trim() || "—";

    const { data: orders, error: oErr } = await svc
      .from("orders")
      .select(
        "id, created_at, status, total, paid, cuenta_corriente, customer_name, order_type, delivery_type"
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (oErr) {
      console.error("[dashboard/customers/userId] orders", oErr);
      return NextResponse.json({ error: oErr.message }, { status: 500 });
    }

    return NextResponse.json({
      customer: {
        id: customerId,
        displayName,
        email: "—",
        phone: String(profile.phone ?? "").trim() || "—",
        defaultAddress: String(profile.default_address ?? "").trim() || "—",
      },
      orders: (orders ?? []) as CustomerOrderRow[],
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
