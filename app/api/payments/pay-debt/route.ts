import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { amount, method, notes } = await req.json();

        if (!amount || amount < 1) {
            return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
        }

        const svc = createServiceRoleClient();

        // 1. Fetch current balance (Server-side validation)
        const { data: profile, error: profError } = await svc
            .from("profiles")
            .select("balance, full_name")
            .eq("id", user.id)
            .single();

        if (profError || !profile) {
            return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
        }

        const currentBalance = Number(profile.balance) || 0;
        const payAmount = Number(amount);

        if (payAmount > currentBalance) {
            return NextResponse.json({ error: "El monto supera el saldo pendiente" }, { status: 400 });
        }

        const newBalance = currentBalance - payAmount;

        // 2. Atomic-ish update: Update balance and insert history
        // Ideally we use a RPC for transaction, but for now we do sequential with service role.
        const { error: updateError } = await svc
            .from("profiles")
            .update({ balance: newBalance })
            .eq("id", user.id);

        if (updateError) throw updateError;

        const { data: historyData, error: historyError } = await svc
            .from("payments_history")
            .insert({
                profile_id: user.id,
                amount: payAmount,
                method: method || 'OTHER',
                remaining_balance: newBalance,
                notes: notes || 'Pago de saldo pendiente'
            })
            .select()
            .single();

        if (historyError) throw historyError;

        const { data: ccOrders, error: ccOrdersError } = await svc
            .from("orders")
            .select("id, total, paid")
            .eq("customer_id", user.id)
            .eq("payment_method", "CUENTA_CORRIENTE")
            .order("created_at", { ascending: true });

        if (ccOrdersError) throw ccOrdersError;

        let remainingToApply = payAmount;
        const paidOrderIds: string[] = [];
        for (const order of ccOrders ?? []) {
            if (order.paid === true) continue;
            const orderTotal = Number(order.total || 0);
            if (remainingToApply + 0.001 < orderTotal) break;
            paidOrderIds.push(order.id);
            remainingToApply -= orderTotal;
        }

        if (paidOrderIds.length > 0) {
            const { error: paidOrdersError } = await svc
                .from("orders")
                .update({ paid: true, status: "paid" })
                .in("id", paidOrderIds);
            if (paidOrdersError) throw paidOrdersError;
        }

        // 3. Return success and data for the ticket
        return NextResponse.json({
            success: true,
            data: {
                transaction_id: historyData.id,
                customer_name: profile.full_name,
                amount_paid: payAmount,
                remaining_balance: newBalance,
                date: historyData.created_at
            }
        });

    } catch (error: any) {
        console.error("Debt payment error:", error);
        return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
    }
}
