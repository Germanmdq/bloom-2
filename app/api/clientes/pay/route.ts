import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
    try {
        const { clientId, amount, method, orderId } = await req.json();
        if (!clientId) return NextResponse.json({ error: "Client ID required" }, { status: 400 });

        const svc = createServiceRoleClient();

        let orderToPay: any = null;
        if (orderId) {
            const { data: order, error: orderError } = await svc
                .from("orders")
                .select("id, customer_id, total, paid, status, payment_method")
                .eq("id", orderId)
                .maybeSingle();

            if (orderError) throw orderError;
            if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
            if (order.customer_id !== clientId) return NextResponse.json({ error: "Order does not belong to client" }, { status: 400 });
            if (order.payment_method !== "CUENTA_CORRIENTE") return NextResponse.json({ error: "Order is not current account debt" }, { status: 400 });
            if (order.paid === true) return NextResponse.json({ error: "Order already paid" }, { status: 400 });
            orderToPay = order;
        }

        const { data: profile } = await svc
            .from("profiles")
            .select("balance")
            .eq("id", clientId)
            .single();

        const currentBalance = Number(profile?.balance || 0);
        const paidAmount = amount !== undefined ? Number(amount) : orderToPay ? Number(orderToPay.total || 0) : currentBalance;
        const newBalance = currentBalance - paidAmount;

        const { error } = await svc
            .from("profiles")
            .update({ balance: newBalance })
            .eq("id", clientId);

        if (error) throw error;

        // Registrar en historial de pagos
        await svc.from("payments_history").insert({
            profile_id: clientId,
            amount: paidAmount,
            method: method || "CASH",
            remaining_balance: newBalance,
        });

        const paidOrderIds: string[] = [];
        if (orderToPay) {
            paidOrderIds.push(orderToPay.id);
        } else {
            const { data: ccOrders, error: ccOrdersError } = await svc
                .from("orders")
                .select("id, total, paid, status")
                .eq("customer_id", clientId)
                .eq("payment_method", "CUENTA_CORRIENTE")
                .order("created_at", { ascending: true });

            if (ccOrdersError) throw ccOrdersError;

            let remainingToApply = paidAmount;
            for (const order of ccOrders ?? []) {
                const alreadyPaid = order.paid === true;
                if (alreadyPaid) continue;
                const orderTotal = Number(order.total || 0);
                if (remainingToApply + 0.001 < orderTotal) break;
                paidOrderIds.push(order.id);
                remainingToApply -= orderTotal;
            }
        }

        if (paidOrderIds.length > 0) {
            const { error: paidOrdersError } = await svc
                .from("orders")
                .update({ paid: true, status: "paid" })
                .in("id", paidOrderIds);
            if (paidOrdersError) throw paidOrdersError;
        }

        // Insertar en orders para que aparezca en la caja diaria
        const { data: prof } = await svc.from("profiles").select("full_name").eq("id", clientId).single();
        await svc.from("orders").insert({
            total: paidAmount,
            payment_method: method || "CASH",
            status: "completed",
            paid: true,
            customer_id: clientId,
            customer_name: prof?.full_name ?? null,
            items: [{ id: "cc-payment", name: "Pago Cuenta Corriente", price: paidAmount, quantity: 1 }],
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Error paying balance:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
