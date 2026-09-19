import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
    try {
        const { phone, customer_number } = await req.json() as { phone: string; customer_number: string };

        if (!phone || !customer_number) {
            return NextResponse.json({ error: "Teléfono y número de socio requeridos." }, { status: 400 });
        }

        const svc = createServiceRoleClient();

        // Normalizar teléfono: solo dígitos
        const phoneClean = phone.replace(/\D/g, "");

        // Buscar cliente por teléfono + número de socio
        const { data: profile, error } = await svc
            .from("profiles")
            .select("id, email, full_name, customer_number, phone")
            .or(`phone.eq.${phone},phone.eq.${phoneClean},phone.ilike.%${phoneClean}%`)
            .eq("customer_number", customer_number.trim())
            .maybeSingle();

        if (error || !profile) {
            return NextResponse.json({ error: "Teléfono o número de socio incorrecto." }, { status: 401 });
        }

        // Generar magic link para el usuario
        const { data: linkData, error: linkError } = await svc.auth.admin.generateLink({
            type: "magiclink",
            email: profile.email,
            options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/cuenta` },
        });

        if (linkError || !linkData?.properties?.action_link) {
            return NextResponse.json({ error: "Error al generar sesión. Intentá de nuevo." }, { status: 500 });
        }

        return NextResponse.json({
            link: linkData.properties.action_link,
            name: profile.full_name
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message ?? "Error interno." }, { status: 500 });
    }
}
