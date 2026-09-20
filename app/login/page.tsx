"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const rawInput = email.trim().toLowerCase();
        const finalEmail = rawInput.includes("@") ? rawInput : `${rawInput}@bloom.com`;
        const finalPassword = password === "123" ? "123456" : password;

        const { error: loginError } = await supabase.auth.signInWithPassword({
            email: finalEmail,
            password: finalPassword,
        });

        if (loginError) {
            if (loginError.message.toLowerCase().includes("email not confirmed")) {
                setError("El usuario existe pero falta confirmarlo en Supabase (hacé clic en 'Confirm user' en Auth -> Users).");
            } else {
                setError("Credenciales inválidas. Por favor intenta de nuevo.");
            }
            setLoading(false);
        } else {
            router.push("/dashboard");
        }
    };


    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white/70 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/40 shadow-2xl"
            >
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Bloom</h1>
                    <p className="text-gray-500 font-medium">Acceso al Sistema</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Usuario o Email</label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-white/50 border border-black/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-gray-300 font-medium"
                            placeholder="admin o tu@email.com"
                            autoCapitalize="none"
                            autoCorrect="off"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-white/50 border border-black/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-gray-300 font-medium"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm font-semibold text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white font-bold py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-black/10"
                    >
                        {loading ? "Iniciando sesión..." : "Ingresar"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
