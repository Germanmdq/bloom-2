import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";

export async function GET() {
    if (!await requireDashboardAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    const svc = await createClient();
    const { data, error } = await svc
        .from("profiles")
        .select("id, full_name, email, role")
        .in("role", ["ADMIN", "WAITER", "KITCHEN", "MANAGER"])
        .eq("is_customer", false)
        .order("full_name");
    if (error) return NextResponse.json([], { status: 500 });
    return NextResponse.json(data ?? []);
}
