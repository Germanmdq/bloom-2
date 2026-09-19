import { useEffect } from 'react';
import { createClient } from '../supabase/client';
import { toast } from 'sonner';
import { soundAlerts } from '../audio/sound-alerts';

export function useOrderNotification() {
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase
            .channel('dashboard-orders-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                },
                (payload: any) => {
                    const newOrder = payload.new;
                    const total = Number(newOrder.total ?? 0);
                    const customer = newOrder.customer_name || `Pedido #${newOrder.id?.slice(0, 4)}`;
                    const isWeb = newOrder.order_type === 'web';
                    
                    if (isWeb) {
                        soundAlerts.playOrderAlert();
                        toast.success(`Nuevo pedido web: ${customer}`, {
                            description: `Total: $${total.toLocaleString()}`,
                            duration: 8000,
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                },
                (payload: any) => {
                    const oldOrder = payload.old;
                    const newOrder = payload.new;
                    
                    // Sonido si el pedido se pagó exitosamente
                    if (newOrder.status === 'pending' && oldOrder.status === 'pending_payment' && newOrder.order_type === 'web') {
                        const total = Number(newOrder.total ?? 0);
                        const customer = newOrder.customer_name || `Pedido #${newOrder.id?.slice(0, 4)}`;
                        
                        soundAlerts.playOrderAlert();
                        toast.success(`¡Pago Recibido!: ${customer}`, {
                            description: `Monto: $${total.toLocaleString()}`,
                            duration: 10000,
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'kitchen_tickets',
                },
                (payload: any) => {
                    const ticket = payload.new;
                    soundAlerts.playKitchenChime();
                    toast.info(`Comanda Mesa ${ticket.table_id || 'Mostrador'}`, {
                        description: 'Nuevo pedido enviado a cocina',
                        duration: 6000,
                    });
                }
            )
            // Trigger automático de Alerta de Stock Bajo en Productos de Carta
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'products',
                },
                (payload: any) => {
                    const prod = payload.new;
                    if (prod?.track_stock) {
                        const stock = Number(prod.stock) || 0;
                        const minStock = Number(prod.min_stock) || 0;
                        if (stock <= minStock) {
                            soundAlerts.playWarningAlert();
                            toast.warning(`⚠️ Stock Bajo: ${prod.name}`, {
                                description: `Quedan solo ${stock} unidades (mínimo: ${minStock}). Considerar reponer.`,
                                duration: 10000,
                            });
                        }
                    }
                }
            )
            // Trigger automático de Alerta de Stock Bajo en Insumos
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'insumos',
                },
                (payload: any) => {
                    const insumo = payload.new;
                    if (insumo?.activo) {
                        const stock = Number(insumo.stock_actual) || 0;
                        const minStock = Number(insumo.stock_minimo) || 0;
                        if (stock <= minStock) {
                            soundAlerts.playWarningAlert();
                            toast.warning(`⚠️ Insumo Crítico: ${insumo.nombre}`, {
                                description: `Stock actual: ${stock} ${insumo.unidad || 'un.'} (mínimo: ${minStock}).`,
                                duration: 10000,
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);
}
