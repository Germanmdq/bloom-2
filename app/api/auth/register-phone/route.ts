import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { normalizePhone, PHONE_ERROR } from "@/lib/phone";

/**
 * Alta de un cliente desde el panel (solo personal). El cliente luego entra con su teléfono en /acceso;
 * la contraseña es aleatoria y no se usa. El registro público se hace en /acceso.
 */
export async function POST(req: Request) {
    try {
        if (!(await requireDashboardAdmin())) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
            return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." }, { status: 503 });
        }

        const { full_name, phone, cuit, birthdate } = await req.json() as {
            full_name: string;
            phone: string;
            cuit?: string | null;
            birthdate?: string | null;
        };

        if (!full_name?.trim() || !phone?.trim()) {
            return NextResponse.json({ error: "Nombre y teléfono requeridos." }, { status: 400 });
        }
        const phoneClean = normalizePhone(phone);
        if (!phoneClean) return NextResponse.json({ error: PHONE_ERROR }, { status: 400 });

        const svc = createServiceRoleClient();

        const { data: existing } = await svc
            .from("profiles")
            .select("id")
            .eq("phone", phoneClean)
            .eq("is_customer", true)
            .limit(1)
            .maybeSingle();
        if (existing) return NextResponse.json({ error: "already_exists" }, { status: 409 });

        const customerNumber = String(Math.floor(Math.random() * 900000) + 100000);

        const { data, error } = await svc.auth.admin.createUser({
            email: `${phoneClean}@clientes.bloom.local`,
            password: randomBytes(32).toString("hex"),
            email_confirm: true,
            user_metadata: { full_name: full_name.trim() },
        });
        if (error || !data?.user) {
            const duplicate = /already|duplicate/i.test(error?.message ?? "");
            return NextResponse.json({ error: duplicate ? "already_exists" : (error?.message ?? "Error al crear usuario.") }, { status: duplicate ? 409 : 500 });
        }

        // Siempre cliente, nunca staff (no se envía `role`).
        const { error: profileError } = await svc.from("profiles").upsert({
            id: data.user.id,
            full_name: full_name.trim(),
            phone: phoneClean,
            cuit: cuit?.trim() || null,
            customer_number: customerNumber,
            is_customer: true,
            ...(birthdate ? { birthdate } : {}),
        }, { onConflict: "id" });
        if (profileError) {
            await svc.auth.admin.deleteUser(data.user.id); // deshace solo el usuario recién creado
            return NextResponse.json({ error: profileError.code === "23505" ? "already_exists" : profileError.message }, { status: profileError.code === "23505" ? 409 : 500 });
        }

        return NextResponse.json({ id: data.user.id, customer_number: customerNumber, name: full_name.trim() });
    } catch (err: any) {
        return NextResponse.json({ error: err.message ?? "Error interno." }, { status: 500 });
    }
}
