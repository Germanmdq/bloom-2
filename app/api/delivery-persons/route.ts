import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";

export async function GET() {
    try {
        if (!await requireDashboardAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        const svc = await createClient();
        const { data, error } = await svc
            .from("delivery_persons")
            .select("*")
            .eq("active", true)
            .order("name");

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
     try {
        if (!await requireDashboardAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        const svc = await createClient();
        const { name } = await req.json();
        const { data, error } = await svc
            .from("delivery_persons")
            .insert({ name })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
