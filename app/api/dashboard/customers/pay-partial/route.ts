import { NextResponse } from "next/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";
import { createClient } from "@/lib/supabase/server";

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

    if (!customerId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const svc = await createClient();

    // 1. Obtener balance actual
    const { data: profile, error: pErr } = await svc
      .from("profiles")
      .select("balance, full_name")
      .eq("id", customerId)
      .single();

    if (pErr || !profile) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const currentBalance = Math.max(0, Number(profile.balance) || 0);
    const paidAmount = Number(amount);
    if (paidAmount > currentBalance) {
      return NextResponse.json({ error: "El pago no puede superar la deuda pendiente" }, { status: 400 });
    }
    const newBalance = Math.max(0, currentBalance - paidAmount);

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
        total: paidAmount,
        payment_method: paymentMethod || "CASH",
        status: "completed",
        customer_name: profile.full_name,
        items: [{ name: "ABONO CUENTA CORRIENTE", quantity: 1, price: paidAmount }],
        order_type: "pos"
      });

    if (orderErr) throw orderErr;

    return NextResponse.json({ success: true, newBalance });
  } catch (e: any) {
    console.error("[pay-partial]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
