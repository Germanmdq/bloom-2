import { NextResponse } from "next/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Registra un pago parcial de un cliente. 
 * 1. Resta del balance en profiles.
 * 2. Crea un registro en orders para que figure en la caja diaria.
 */
export async function POST(req: Request) {
  try {
    const adminUser = await requireDashboardAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { customerId, amount, paymentMethod } = await req.json();

    if (!customerId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const svc = createServiceRoleClient();

    // 1. Obtener balance actual
    const { data: profile, error: pErr } = await svc
      .from("profiles")
      .select("balance, full_name")
      .eq("id", customerId)
      .single();

    if (pErr || !profile) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const newBalance = Math.max(0, (profile.balance || 0) - amount);

    // 2. Actualizar balance
    const { error: upErr } = await svc
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", customerId);

    if (upErr) throw upErr;

    // 3. Crear registro en orders para que sume a la caja (Efectivo/Tarjeta/Mercado Pago)
    // Usamos un formato compatible con el reporte diario
    const { error: orderErr } = await svc
      .from("orders")
      .insert({
        customer_id: customerId,
        total: amount,
        payment_method: paymentMethod || "CASH",
        status: "completed",
        customer_name: profile.full_name,
        items: [{ name: "ABONO CUENTA CORRIENTE", quantity: 1, price: amount }],
        order_type: "pos"
      });

    if (orderErr) throw orderErr;

    return NextResponse.json({ success: true, newBalance });
  } catch (e: any) {
    console.error("[pay-partial]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
