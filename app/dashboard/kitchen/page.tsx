"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useKitchenTickets } from "@/lib/hooks/use-pos-data";
import { motion, AnimatePresence } from "framer-motion";
import { 
    IconClock, 
    IconCircleCheck, 
    IconChevronRight, 
    IconToolsKitchen, 
    IconMessage, 
    IconLoader2,
    IconPrinter,
    IconVolume,
    IconVolumeOff
} from "@tabler/icons-react";
import { soundAlerts } from "@/lib/audio/sound-alerts";
import { printKitchenTicket } from "@/lib/printer/kitchen-print";
import { toast } from "sonner";

type KitchenTicket = {
    id: string;
    table_id: number;
    items: { name: string; quantity: number; notes?: string }[];
    status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED';
    notes?: string;
    created_at: string;
};

export default function KitchenPage() {
    const queryClient = useQueryClient();
    const { data: tickets = [], isLoading } = useKitchenTickets();
    const supabase = createClient();
    const [estTime, setEstTime] = useState<number>(15);

    // Auto-print & Sound preferences
    const [autoPrint, setAutoPrint] = useState<boolean>(false);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

    const autoPrintRef = useRef(autoPrint);
    const soundEnabledRef = useRef(soundEnabled);

    useEffect(() => {
        autoPrintRef.current = autoPrint;
    }, [autoPrint]);

    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
    }, [soundEnabled]);

    useEffect(() => {
        const savedAutoPrint = localStorage.getItem("bloom_autoprint_kitchen");
        if (savedAutoPrint !== null) {
            setAutoPrint(savedAutoPrint === "true");
        }
        const savedSound = localStorage.getItem("bloom_sound_kitchen");
        if (savedSound !== null) {
            setSoundEnabled(savedSound === "true");
        }
    }, []);

    const toggleAutoPrint = () => {
        setAutoPrint(prev => {
            const next = !prev;
            localStorage.setItem("bloom_autoprint_kitchen", String(next));
            if (next) {
                toast.success("🖨️ Auto-impresión activada", {
                    description: "Las nuevas comandas se enviarán directo a la impresora térmica."
                });
            } else {
                toast.info("🖨️ Auto-impresión desactivada", {
                    description: "Podrás imprimir cada comanda manualmente."
                });
            }
            return next;
        });
    };

    const toggleSound = () => {
        setSoundEnabled(prev => {
            const next = !prev;
            localStorage.setItem("bloom_sound_kitchen", String(next));
            if (next) {
                soundAlerts.playKitchenChime();
                toast.success("🔔 Sonido de comandas activado");
            } else {
                toast.info("🔕 Sonido de comandas silenciado");
            }
            return next;
        });
    };

    const handleTestSound = () => {
        soundAlerts.playKitchenChime();
        toast.info("🔔 Sonando timbre de cocina");
    };

    // AI Prep Time Heuristic
    useEffect(() => {
        const activeTicketsCount = tickets.filter((t: KitchenTicket) => t.status !== 'DELIVERED').length;
        setEstTime(10 + Math.min(activeTicketsCount * 2, 40));
    }, [tickets]);

    useEffect(() => {
        // Subscribe to real-time changes with Optimistic Updates & Alerts
        const channel = supabase
            .channel('kitchen_realtime')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'kitchen_tickets' },
                (payload) => {
                    queryClient.setQueryData(['kitchen_tickets'], (oldTickets: KitchenTicket[] = []) => {
                        if (payload.eventType === 'INSERT') {
                            const newTicket = payload.new as KitchenTicket;

                            // 1. Sonido campana de cocina
                            if (soundEnabledRef.current) {
                                soundAlerts.playKitchenChime();
                            }

                            // 2. Toast aviso cocina
                            toast.success(`¡Nueva Comanda! Mesa ${newTicket.table_id || 'Mostrador'}`, {
                                description: `${newTicket.items?.length || 0} ítems pedidos`,
                                duration: 8000
                            });

                            // 3. Auto-impresión térmica directa si está habilitada
                            if (autoPrintRef.current) {
                                printKitchenTicket(newTicket);
                            }

                            return [...oldTickets, newTicket];
                        } else if (payload.eventType === 'UPDATE') {
                            const updated = payload.new as KitchenTicket;
                            if (updated.status === 'DELIVERED') {
                                return oldTickets.filter(t => t.id !== updated.id);
                            }
                            return oldTickets.map(t => t.id === updated.id ? updated : t);
                        } else if (payload.eventType === 'DELETE') {
                            return oldTickets.filter(t => t.id !== payload.old.id);
                        }
                        return oldTickets;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, supabase]);

    async function updateStatus(id: string, currentStatus: string) {
        const statusMap: Record<string, string> = {
            'PENDING': 'PREPARING',
            'PREPARING': 'READY',
            'READY': 'DELIVERED'
        };

        const nextStatus = statusMap[currentStatus];
        if (!nextStatus) return;

        await supabase
            .from('kitchen_tickets')
            .update({ status: nextStatus })
            .eq('id', id);
    }

    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-10 font-black uppercase tracking-widest text-gray-400 gap-4">
            <IconLoader2 className="animate-spin text-[#FFD60A]" size={48} />
            Cargando Cocina...
        </div>
    );

    return (
        <div className="p-4 sm:p-8 bg-crema min-h-screen">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-piedra uppercase">Panel de Cocina</h1>
                    <p className="text-gris font-bold uppercase text-[11px] tracking-widest mt-2 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                        Comandas en Vivo • {tickets.length} órdenes activas
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Botón Auto-impresión Térmica */}
                    <button
                        onClick={toggleAutoPrint}
                        className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm border ${
                            autoPrint 
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/20' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                        title="Imprimir comanda automáticamente al entrar un nuevo pedido"
                    >
                        <IconPrinter size={18} />
                        Auto-imprimir: {autoPrint ? 'ON' : 'OFF'}
                    </button>

                    {/* Botón Sonido / Silencio */}
                    <button
                        onClick={toggleSound}
                        className={`px-3 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all border ${
                            soundEnabled
                                ? 'bg-white text-piedra border-gray-200 hover:bg-gray-50'
                                : 'bg-gray-200 text-gray-500 border-gray-300'
                        }`}
                        title={soundEnabled ? "Desactivar timbre sonoro" : "Activar timbre sonoro"}
                    >
                        {soundEnabled ? <IconVolume size={18} className="text-emerald-600" /> : <IconVolumeOff size={18} />}
                    </button>

                    {/* Botón Probar Sonido */}
                    <button
                        onClick={handleTestSound}
                        className="px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider bg-white/80 hover:bg-white text-gray-700 border border-gray-200 flex items-center gap-1.5 transition-all"
                    >
                        🔔 Probar Timbre
                    </button>

                    {/* Espera Estimada */}
                    <div className="bg-white px-5 py-3 rounded-2xl font-black shadow-sm border border-chocolate/5 flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[10px] text-gris uppercase tracking-widest"><IconClock size={12} /> Demora:</span>
                        <span className="text-xl font-black text-piedra">{estTime} min</span>
                    </div>

                    <div className="bg-chocolate text-crema px-5 py-3 rounded-2xl font-black flex items-center gap-2 shadow-sm text-sm">
                        <IconToolsKitchen size={20} />
                        Cocina Bloom
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {tickets.map((ticket: KitchenTicket) => (
                        <motion.div
                            key={ticket.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: -50 }}
                            className={`bg-white rounded-[2.5rem] p-6 sm:p-7 shadow-sm border-2 transition-all flex flex-col justify-between ${
                                ticket.status === 'READY' ? 'border-green-500 bg-green-50/20' :
                                ticket.status === 'PREPARING' ? 'border-bloom-500 bg-bloom-50/20' :
                                'border-transparent shadow-xl hover:shadow-chocolate/10'
                            }`}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-piedra text-crema rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner">
                                            {ticket.table_id ? ticket.table_id : 'W'}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl text-piedra">
                                                {ticket.table_id ? `Mesa ${ticket.table_id}` : 'Pedido Web / Retiro'}
                                            </h3>
                                            <p className="text-[10px] font-black text-gris uppercase tracking-widest flex items-center gap-1">
                                                <IconClock size={12} />
                                                {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-center min-w-[95px] leading-tight flex items-center justify-center ${
                                        ticket.status === 'READY' ? 'bg-green-500 text-white' :
                                        ticket.status === 'PREPARING' ? 'bg-amber-500 text-white' :
                                        'bg-gray-100 text-gray-500'
                                    }`}>
                                        {ticket.status === 'PENDING' ? 'Pendiente' :
                                         ticket.status === 'PREPARING' ? 'Preparando' : '¡Listo!'}
                                    </span>
                                </div>

                                <div className="space-y-3 mb-6">
                                    {ticket.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-50/70 p-3.5 rounded-2xl border border-chocolate/5 gap-3">
                                            <div className="flex-1">
                                                <span className="font-extrabold text-piedra leading-tight text-sm block">{item.name}</span>
                                                {item.notes && (
                                                    <span className="text-[11px] text-amber-700 italic font-semibold mt-0.5 block">↳ {item.notes}</span>
                                                )}
                                            </div>
                                            <span className="bg-chocolate text-crema w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0">
                                                {item.quantity}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {ticket.notes && (
                                    <div className="mb-6 p-3.5 bg-yellow-50 rounded-2xl border border-yellow-200 flex gap-2.5">
                                        <IconMessage size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                                        <p className="text-xs font-bold text-yellow-900 leading-snug">{ticket.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 pt-2">
                                {/* Botón Imprimir Ticket */}
                                <button
                                    onClick={() => printKitchenTicket(ticket)}
                                    className="w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider bg-gray-100 hover:bg-gray-200 text-piedra flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    title="Imprimir comanda en impresora térmica 80mm"
                                >
                                    <IconPrinter size={16} /> Imprimir Comanda
                                </button>

                                {/* Botón Estado */}
                                <button
                                    onClick={() => updateStatus(ticket.id, ticket.status)}
                                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 px-4 text-center text-sm ${
                                        ticket.status === 'READY' ? 'bg-green-600 text-white hover:bg-green-700' :
                                        ticket.status === 'PREPARING' ? 'bg-chocolate text-crema hover:opacity-90' :
                                        'bg-piedra text-crema hover:opacity-90'
                                    }`}
                                >
                                    {ticket.status === 'PENDING' && (
                                        <> <IconClock size={18} /> Empezar </>
                                    )}
                                    {ticket.status === 'PREPARING' && (
                                        <> <IconCircleCheck size={18} /> ¡Listo para Servir! </>
                                    )}
                                    {ticket.status === 'READY' && (
                                        <> <IconChevronRight size={18} /> Marcar Entregado </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {tickets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-30 text-gris">
                    <IconToolsKitchen size={90} />
                    <p className="text-xl font-black uppercase tracking-widest">Sin Comandas Pendientes</p>
                </div>
            )}
        </div>
    );
}
