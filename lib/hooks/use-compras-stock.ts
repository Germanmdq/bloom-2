
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// =====================================================
// PROVEEDORES
// =====================================================
export function useProveedores() {
    return useQuery({
        queryKey: ['proveedores'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('proveedores')
                .select('*')
                .eq('activo', true)
                .order('nombre');
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });
}

export function useCreateProveedor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (proveedor: { nombre: string; cuit?: string; telefono?: string; email?: string }) => {
            const { data, error } = await supabase
                .from('proveedores')
                .insert([proveedor])
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
        }
    });
}

export function useUpdateProveedor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; nombre?: string; cuit?: string; telefono?: string; saldo_cc?: number }) => {
            const { data: result, error } = await supabase
                .from('proveedores')
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select();
            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
        }
    });
}

// =====================================================
// INSUMOS
// =====================================================
export function useInsumos() {
    return useQuery({
        queryKey: ['insumos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('insumos')
                .select('*, proveedores(id, nombre)')
                .eq('activo', true)
                .order('nombre');
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 30,
    });
}

export function useInsumosByProveedor(proveedorId: string | null) {
    return useQuery({
        queryKey: ['insumos', 'by-proveedor', proveedorId],
        queryFn: async () => {
            if (!proveedorId) return [];
            const { data, error } = await supabase
                .from('insumos')
                .select('*')
                .eq('proveedor_id', proveedorId)
                .eq('activo', true)
                .order('nombre');
            if (error) throw error;
            return data;
        },
        enabled: !!proveedorId,
        staleTime: 1000 * 30,
    });
}

export function useCreateInsumo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (insumo: { nombre: string; unidad: string; stock_minimo?: number; proveedor_id?: string; categoria?: string }) => {
            const { data, error } = await supabase
                .from('insumos')
                .insert([insumo])
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['insumos'] });
        }
    });
}

export function useUpdateInsumo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
            const { data: result, error } = await supabase
                .from('insumos')
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select();
            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['insumos'] });
        }
    });
}

// =====================================================
// COMPRAS
// =====================================================
export function useCompras() {
    return useQuery({
        queryKey: ['compras'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('compras')
                .select('*, proveedores(id, nombre)')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 30,
    });
}

export function useRegistrarCompra() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (params: {
            proveedor_id: string;
            numero_factura?: string;
            metodo_pago: 'efectivo' | 'cuenta_corriente' | 'mercado_pago' | 'transferencia';
            observaciones?: string;
            items: Array<{ insumo_id: string; cantidad: number; precio_unitario: number }>;
        }) => {
            // Calculate total
            const total = params.items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);

            // 1. Insert compra header
            const { data: compra, error: compraError } = await supabase
                .from('compras')
                .insert([{
                    proveedor_id: params.proveedor_id,
                    numero_factura: params.numero_factura || null,
                    metodo_pago: params.metodo_pago,
                    total,
                    observaciones: params.observaciones || null,
                }])
                .select()
                .single();

            if (compraError) throw compraError;

            // 2. Insert detail items
            const detailItems = params.items.map(item => ({
                compra_id: compra.id,
                insumo_id: item.insumo_id,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
            }));

            const { error: detailError } = await supabase
                .from('compras_detalle')
                .insert(detailItems);

            if (detailError) throw detailError;

            // 3. Update stock and price for each insumo
            for (const item of params.items) {
                // Get current stock
                const { data: currentInsumo } = await supabase
                    .from('insumos')
                    .select('stock_actual')
                    .eq('id', item.insumo_id)
                    .single();

                const newStock = (currentInsumo?.stock_actual || 0) + item.cantidad;

                await supabase
                    .from('insumos')
                    .update({
                        stock_actual: newStock,
                        precio_ultima_compra: item.precio_unitario,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', item.insumo_id);
            }

            // 4. If cuenta corriente, update supplier balance
            if (params.metodo_pago === 'cuenta_corriente') {
                const { data: proveedor } = await supabase
                    .from('proveedores')
                    .select('saldo_cc')
                    .eq('id', params.proveedor_id)
                    .single();

                await supabase
                    .from('proveedores')
                    .update({
                        saldo_cc: (proveedor?.saldo_cc || 0) + total,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', params.proveedor_id);
            }

            return compra;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['compras'] });
            queryClient.invalidateQueries({ queryKey: ['insumos'] });
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
        }
    });
}

