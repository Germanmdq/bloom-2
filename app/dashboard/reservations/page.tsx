"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconCalendar, IconClock, IconUsers, IconPhone, IconCircleCheck, IconCircleX, IconRefresh } from "@tabler/icons-react";

type Reservation = {
    id: string;
    customer_name: string;
    customer_phone: string;
    date: string;
    time: string;
    guests: number;
    notes: string;
    status: "PENDING" | "CONFIRMED" | "CANCELLED";
    created_at: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PENDING:   { label: "Pendiente",  color: "bg-yellow-100 text-yellow-700" },
    CONFIRMED: { label: "Confirmada", color: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Cancelada",  color: "bg-red-100 text-red-500" },
};

export default function ReservationsPage() {
    const supabase = createClient();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "CANCELLED">("ALL");

    const load = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("reservations")
            .select("*")
            .order("date", { ascending: true })
            .order("time", { ascending: true });
        setReservations(data ?? []);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const updateStatus = async (id: string, status: Reservation["status"]) => {
        await supabase.from("reservations").update({ status }).eq("id", id);
        setReservations(rs => rs.map(r => r.id === id ? { ...r, status } : r));
    };

    const filtered = filter === "ALL" ? reservations : reservations.filter(r => r.status === filter);
    const pending = reservations.filter(r => r.status === "PENDING").length;

    return (
        <div className="min-h-full pb-24">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Reservas</h2>
                    {pending > 0 && (
                        <p className="text-sm text-yellow-600 font-bold mt-0.5">{pending} pendiente{pending > 1 ? "s" : ""} de confirmar</p>
                    )}
                </div>
                <button onClick={load} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                    <IconRefresh size={18} className="text-gray-500" />
                </button>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {(["ALL", "PENDING", "CONFIRMED", "CANCELLED"] as const).map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${filter === s ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
                        {s === "ALL" ? "Todas" : STATUS_LABELS[s].label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-gray-400 text-sm">Cargando...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <IconCalendar size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No hay reservas</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => {
                        const st = STATUS_LABELS[r.status];
                        return (
                            <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-gray-900 text-base">{r.customer_name}</p>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                                        </div>
                                        <a href={`tel:${r.customer_phone}`} className="text-sm text-bloom-600 font-bold flex items-center gap-1 mt-0.5">
                                            <IconPhone size={13} /> {r.customer_phone}
                                        </a>
                                    </div>
                                    <div className="text-right text-sm text-gray-500 shrink-0">
                                        <p className="font-black text-gray-900 text-base flex items-center gap-1 justify-end">
                                            <IconCalendar size={15} className="text-bloom-500" />
                                            {new Date(r.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                                        </p>
                                        <p className="flex items-center gap-1 justify-end mt-0.5">
                                            <IconClock size={13} /> {r.time} · <IconUsers size={13} /> {r.guests} {r.guests === 1 ? "persona" : "personas"}
                                        </p>
                                    </div>
                                </div>

                                {r.notes && (
                                    <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl italic">
                                        {`\u201C${r.notes}\u201D`}
                                    </p>
                                )}

                                {r.status === "PENDING" && (
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => updateStatus(r.id, "CONFIRMED")}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-black transition-colors"
                                        >
                                            <IconCircleCheck size={16} /> Confirmar
                                        </button>
                                        <button
                                            onClick={() => updateStatus(r.id, "CANCELLED")}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 text-sm font-black transition-colors"
                                        >
                                            <IconCircleX size={16} /> Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
