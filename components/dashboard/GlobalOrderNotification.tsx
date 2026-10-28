"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { IconShoppingBag, IconChevronRight, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { soundAlerts } from "@/lib/audio/sound-alerts";

export function GlobalOrderNotification() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const knownOrderIds = new Set<string>();
        let isInitial = true;

        const handleNewOrder = (order: any) => {
            if (!order || order.status !== 'pending') return;
            if (knownOrderIds.has(order.id)) return;
            knownOrderIds.add(order.id);

            soundAlerts.playOrderAlert();
            setNotifications(prev => {
                if (prev.find(n => n.id === order.id)) return prev;
                return [...prev, order];
            });

            // Disparar evento para refrescar las mesas automáticamente
            window.dispatchEvent(new CustomEvent('bloom-refresh-tables'));
        };

        // 1. Realtime listener
        const channel = supabase
            .channel('global_orders_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                handleNewOrder(payload.new);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                const newOrder = payload.new as any;
                const oldOrder = payload.old as any;
                if (newOrder.status === 'pending' && oldOrder?.status === 'pending_payment') {
                    handleNewOrder(newOrder);
                }
            })
            .subscribe();

        // 2. Polling activo cada 3.5s para no depender únicamente del socket
        const pollOrders = async () => {
            try {
                const { data } = await supabase
                    .from('orders')
                    .select('id, customer_name, total, order_type, delivery_type, table_id, status, created_at, items, notes')
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })
                    .limit(15);

                if (!data) return;

                if (isInitial) {
                    data.forEach((o: any) => knownOrderIds.add(o.id));
                    isInitial = false;
                    return;
                }

                data.forEach((o: any) => {
                    if (!knownOrderIds.has(o.id)) {
                        handleNewOrder(o);
                    }
                });
            } catch (err) {
                console.error('[GlobalNotification] Error polling:', err);
            }
        };

        pollOrders();
        const interval = setInterval(pollOrders, 3500);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    const handleAccept = (notif: any) => {
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
        const params = new URLSearchParams({ order: notif.id });
        if (notif.table_id && String(notif.order_type).toLowerCase() !== 'web' && Number(notif.table_id) < 5000) {
            params.set('table', String(notif.table_id));
        }
        router.push(`/dashboard/tables?${params.toString()}`);
        window.dispatchEvent(new CustomEvent('bloom-refresh-tables'));
    };

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex flex-col items-center pointer-events-none w-full max-w-sm">
            <AnimatePresence>
                {notifications.slice(0, 1).map((notif) => {
                    const isDelivery = notif.delivery_type === 'delivery' || notif.order_type === 'DELIVERY';
                    const isMesa = !isDelivery && String(notif.order_type).toLowerCase() !== 'web' && Number(notif.table_id) > 0 && Number(notif.table_id) < 5000;
                    
                    const tagLabel = isMesa ? `🍽️ Mesa ${notif.table_id || ''}` : isDelivery ? '🛵 Delivery' : '🏃 Retiro en Local';
                    const tagColor = isDelivery ? 'text-red-500' : isMesa ? 'text-amber-500' : 'text-emerald-500';
                    const borderColor = isDelivery ? 'border-red-500' : isMesa ? 'border-amber-500' : 'border-emerald-500';
                    const iconBg = isDelivery ? 'bg-red-500' : isMesa ? 'bg-amber-500' : 'bg-emerald-500';

                    return (
                        <motion.div
                            role="alertdialog"
                            aria-label="Nuevo pedido recibido"
                            key={notif.id}
                            initial={{ opacity: 0, y: -100, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5, y: -20 }}
                            className={`pointer-events-auto w-full bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border-4 overflow-hidden mb-2 ${borderColor}`}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${iconBg}`}>
                                            <IconShoppingBag size={24} />
                                        </div>
                                        <div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${tagColor}`}>
                                                {tagLabel} · Nuevo Pedido
                                            </span>
                                            <h4 className="text-xl font-black text-gray-900 leading-tight">
                                                {notif.customer_name || (isMesa ? `Mesa ${notif.table_id}` : 'Cliente')}
                                            </h4>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                                        aria-label="Dejar este pedido para después"
                                        className="text-gray-300 hover:text-gray-900 transition-colors"
                                    >
                                        <IconX size={20} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 mb-4">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">ID: {notif.id.slice(0, 8)}</span>
                                    <span className="text-lg font-black text-gray-900">${Number(notif.total).toLocaleString('es-AR')}</span>
                                </div>

                                <div className="mb-4 max-h-[35dvh] overflow-y-auto rounded-2xl border border-gray-100 p-3" aria-label="Productos del pedido">
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Lo que pidieron</p>
                                    {Array.isArray(notif.items) && notif.items.some((item: any) => !item.is_meta) ? (
                                        <ul className="space-y-3">
                                            {notif.items.filter((item: any) => !item.is_meta).map((item: any, index: number) => (
                                                <li key={`${item.id || item.name}-${index}`} className="flex items-start gap-3 text-sm">
                                                    <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 font-bold text-gray-900">{Number(item.quantity) || 1}×</span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="break-words font-semibold text-gray-900">{item.name || 'Producto'}</p>
                                                        {item.notes && <p className="mt-1 break-words text-xs text-gray-600">{String(item.notes)}</p>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="text-sm text-gray-500">Abrí el pedido para consultar el detalle.</p>}
                                    {notif.notes && <p className="mt-3 border-t border-gray-100 pt-2 text-sm text-gray-600"><strong>Nota:</strong> {String(notif.notes)}</p>}
                                </div>

                                <button
                                    onClick={() => handleAccept(notif)}
                                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg text-white ${iconBg}`}
                                >
                                    Aceptar y abrir pedido <IconChevronRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
            
            {notifications.length > 1 && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-black text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl mt-2"
                >
                    +{notifications.length - 1} pedidos adicionales
                </motion.div>
            )}
        </div>
    );
}
