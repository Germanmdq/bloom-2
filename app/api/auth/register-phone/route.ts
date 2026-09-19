import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
    try {
        const { full_name, phone, cuit, birthdate } = await req.json() as {
            full_name: string;
            phone: string;
            cuit?: string | null;
            birthdate: string | null;
        };

        if (!full_name?.trim() || !phone?.trim()) {
            return NextResponse.json({ error: "Nombre y teléfono requeridos." }, { status: 400 });
        }

        const svc = createServiceRoleClient();
        const phoneClean = phone.replace(/\D/g, "");
        const password = phoneClean.slice(-4);
        const customerNumber = String(Math.floor(Math.random() * 900000) + 100000);

        const { data, error } = await svc.auth.admin.createUser({
            phone: phoneClean,
            password,
            phone_confirm: true,
            user_metadata: {
                full_name: full_name.trim(),
                phone: phone.trim(),
                birthdate: birthdate ?? null,
                customer_number: customerNumber,
                is_customer: true,
            },
        });

        if (error) {
            const isDuplicate = error.message.toLowerCase().includes("already") ||
                error.message.toLowerCase().includes("duplicate") ||
                (error as any).code === "phone_exists";
            if (isDuplicate) {
                return NextResponse.json({ error: "already_exists" }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const userId = data?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Error al crear usuario." }, { status: 500 });
        }

        await svc.from("profiles").update({
            full_name: full_name.trim(),
            phone: phone.trim(),
            cuit: cuit?.trim() || null,
            customer_number: customerNumber,
            is_customer: true,
            ...(birthdate ? { birthdate } : {}),
        }).eq("id", userId);

        return NextResponse.json({ id: userId, customer_number: customerNumber, name: full_name.trim() });
    } catch (err: any) {
        return NextResponse.json({ error: err.message ?? "Error interno." }, { status: 500 });
    }
}
