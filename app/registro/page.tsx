"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2 } from "@tabler/icons-react";
import { PhoneInput } from "@/components/ui/PhoneInput";

const GREEN = "#2d4a3e";
const GOLD = "#c9a84c";
const CREAM = "#F5EDD8";

const MESES = [
    { value: "01", label: "Enero" }, { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" }, { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" }, { value: "06", label: "Junio" },
    { value: "07", label: "Julio" }, { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" }, { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
];

function birthdateISO(day: string, month: string, year: string): string | null {
    if (!day || !month || !year) return null;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return `${y}-${month}-${String(d).padStart(2, "0")}`;
}

const inputClass = "w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 text-[16px] font-semibold outline-none placeholder:font-medium placeholder:text-neutral-400 focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/25 transition-all";
const selectClass = "w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 text-[16px] font-semibold outline-none appearance-none focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/25 transition-all";

export default function RegistroPage() {
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [birthDay, setBirthDay] = useState("");
    const [birthMonth, setBirthMonth] = useState("");
    const [birthYear, setBirthYear] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [customerNumber, setCustomerNumber] = useState("");

    const years = useMemo(() => {
        const y = new Date().getFullYear();
        const list: number[] = [];
        for (let yy = y - 13; yy >= y - 100; yy--) list.push(yy);
        return list;
    }, []);

    const days = useMemo(() => {
        const md = birthMonth ? parseInt(birthMonth, 10) : 12;
        const yy = birthYear ? parseInt(birthYear, 10) : 2024;
        return Array.from({ length: new Date(yy, md, 0).getDate() }, (_, i) => String(i + 1));
    }, [birthMonth, birthYear]);

    const goStep2 = () => {
        if (!fullName.trim()) { setError("Ingresá tu nombre."); return; }
        setError("");
        setStep(2);
    };

    const submit = async () => {
        if (!phone.trim()) { setError("Ingresá tu número de WhatsApp."); return; }
        setError("");
        setLoading(true);

        const bd = birthdateISO(birthDay, birthMonth, birthYear);

        try {
            const res = await fetch("/api/auth/register-phone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim(), birthdate: bd }),
            });
            const json = await res.json() as { customer_number?: string; name?: string; error?: string };

            if (!res.ok) {
                if (json.error === "already_exists") {
                    setError("Ese número ya tiene una cuenta. Entrá con tu número de socio.");
                } else {
                    setError(json.error ?? "Error al registrarse. Intentá de nuevo.");
                }
                return;
            }

            setCustomerNumber(json.customer_number ?? "");
            setStep(3);
        } catch {
            setError("Error de conexión. Intentá de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    if (step === 3) {
        return (
            <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: GREEN }}>
                <div className="w-full max-w-[420px] text-center">
                    <div className="text-6xl mb-6">☕</div>
                    <h1 className="text-3xl font-black text-white mb-2">
                        ¡Bienvenido, {fullName.split(" ")[0]}!
                    </h1>
                    <p className="text-white/80 text-base font-medium mb-8">Ya sos socio del Club Bloom</p>

                    <div className="rounded-3xl bg-white p-8 shadow-2xl mb-6">
                        <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3">Tu número de socio</p>
                        <div className="text-5xl font-black tracking-[0.15em] mb-4" style={{ color: GREEN }}>
                            {customerNumber}
                        </div>
                        <p className="text-[13px] font-medium text-neutral-500 leading-relaxed">
                            Guardá este número. Lo vas a necesitar junto con tu teléfono para entrar a tu cuenta.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-left mb-8">
                        <p className="text-white font-bold text-sm mb-1">Para ingresar a tu cuenta:</p>
                        <p className="text-white/80 text-sm">👤 Usuario: <span className="font-bold text-white">{phone}</span></p>
                        <p className="text-white/80 text-sm">🔑 Contraseña: <span className="font-bold text-white">{phone}</span></p>
                    </div>

                    <button
                        onClick={() => router.push("/acceso")}
                        className="w-full min-h-[54px] rounded-2xl text-[16px] font-black text-white shadow-md transition hover:opacity-90"
                        style={{ backgroundColor: GOLD }}
                    >
                        INGRESAR A MI CUENTA →
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: CREAM }}>
            <section className="px-6 py-12 text-center" style={{ backgroundColor: GREEN }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD }}>
                    Programa de lealtad
                </p>
                <h1 className="mt-4 text-[clamp(1.8rem,5vw,3rem)] font-black leading-tight text-white">
                    Sumate al Club Bloom
                </h1>
                <p className="mt-3 text-[15px] font-medium text-white/80 max-w-sm mx-auto">
                    Sumá puntos con cada pedido. Café gratis cada 10 encargos.
                </p>
            </section>

            <section className="flex flex-1 flex-col items-center px-4 py-10">
                <div className="w-full max-w-[440px] rounded-3xl border border-black/[0.08] bg-white p-8 shadow-xl">
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {[1, 2].map((n) => (
                            <span
                                key={n}
                                className="h-3 w-3 rounded-full transition-colors duration-300"
                                style={{ backgroundColor: step >= n ? GREEN : "#c9a84c70" }}
                            />
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="space-y-5">
                            <h2 className="text-xl font-black text-neutral-900">¿Cómo te llamás?</h2>

                            <input
                                type="text"
                                autoComplete="name"
                                placeholder="Tu nombre completo"
                                value={fullName}
                                onChange={(e) => { setFullName(e.target.value); setError(""); }}
                                className={inputClass}
                            />

                            <fieldset className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4">
                                <legend className="px-1 text-[15px] font-bold text-neutral-800">
                                    🎂 ¿Cuándo es tu cumpleaños? <span className="font-medium text-neutral-400 text-[13px]">(opcional)</span>
                                </legend>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="relative">
                                        <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)} className={selectClass} aria-label="Día">
                                            <option value="">Día</option>
                                            {days.map((d) => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">▼</span>
                                    </div>
                                    <div className="relative">
                                        <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} className={selectClass} aria-label="Mes">
                                            <option value="">Mes</option>
                                            {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                        </select>
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">▼</span>
                                    </div>
                                    <div className="relative">
                                        <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className={selectClass} aria-label="Año">
                                            <option value="">Año</option>
                                            {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
                                        </select>
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">▼</span>
                                    </div>
                                </div>
                            </fieldset>

                            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700">{error}</p>}

                            <button
                                type="button"
                                onClick={goStep2}
                                className="flex min-h-[52px] w-full items-center justify-center rounded-2xl text-[16px] font-black text-white shadow-md transition hover:opacity-90"
                                style={{ backgroundColor: GREEN }}
                            >
                                Continuar →
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-xl font-black text-neutral-900">Tu número de WhatsApp</h2>
                                <p className="text-[14px] font-medium text-neutral-500 mt-1">Este va a ser tu usuario para ingresar</p>
                            </div>

                            <PhoneInput
                                value={phone}
                                onChange={(v) => { setPhone(v); setError(""); }}
                                error={!!error}
                            />

                            {error && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700">
                                    {error}{" "}
                                    {error.includes("ya tiene") && (
                                        <a href="/acceso" className="underline">Entrar →</a>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={submit}
                                disabled={loading}
                                className="flex min-h-[52px] w-full items-center justify-center rounded-2xl text-[16px] font-black text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
                                style={{ backgroundColor: GREEN }}
                            >
                                {loading ? <IconLoader2 className="h-5 w-5 animate-spin" /> : "CREAR MI CUENTA →"}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStep(1); setError(""); }}
                                className="w-full text-center text-[14px] font-semibold text-neutral-400 hover:text-neutral-700"
                            >
                                ← Volver
                            </button>
                        </div>
                    )}

                    <div className="mt-6 border-t border-neutral-100 pt-5 text-center">
                        <p className="text-[13px] font-medium text-neutral-500">
                            ¿Ya tenés cuenta?{" "}
                            <a href="/acceso" className="font-bold underline underline-offset-2" style={{ color: GREEN }}>
                                Ingresá acá
                            </a>
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
