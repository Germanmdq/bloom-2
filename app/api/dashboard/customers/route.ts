import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { DashboardCustomerRow } from "@/lib/types/dashboard-customers";

function metaString(u: User, key: string): string {
  const v = u.user_metadata?.[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Lista clientes (auth + pedidos); solo admin + service role. */
export async function GET() {
  try {
    const adminUser = await requireDashboardAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const svc = createServiceRoleClient();

    const { data: profiles, error: pErr } = await svc
      .from("profiles")
      .select("id, full_name, balance, coffee_stamps, customer_number")
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
      .select("customer_id, created_at, paid, payment_method")
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
      const paid = Boolean(row.paid) || row.payment_method === 'CUENTA_CORRIENTE';
      if (paid) agg.paidCount += 1;
    }

    const allUsers: User[] = [];
    let page = 1;
    const perPage = 200;
    for (;;) {
      const { data, error: listErr } = await svc.auth.admin.listUsers({ page, perPage });
      if (listErr) {
        console.error("[dashboard/customers] listUsers", listErr);
        return NextResponse.json({ error: listErr.message }, { status: 500 });
      }
      allUsers.push(...data.users);
      const next = data.nextPage;
      if (next == null) break;
      page = next;
    }

    const profileDataById = new Map<string, { name: string; balance: number; stamps: number; customer_number: string }>();
    for (const pr of profiles ?? []) {
      profileDataById.set(pr.id as string, {
        name: String(pr.full_name ?? "").trim(),
        balance: Number(pr.balance || 0),
        stamps: Number(pr.coffee_stamps || 0),
        customer_number: String(pr.customer_number ?? "")
      });
    }

    const customers: DashboardCustomerRow[] = [];
    for (const id of customerIdSet) {
      const user = allUsers.find((u) => u.id === id);
      if (!user) continue;
      const agg = byCustomer.get(id);
      const dates = agg?.dates ?? [];
      const last =
        dates.length > 0
          ? dates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
          : null;
      const paidCount = agg?.paidCount ?? 0;
      const birthRaw = metaString(user, "birthdate");
      const pInfo = profileDataById.get(id);

      customers.push({
        id,
        displayName:
          pInfo?.name ||
          metaString(user, "full_name") ||
          metaString(user, "name") ||
          "—",
        email: user.email ?? "—",
        phone: metaString(user, "phone") || (user.phone ?? "").trim() || "—",
        birthdate: birthRaw || null,
        defaultAddress: metaString(user, "default_address") || "—",
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
