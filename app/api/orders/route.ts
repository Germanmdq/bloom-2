import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { items, total, customer_name, customer_phone, table_id, notes, delivery_type, delivery_info } = body;

        if (!items || !items.length) {
            return NextResponse.json({ error: "El pedido no contiene productos" }, { status: 400 });
        }

        const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
        const numericTableId = table_id ? Number(table_id) : null;
        const finalDeliveryType = numericTableId ? "salon" : (delivery_type || "retiro");
        const finalOrderType = numericTableId ? "LOCAL" : (finalDeliveryType === "delivery" ? "DELIVERY" : "TAKEAWAY");
        const displayName = customer_name?.trim() || (numericTableId ? `Mesa ${numericTableId}` : "Cliente Web");

        // 0. Validación y Descuento de Inventario en Tiempo Real
        const itemIds = items.map((i: any) => i.id).filter(Boolean);
        const { data: dbProducts } = await supabase
            .from("products")
            .select("id, name, stock, track_stock, min_stock, total_vendidos, vendidos")
            .in("id", itemIds);

        const prodMap = new Map((dbProducts || []).map((p: any) => [p.id, p]));
        const lowStockAlerts: string[] = [];

        // Validar si hay stock suficiente para los productos con control de stock activado
        for (const it of items) {
            const prod = prodMap.get(it.id);
            if (prod && prod.track_stock) {
                const currentStock = Number(prod.stock) || 0;
                const requested = Number(it.quantity) || 1;
                if (currentStock < requested) {
                    return NextResponse.json({
                        error: `Stock insuficiente para "${prod.name}". Disponible: ${currentStock}, solicitado: ${requested}`,
                    }, { status: 400 });
                }
            }
        }

        // Si todos tienen stock suficiente, descontar inventario y sumar a vendidos
        for (const it of items) {
            const prod = prodMap.get(it.id);
            if (prod && prod.track_stock) {
                const currentStock = Number(prod.stock) || 0;
                const qty = Number(it.quantity) || 1;
                const newStock = currentStock - qty;
                const newVendidos = (Number(prod.vendidos) || 0) + qty;
                const newTotalVendidos = (Number(prod.total_vendidos) || 0) + qty;

                await supabase
                    .from("products")
                    .update({
                        stock: newStock,
                        vendidos: newVendidos,
                        total_vendidos: newTotalVendidos,
                    })
                    .eq("id", prod.id);

                if (newStock <= (Number(prod.min_stock) || 0)) {
                    lowStockAlerts.push(`${prod.name} (quedan ${newStock})`);
                }
            }
        }

        // 1. Crear Orden en tabla 'orders' (aparece en Historial de Órdenes y en el Salón)
        const orderPayload = {
            customer_name: displayName,
            customer_phone: customer_phone?.trim() || null,
            order_type: finalOrderType,
            delivery_type: finalDeliveryType,
            delivery_info: delivery_info?.trim() || null,
            table_id: numericTableId,
            items,
            total: Number(total) || 0,
            status: "pending",
            paid: false,
            stock_applied: true,
            stock_deducted: true,
            payment_method: "PENDING",
            payment_notes: notes || null,
            created_at: new Date().toISOString()
        };

        const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .insert([orderPayload])
            .select()
            .single();

        if (orderError) {
            console.error("[orders API] error insertando order:", orderError);
        }

        // 2. Crear Comanda en tabla 'kitchen_tickets' (aparece en Cocina del Dashboard)
        const kitchenNotes = [
            displayName,
            numericTableId ? `Mesa ${numericTableId}` : (finalDeliveryType === 'delivery' ? `DELIVERY: ${delivery_info || ''}` : 'RETIRO EN LOCAL'),
            customer_phone ? `Tel: ${customer_phone}` : null,
            notes ? `Nota: ${notes}` : null
        ].filter(Boolean).join(" | ");

        const kitchenPayload = {
            table_id: numericTableId || 0,
            items: items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            status: "PENDING",
            notes: kitchenNotes,
            created_at: new Date().toISOString()
        };

        const { error: kitchenError } = await supabase
            .from("kitchen_tickets")
            .insert([kitchenPayload]);

        if (kitchenError) {
            console.error("[orders API] error insertando kitchen_ticket:", kitchenError);
        }

        // 3. Si hay mesa, actualizar 'salon_tables' para que aparezca ocupada en el salón
        if (numericTableId) {
            try {
                const { data: tableData } = await supabase
                    .from("salon_tables")
                    .select("items, total")
                    .eq("id", numericTableId)
                    .single();

                const existingItems = Array.isArray(tableData?.items) ? tableData.items : [];
                const existingTotal = Number(tableData?.total) || 0;

                const hasCustomName = customer_name?.trim() && !customer_name.trim().toLowerCase().startsWith('mesa ');
                const hasExistingMeta = existingItems.some((it: any) => it.id === 'meta-customer');

                let mergedItems = [...existingItems];
                if (hasCustomName && !hasExistingMeta) {
                    mergedItems.unshift({
                        id: 'meta-customer',
                        name: `Cliente: ${customer_name.trim()}`,
                        price: 0,
                        quantity: 1,
                        category: 'METADATA'
                    });
                }
                mergedItems = [...mergedItems, ...items];
                const mergedTotal = existingTotal + (Number(total) || 0);

                await supabase.from("salon_tables").upsert({
                    id: numericTableId,
                    status: "OCCUPIED",
                    order_type: "LOCAL",
                    total: mergedTotal,
                    items: mergedItems,
                    updated_at: new Date().toISOString(),
                }, { onConflict: "id" });
            } catch (tableErr) {
                console.error("[orders API] error actualizando salon_tables:", tableErr);
            }
        }

        return NextResponse.json({ 
            success: true, 
            orderId: orderData?.id,
            message: "Pedido creado y enviado a cocina exitosamente" 
        }, { status: 200 });

    } catch (error: any) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
