import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
    const svc = createServiceRoleClient();
    const { data, error } = await svc
        .from("profiles")
        .select("id, full_name, email, role")
        .in("role", ["ADMIN", "WAITER", "KITCHEN", "MANAGER"])
        .eq("is_customer", false)
        .order("full_name");
    if (error) return NextResponse.json([], { status: 500 });
    return NextResponse.json(data ?? []);
}
