"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconCalendar, IconClock, IconUsers, IconUser, IconPhone, IconMessage, IconCircleCheck } from "@tabler/icons-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SiteFooter } from "@/components/SiteFooter";
import { FoodKingMobileNavPanel } from "@/components/FoodKingMobileNav";
import { SiteHeader } from "@/components/SiteHeader";

const HORARIOS = [
    "08:00", "08:30", "09:00", "09:30",
    "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30",
    "20:00", "20:30",
];

const PERSONAS = [1, 2, 3, 4, 5, 6, 7, 8];

function getTodayStr() {
    return new Date().toISOString().split("T")[0];
}

export default function ReservationsPage() {
    const supabase = createClient();

    const [form, setForm] = useState({
        name: "",
        phone: "",
        date: "",
        time: "",
        guests: 2,
        notes: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const set = (key: string, val: any) => {
        setForm(f => ({ ...f, [key]: val }));
        setErrors(e => ({ ...e, [key]: "" }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = "Ingresá tu nombre";
        if (!form.phone.trim()) e.phone = "Ingresá tu teléfono";
        if (!form.date) e.date = "Elegí una fecha";
        if (!form.time) e.time = "Elegí un horario";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        const { error } = await supabase.from("reservations").insert({
            customer_name: form.name,
            customer_phone: form.phone,
            date: form.date,
            time: form.time,
            guests: form.guests,
            notes: form.notes,
            status: "PENDING",
        });
        setLoading(false);
        if (error) {
            console.error(error);
            return;
        }
        setSent(true);
    };

    return (
        <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
            <FoodKingMobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
            <SiteHeader
                scrolled={scrolled}
                onMobileNavOpen={() => setMobileNavOpen(true)}
                activeNav="reservations"
            />

            <main className="flex-1 max-w-lg mx-auto w-full px-5 py-10">
                <AnimatePresence mode="wait">
                    {sent ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center text-center py-20 gap-5"
                        >
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                                <IconCircleCheck size={44} className="text-green-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 mb-2">¡Reserva recibida!</h2>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    Te confirmamos por teléfono a la brevedad.<br />
                                    <span className="font-bold text-gray-700">{form.date} a las {form.time}</span> · {form.guests} {form.guests === 1 ? "persona" : "personas"}
                                </p>
                            </div>
                            <Link href="/menu">
                                <button className="mt-4 px-8 py-3 bg-bloom-600 hover:bg-bloom-600 text-white font-bold rounded-2xl transition-colors">
                                    Ver el Menú
                                </button>
                            </Link>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Hacé tu reserva</h2>
                                <p className="text-gray-400 text-sm mt-1">Te confirmamos disponibilidad a la brevedad.</p>
                            </div>

                            {/* Nombre */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <IconUser size={13} /> Nombre
                                </label>
                                <input
                                    type="text"
                                    placeholder="Tu nombre completo"
                                    value={form.name}
                                    onChange={e => set("name", e.target.value)}
                                    className={`w-full px-4 py-3.5 rounded-2xl border-2 bg-white text-gray-900 font-medium placeholder-gray-300 outline-none transition-colors focus:border-bloom-500 ${errors.name ? "border-red-400" : "border-gray-100"}`}
                                />
                                {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                            </div>

                            {/* Teléfono */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <IconPhone size={13} /> Teléfono
                                </label>
                                <input
                                    type="tel"
                                    placeholder="Tu número de WhatsApp"
                                    value={form.phone}
                                    onChange={e => set("phone", e.target.value)}
                                    className={`w-full px-4 py-3.5 rounded-2xl border-2 bg-white text-gray-900 font-medium placeholder-gray-300 outline-none transition-colors focus:border-bloom-500 ${errors.phone ? "border-red-400" : "border-gray-100"}`}
                                />
                                {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                            </div>

                            {/* Fecha */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <IconCalendar size={13} /> Fecha
                                </label>
                                <input
                                    type="date"
                                    min={getTodayStr()}
                                    value={form.date}
                                    onChange={e => set("date", e.target.value)}
                                    className={`w-full px-4 py-3.5 rounded-2xl border-2 bg-white text-gray-900 font-medium outline-none transition-colors focus:border-bloom-500 ${errors.date ? "border-red-400" : "border-gray-100"}`}
                                />
                                {errors.date && <p className="text-red-500 text-xs">{errors.date}</p>}
                            </div>

                            {/* Horario */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <IconClock size={13} /> Horario
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {HORARIOS.map(h => (
                                        <button
                                            key={h}
                                            onClick={() => set("time", h)}
                                            className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.time === h
                                                ? "border-bloom-600 bg-bloom-50 text-bloom-700"
                                                : "border-gray-100 bg-white text-gray-600 hover:border-bloom-200"
                                            }`}
                                        >
                                            {h}
                                        </button>
                                    ))}
                                </div>
                                {errors.time && <p className="text-red-500 text-xs">{errors.time}</p>}
                            </div>

                            {/* Personas */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <IconUsers size={13} /> Personas
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {PERSONAS.map(n => (
                                        <button
                                            key={n}
                                            onClick={() => set("guests", n)}
                                            className={`w-12 h-12 rounded-2xl text-base font-black border-2 transition-all ${form.guests === n
                                                ? "border-bloom-600 bg-bloom-600 text-white"
                                                : "border-gray-100 bg-white text-gray-600 hover:border-bloom-200"
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notas */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <IconMessage size={13} /> Aclaraciones <span className="font-normal normal-case text-gray-300">(opcional)</span>
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Alergias, cumpleaños, lugar preferido..."
                                    value={form.notes}
                                    onChange={e => set("notes", e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-white text-gray-900 font-medium placeholder-gray-300 outline-none transition-colors focus:border-bloom-500 resize-none"
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full bg-bloom-600 hover:bg-bloom-600 active:scale-[0.98] text-white font-black text-lg py-4 rounded-2xl transition-all shadow-lg shadow-bloom-200 disabled:opacity-50"
                            >
                                {loading ? "Enviando..." : "Confirmar Reserva"}
                            </button>

                            <p className="text-center text-xs text-gray-400 pb-4">
                                Almirante Brown 2005, Mar del Plata · Lun–Sáb 8 a 21hs
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <SiteFooter />
        </div>
    );
}
