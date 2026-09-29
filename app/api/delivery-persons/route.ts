import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
    try {
        const svc = createServiceRoleClient();
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
        const svc = createServiceRoleClient();
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
