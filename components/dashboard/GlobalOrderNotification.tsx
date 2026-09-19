"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { IconShoppingBag, IconChevronRight, IconX } from "@tabler/icons-react";
import { useRouter, usePathname } from "next/navigation";

import { soundAlerts } from "@/lib/audio/sound-alerts";

export function GlobalOrderNotification() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const channel = supabase
            .channel('global_orders_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                const newOrder = payload.new as any;
                // Debería ser web y pendiente
                if (newOrder.status === 'pending' && (!newOrder.table_id || newOrder.order_type === 'web')) {
                    soundAlerts.playOrderAlert();
                    setNotifications(prev => [...prev, newOrder]);
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                const newOrder = payload.new as any;
                const oldOrder = payload.old as any;
                // Mercado Pago auto-confirm
                if (newOrder.status === 'pending' && oldOrder.status === 'pending_payment') {
                    soundAlerts.playOrderAlert();
                    setNotifications(prev => {
                        if (prev.find(n => n.id === newOrder.id)) return prev;
                        return [...prev, newOrder];
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const playNotificationSound = () => {
        soundAlerts.playOrderAlert();
    };

    const handleAccept = (notif: any) => {
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
        if (pathname === '/dashboard/tables') {
            // Ya estamos en mesas: disparar evento para que refresque
            window.dispatchEvent(new CustomEvent('bloom-refresh-tables'));
        } else {
            router.push('/dashboard/tables');
        }
    };

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex flex-col items-center pointer-events-none w-full max-w-sm">
            <AnimatePresence>
                {notifications.map((notif, idx) => {
                    const isDelivery = notif.delivery_type === 'delivery' || (!notif.delivery_type && notif.order_type === 'web');
                    return (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, y: -100, scale: 0.8 }}
                            animate={{ opacity: 1, y: idx * 10, scale: 1 - (idx * 0.05) }}
                            exit={{ opacity: 0, scale: 0.5, y: -20 }}
                            className={`pointer-events-auto w-full bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border-4 overflow-hidden mb-2 ${
                                isDelivery ? 'border-red-500' : 'border-emerald-500'
                            }`}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${isDelivery ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                            <IconShoppingBag size={24} />
                                        </div>
                                        <div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDelivery ? 'text-red-500' : 'text-emerald-500'}`}>
                                                Nuevo Pedido Web
                                            </span>
                                            <h4 className="text-xl font-black text-gray-900 leading-tight">
                                                {notif.customer_name || 'Nuevo Cliente'}
                                            </h4>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                                        className="text-gray-300 hover:text-gray-900 transition-colors"
                                    >
                                        <IconX size={20} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 mb-4">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">ID: {notif.id.slice(0, 8)}</span>
                                    <span className="text-lg font-black text-gray-900">${Number(notif.total).toLocaleString()}</span>
                                </div>

                                <button
                                    onClick={() => handleAccept(notif)}
                                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                                        isDelivery ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'
                                    }`}
                                >
                                    Ir a Gestionar <IconChevronRight size={16} />
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
