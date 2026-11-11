import { NextResponse } from "next/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";
import { createClient } from "@/lib/supabase/server";
import type { DashboardCustomerRow } from "@/lib/types/dashboard-customers";

/** Lista clientes y pedidos usando la sesión de personal, sin service role. */
export async function GET() {
  try {
    const adminUser = await requireDashboardAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const svc = await createClient();

    const { data: profiles, error: pErr } = await svc
      .from("profiles")
      .select("id, full_name, phone, birthdate, default_address, balance, coffee_stamps, customer_number")
      .eq("is_customer", true);
    if (pErr) {
      console.error("[dashboard/customers] profiles", pErr);
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    const customerIdSet = new Set((profiles ?? []).map((p) => p.id as string));
    if (customerIdSet.size === 0) {
      return NextResponse.json({ customers: [] as DashboardCustomerRow[] });
    }

    const { data: orders, error: oErr } = await svc
      .from("orders")
      .select("customer_id, created_at, paid, cuenta_corriente")
      .not("customer_id", "is", null);
    if (oErr) {
      console.error("[dashboard/customers] orders", oErr);
      return NextResponse.json({ error: oErr.message }, { status: 500 });
    }

    const byCustomer = new Map<
      string,
      { dates: string[]; total: number; paidCount: number }
    >();
    for (const row of orders ?? []) {
      const cid = row.customer_id as string;
      if (!customerIdSet.has(cid)) continue;
      let agg = byCustomer.get(cid);
      if (!agg) {
        agg = { dates: [], total: 0, paidCount: 0 };
        byCustomer.set(cid, agg);
      }
      agg.total += 1;
      const created = row.created_at as string | null;
      if (created) agg.dates.push(created);
      const paid = Boolean(row.paid);
      if (paid) agg.paidCount += 1;
    }

    const profileDataById = new Map<string, { name: string; phone: string; birthdate: string; defaultAddress: string; balance: number; stamps: number; customer_number: string }>();
    for (const pr of profiles ?? []) {
      profileDataById.set(pr.id as string, {
        name: String(pr.full_name ?? "").trim(),
        phone: String(pr.phone ?? "").trim(),
        birthdate: String(pr.birthdate ?? "").trim(),
        defaultAddress: String(pr.default_address ?? "").trim(),
        balance: Number(pr.balance || 0),
        stamps: Number(pr.coffee_stamps || 0),
        customer_number: String(pr.customer_number ?? "")
      });
    }

    const customers: DashboardCustomerRow[] = [];
    for (const id of customerIdSet) {
      const agg = byCustomer.get(id);
      const dates = agg?.dates ?? [];
      const last =
        dates.length > 0
          ? dates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
          : null;
      const paidCount = agg?.paidCount ?? 0;
      const pInfo = profileDataById.get(id);

      customers.push({
        id,
        displayName:
          pInfo?.name ||
          "—",
        email: "—",
        phone: pInfo?.phone || "—",
        birthdate: pInfo?.birthdate || null,
        defaultAddress: pInfo?.defaultAddress || "—",
        orderCount: agg?.total ?? 0,
        lastOrderAt: last,
        customer_number: pInfo?.customer_number ?? "",
        loyaltyPoints: pInfo?.stamps ?? 0,
        balance: pInfo?.balance ?? 0,
        isSocio: paidCount >= 1,
      });
    }

    customers.sort((a, b) => {
      const ta = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
      const tb = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json({ customers });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
