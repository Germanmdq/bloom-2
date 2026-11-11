import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDashboardAdmin } from "@/lib/dashboard/require-admin-api";

const ORDERS_PAGE_SIZE = 1000;
const ORDERS_MAX_ROWS = 50000;

async function fetchOrders(svc: any, clientId?: string | null, includeItems = false) {
    const allOrders: any[] = [];
    const columns = includeItems
        ? "id, customer_id, total, created_at, items, payment_method, cuenta_corriente, table_id, paid, status"
        : "id, customer_id, total, created_at, items, payment_method, cuenta_corriente, paid, status";

    for (let from = 0; from < ORDERS_MAX_ROWS; from += ORDERS_PAGE_SIZE) {
        const to = from + ORDERS_PAGE_SIZE - 1;
        let query = svc
            .from("orders")
            .select(columns)
            .order("created_at", { ascending: false })
            .range(from, to);

        if (clientId) query = query.eq("customer_id", clientId);

        const { data: page, error } = await query;
        if (error) throw error;
        allOrders.push(...(page || []));
        if (!page || page.length < ORDERS_PAGE_SIZE) break;
    }
    return allOrders;
}

function isCurrentAccountOrder(order: any) {
    return order?.cuenta_corriente === true || order?.payment_method === "CUENTA_CORRIENTE";
}

function isAccountPayment(order: any) {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.some((item: any) => String(item?.id || "") === "cc-payment" || /pago cuenta corriente|abono cuenta corriente/i.test(String(item?.name || "")));
}

function itemQuantity(order: any) {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.reduce((total: number, item: any) => total + Math.max(0, Number(item?.quantity) || 0), 0);
}

function buildClientPayload(profile: any, orders: any[]) {
    const clientOrders = orders.filter((o: any) => o.customer_id === profile.id);
    const saleOrders = clientOrders.filter((order: any) => !isAccountPayment(order));
    const totalSpent = saleOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
    const orderCount = saleOrders.length;
    const totalQuantity = saleOrders.reduce((sum: number, order: any) => sum + itemQuantity(order), 0);
    const openDebtOrders = saleOrders.filter((order: any) => isCurrentAccountOrder(order) && order.paid !== true);
    const debtFromOrders = openDebtOrders.reduce((sum: number, order: any) => sum + Math.max(0, Number(order.total) || 0), 0);
    // El saldo del perfil se actualiza en los pagos parciales. Si todavía no
    // existe (pedidos históricos), usamos las comandas pendientes como respaldo.
    const storedBalance = Math.max(0, Number(profile.balance) || 0);
    const balance = storedBalance > 0 ? storedBalance : debtFromOrders;

    let lastOrderAt = null;
    if (clientOrders.length > 0) {
        try {
            const dates = clientOrders.map((o: any) => new Date(o.created_at).getTime());
            lastOrderAt = new Date(Math.max(...dates)).toISOString();
        } catch (e) {}
    }

    const lastOrders = [...clientOrders].sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
        id: profile.id,
        full_name: profile.full_name || "Cliente S/N",
        email: profile.email || "",
        phone: profile.phone || "",
        cuit: profile.cuit || null,
        customer_number: profile.customer_number || "",
        points: profile.points || 0,
        balance,
        debt_order_count: openDebtOrders.length,
        total_quantity: totalQuantity,
        coffee_stamps: profile.coffee_stamps || 0,
        created_at: profile.created_at || new Date().toISOString(),
        total_spent: totalSpent,
        order_count: orderCount,
        last_order_at: lastOrderAt,
        last_orders: lastOrders
    };
}

export async function GET(req: Request) {
    try {
        const adminUser = await requireDashboardAdmin();
        if (!adminUser) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        const svc = await createClient();
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get("clientId");

        if (clientId) {
            const { data: profile, error: profileError } = await svc
                .from("profiles")
                .select("*")
                .eq("id", clientId)
                .maybeSingle();

            if (profileError) throw profileError;
            if (!profile) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

            const clientOrders = await fetchOrders(svc, clientId, true);
            return NextResponse.json(buildClientPayload(profile, clientOrders));
        }
        
        // 1. Select ALL (*) to avoid failing if specific columns are missing
        const { data: profiles, error: pError } = await svc
            .from("profiles")
            .select("*")
            .order("full_name");

        if (pError) throw pError;

        // 2. Fetch ALL orders for aggregation. Supabase caps plain selects, so paginate.
        const allOrders = await fetchOrders(svc);
        const STAFF_ROLES = ["ADMIN", "WAITER", "KITCHEN", "MANAGER"];
        const orders = allOrders;

        // 3. Process with defensive checks for missing columns in the object
        const processedClients = (profiles || [])
            .filter((p: any) => {
                const roleStr = String(p.role || "").toUpperCase();
                return p.is_customer === true || !STAFF_ROLES.includes(roleStr);
            })
            .map((p: any) => buildClientPayload(p, orders));

        return NextResponse.json(processedClients);
    } catch (err: any) {
        console.error("CRITICAL ERROR in /api/clientes:", err);
        return NextResponse.json({ 
            error: "Internal Server Error", 
            message: err.message,
            available_columns: "unknown"
        }, { status: 500 });
    }
}
