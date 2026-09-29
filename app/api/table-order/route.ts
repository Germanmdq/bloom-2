import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

// Server-side Supabase client — bypasses any browser-side issues
const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

export async function POST(req: NextRequest) {
    try {
        const { tableId, items, total } = await req.json();

        if (!tableId || !items?.length) {
            return NextResponse.json({ error: 'tableId e items son requeridos' }, { status: 400 });
        }

        const numericTableId = Number(tableId);

        // 1. Ensure salon_tables row exists (upsert FREE if missing)
        await supabase
            .from('salon_tables')
            .upsert({ id: numericTableId, status: 'FREE', total: 0, items: [] }, { onConflict: 'id', ignoreDuplicates: true });

        // 2. Insert kitchen ticket
        const { error: kitchenError } = await supabase
            .from('kitchen_tickets')
            .insert({ table_id: numericTableId, items, status: 'PENDING' });

        if (kitchenError) {
            console.error('[table-order] kitchen_tickets insert error:', kitchenError);
            return NextResponse.json({ error: `Error cocina: ${kitchenError.message}` }, { status: 500 });
        }

        // 3. Fetch existing table data to accumulate
        const { data: tableData } = await supabase
            .from('salon_tables')
            .select('items, total')
            .eq('id', numericTableId)
            .single();

        const existingItems = Array.isArray(tableData?.items) ? tableData.items : [];
        const existingTotal = Number(tableData?.total) || 0;
        const mergedItems = [...existingItems, ...items];
        const mergedTotal = existingTotal + total;

        // 4. Update salon_tables to OCCUPIED
        const { error: tableError } = await supabase
            .from('salon_tables')
            .upsert({
                id: numericTableId,
                status: 'OCCUPIED',
                total: mergedTotal,
                items: mergedItems,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (tableError) {
            console.error('[table-order] salon_tables upsert error:', tableError);
            // Non-fatal: kitchen ticket was already created
        }

        return NextResponse.json({ success: true, tableId: numericTableId, total: mergedTotal });

    } catch (err: any) {
        console.error('[table-order] unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
