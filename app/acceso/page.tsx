"use client";

import { useState } from "react";
import { IconLoader2, IconEye, IconEyeOff, IconArrowLeft, IconBrandGoogle } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";

const GREEN = "#2d4a3e";
const CREAM = "#F5EDD8";

export default function AccesoPage() {
    const supabase = createClient();

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!identifier.trim()) { setError("Ingresá tu teléfono o email."); return; }
        if (!password.trim()) { setError("Ingresá tu contraseña."); return; }

        setLoading(true);

        const raw = identifier.trim();
        const isPhone = /^[\d\s\-\+\(\)]+$/.test(raw) && raw.replace(/\D/g, "").length >= 6;
        const phoneClean = raw.replace(/\D/g, "");

        const { data, error: authError } = isPhone
            ? await supabase.auth.signInWithPassword({ phone: phoneClean, password: password.trim() })
            : await supabase.auth.signInWithPassword({ email: raw.toLowerCase(), password: password.trim() });

        if (authError || !data.user) {
            setError("Datos incorrectos. Verificá teléfono/email y contraseña.");
            setLoading(false);
            return;
        }

        const { data: profile } = await supabase
            .from("profiles").select("role").eq("id", data.user.id).single();

        const isStaff = ["ADMIN", "WAITER", "KITCHEN", "MANAGER"].includes(profile?.role);
        window.location.replace(isStaff ? "/dashboard" : "/menu");
    };

    const continueWithGoogle = async () => {
        setError("");
        setGoogleLoading(true);
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/registro-google`,
            },
        });

        if (oauthError) {
            setError("No pudimos iniciar Google. Intentá de nuevo.");
            setGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: CREAM }}>
            <div className="w-full max-w-[400px]">
                <button
                    type="button"
                    onClick={() => window.location.replace("/menu")}
                    className="mb-4 inline-flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur-sm px-3.5 py-2 text-xs font-bold text-[#1a3028] shadow-sm border border-neutral-200 hover:bg-white transition-all active:scale-95 cursor-pointer"
                >
                    <IconArrowLeft size={16} strokeWidth={2.5} />
                    <span>Volver al Menú</span>
                </button>

                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-md" style={{ backgroundColor: GREEN }}>
                        ☕
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-neutral-900">Ingresar</h1>
                    <p className="mt-1 text-sm font-medium text-neutral-500">Bloom</p>
                </div>

                <div className="rounded-3xl border border-black/[0.07] bg-white p-8 shadow-xl">
                    <button
                        type="button"
                        onClick={() => void continueWithGoogle()}
                        disabled={googleLoading || loading}
                        className="flex min-h-[54px] w-full items-center justify-center gap-3 rounded-2xl border-2 border-neutral-200 bg-white text-[16px] font-black text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60"
                    >
                        {googleLoading ? <IconLoader2 className="h-5 w-5 animate-spin" /> : <IconBrandGoogle className="h-5 w-5 text-[#4285F4]" />}
                        Continuar con Google
                    </button>

                    <div className="my-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        <span className="h-px flex-1 bg-neutral-200" />
                        o ingresá con tu cuenta
                        <span className="h-px flex-1 bg-neutral-200" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[14px] font-bold text-neutral-700 mb-1.5">Email</label>
                            <input
                                type="text"
                                autoComplete="username"
                                placeholder="tu@email.com o teléfono"
                                value={identifier}
                                onChange={e => { setIdentifier(e.target.value); setError(""); }}
                                className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 text-[16px] font-semibold outline-none placeholder:text-neutral-300 placeholder:font-normal focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/25 transition-all"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-[14px] font-bold text-neutral-700 mb-1.5">Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPwd ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(""); }}
                                    className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 pr-12 text-[16px] font-semibold outline-none placeholder:text-neutral-300 focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/25 transition-all"
                                />
                                <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                                    {showPwd ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex min-h-[54px] w-full items-center justify-center rounded-2xl text-[16px] font-black text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
                            style={{ backgroundColor: GREEN }}
                        >
                            {loading ? <IconLoader2 className="h-5 w-5 animate-spin" /> : "INGRESAR →"}
                        </button>
                    </form>

                    <div className="mt-6 border-t border-neutral-100 pt-5 text-center">
                        <p className="text-[13px] font-medium text-neutral-500">
                            ¿No tenés cuenta?{" "}
                            <a href="/registro" className="font-bold underline underline-offset-2" style={{ color: GREEN }}>
                                Registrate gratis
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