// =====================================================
// GASTOS FIJOS
// =====================================================
export function useGastosFijos() {
    return useQuery({
        queryKey: ['gastos_fijos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gastos_fijos')
                .select('*')
                .order('fecha_vencimiento', { ascending: true });
            if (error) throw error;
            return data;
        },
        staleTime: 0,
    });
}

export function useGastosFijosPendientes() {
    return useQuery({
        queryKey: ['gastos_fijos', 'pendientes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gastos_fijos')
                .select('*')
                .order('fecha_vencimiento', { ascending: true });
            if (error) throw error;
            return data;
        },
        staleTime: 0,
    });
}

export function useCreateGastoFijo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (gasto: { nombre: string; monto: number; fecha_vencimiento: string; categoria?: string }) => {
            const { data, error } = await supabase
                .from('gastos_fijos')
                .insert([{ ...gasto, estado: 'pendiente' }])
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gastos_fijos'] });
        }
    });
}

export function useMarcarGastoPagado() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data, error } = await supabase
                .from('gastos_fijos')
                .update({ estado: 'pagado', updated_at: new Date().toISOString() })
                .eq('id', id)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gastos_fijos'] });
        }
    });
}

export function useUpdateGastoFijo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; monto?: number; fecha_vencimiento?: string; estado?: string }) => {
            const { data: result, error } = await supabase
                .from('gastos_fijos')
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select();
            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gastos_fijos'] });
        }
    });
}

export function useDeleteGastoFijo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('gastos_fijos')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gastos_fijos'] });
        }
    });
}

export function useAbonarGastoFijo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, montoAbonado, motivo }: { id: string; montoAbonado: number; motivo: string }) => {
            const { data: gasto } = await supabase
                .from('gastos_fijos')
                .select('monto, estado, historial_pagos')
                .eq('id', id)
                .single();

            const nuevoMonto = Math.max(0, (gasto?.monto || 0) - montoAbonado);
            const nuevoEstado = nuevoMonto === 0 ? 'pagado' : gasto?.estado;
            
            // Add to history
            const historialActual = Array.isArray(gasto?.historial_pagos) ? gasto.historial_pagos : [];
            const nuevoHistorial = [...historialActual, {
                fecha: new Date().toISOString(),
                monto: montoAbonado,
                motivo: motivo || 'Abono parcial'
            }];

            const { data, error } = await supabase
                .from('gastos_fijos')
                .update({ 
                    monto: nuevoMonto, 
                    estado: nuevoEstado,
                    historial_pagos: nuevoHistorial,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', id)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gastos_fijos'] });
        }
    });
}

// =====================================================
// PAGAR SALDO A PROVEEDOR
// =====================================================
export function usePagarSaldoProveedor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, monto, motivo }: { id: string; monto: number; motivo: string }) => {
            const { data: proveedor } = await supabase
                .from('proveedores')
                .select('saldo_cc, historial_pagos')
                .eq('id', id)
                .single();

            const nuevoSaldo = Math.max(0, (proveedor?.saldo_cc || 0) - monto);

            const historialActual = Array.isArray(proveedor?.historial_pagos) ? proveedor.historial_pagos : [];
            const nuevoHistorial = [...historialActual, {
                fecha: new Date().toISOString(),
                monto: monto,
                motivo: motivo || 'Pago a proveedor'
            }];

            const { data, error } = await supabase
                .from('proveedores')
                .update({ 
                    saldo_cc: nuevoSaldo, 
                    historial_pagos: nuevoHistorial,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', id)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proveedores'] });
        }
    });
}
