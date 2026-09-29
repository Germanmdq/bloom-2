
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export function useProducts() {
    return useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('active', true)
                .order('name');
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useCreateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (product: any) => {
            const { data, error } = await supabase
                .from('products')
                .insert([product])
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock'] });
        }
    });
}

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 60,
    });
}

export function useAppSettings() {
    return useQuery({
        queryKey: ['app_settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .eq('id', 1)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

export function useSendKitchenTicket() {
    return useMutation({
        mutationFn: async (ticket: { table_id: string; items: any[]; notes: string }) => {
            const { data, error } = await supabase
                .from('kitchen_tickets')
                .insert([{
                    table_id: ticket.table_id,
                    items: ticket.items,
                    notes: ticket.notes,
                    status: 'PENDING'
                }])
                .select();
            if (error) throw error;
            return data;
        }
    });
}

export function useCreateOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderData: any) => {
            const total = orderData.total ??
                orderData.items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);

            const status = orderData.status || 'pending';
            const paid = typeof orderData.paid === 'boolean' ? orderData.paid : status === 'paid' || status === 'completed';

            const { data, error } = await supabase
                .from('orders')
                .insert({
                    table_id: orderData.table_id,
                    total,
                    payment_method: orderData.payment_method,
                    waiter_id: orderData.waiter_id || null,
                    customer_id: orderData.customer_id || null,
                    customer_name: orderData.customer_name || null,
                    status,
                    paid,
                    items: orderData.items || [],
                    discount: orderData.discount || 0,
                    delivery_person_id: orderData.delivery_person_id || null,
                })
                .select()
                .single();

            if (error) { console.error("❌ [createOrder] insert failed:", error.message, "| code:", error.code); throw error; }
            console.log("✅ [createOrder] success, id:", data?.id, "payment_method:", orderData.payment_method);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
    });
}

export function useKitchenTickets() {
    return useQuery({
        queryKey: ['kitchen_tickets'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('kitchen_tickets')
                .select('*')
                .neq('status', 'DELIVERED')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data;
        },
        staleTime: 5000,
    });
}

export function useStock() {
    return useQuery({
        queryKey: ['stock'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('v_stock')
                .select('*')
                .order('name');
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 30, // 30s cache
    });
}

export function useInventoryMovements() {
    return useQuery({
        queryKey: ['inventory_movements'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_movements')
                .select('*, products(name, unit)')
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            return data;
        },
    });
}

export function useCreateMovement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (movement: any) => {
            const { data, error } = await supabase
                .from('inventory_movements')
                .insert([movement])
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
        }
    });
}

export function useSuppliers() {
    return useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('active', true)
                .order('name');
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 min cache
    });
}

export function useCreateSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (supplier: any) => {
            const { data, error } = await supabase
                .from('suppliers')
                .insert([supplier])
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        }
    });
}

export function useUpdateSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...supplier }: any) => {
            const { data, error } = await supabase
                .from('suppliers')
                .update(supplier)
                .eq('id', id)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        }
    });
}

export function useExpenses() {
    return useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('expenses')
                .select('*, suppliers(name)')
                .order('expense_date', { ascending: false })
                .limit(100);
            if (error) throw error;
            return data;
        },
    });
}

export function useCreateExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (expense: any) => {
            const { data, error } = await supabase
                .from('expenses')
                .insert([expense])
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        }
    });
}

// ─── Compras & Stock ──────────────────────────────────────────────────────

export function useSupplies(supplierId?: string) {
    return useQuery({
        queryKey: ['supplies', supplierId ?? 'all'],
        queryFn: async () => {
            let q = supabase
                .from('supplies')
                .select('*, suppliers(name)')
                .eq('active', true)
                .order('name');
            if (supplierId) q = q.eq('supplier_id', supplierId);
            const { data, error } = await q;
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 30,
    });
}

export function useCreateSupply() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (supply: any) => {
            const { data, error } = await supabase.from('supplies').insert([supply]).select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['supplies'] }); },
    });
}

export function useUpdateSupply() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...supply }: any) => {
            const { data, error } = await supabase.from('supplies').update(supply).eq('id', id).select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['supplies'] }); },
    });
}

export function usePurchases() {
    return useQuery({
        queryKey: ['purchases'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('purchases')
                .select('*, suppliers(name), purchase_items(supply_name, quantity, unit_price, subtotal)')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data;
        },
    });
}

export function useCreatePurchase() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            supplierId: string;
            invoiceNumber: string;
            cuit: string;
            paymentMethod: 'CASH' | 'ACCOUNT';
            items: { supply_id: string; supply_name: string; quantity: number; unit_price: number }[];
        }) => {
            const { data, error } = await supabase.rpc('create_purchase', {
                p_supplier_id:    payload.supplierId,
                p_invoice_number: payload.invoiceNumber,
                p_cuit:           payload.cuit,
                p_payment_method: payload.paymentMethod,
                p_items:          payload.items,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            queryClient.invalidateQueries({ queryKey: ['supplies'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });
}

export function useFixedExpenses() {
    return useQuery({
        queryKey: ['fixed_expenses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('fixed_expenses')
                .select('*')
                .order('due_date', { ascending: true });
            if (error) throw error;
            return data;
        },
    });
}

export function useUpdateFixedExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...fields }: any) => {
            const { data, error } = await supabase.from('fixed_expenses').update(fields).eq('id', id).select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fixed_expenses'] }); },
    });
}

// ─────────────────────────────────────────────────────────────────────────────

export function useUserRole() {
    return useQuery({
        queryKey: ['user_role'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return 'WAITER';

            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (error) return 'WAITER';
            return data?.role || 'WAITER';
        },
        staleTime: 1000 * 60 * 10,
    });
}
