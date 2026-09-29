"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { IconUserPlus, IconTrash, IconMail, IconUser, IconCoffee, IconLoader2 } from "@tabler/icons-react";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useEscape } from "@/lib/hooks/useEscape";

export default function StaffPage() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isAddingDelivery, setIsAddingDelivery] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [newStaff, setNewStaff] = useState({ email: "", phone: "", fullName: "", role: "WAITER" });
    const [newDelivery, setNewDelivery] = useState({ name: "" });

    const supabase = createClient();

    useEscape(() => {
        setIsAdding(false);
        setIsAddingDelivery(false);
        setDeleteId(null);
    });

    useEffect(() => {
        fetchEverything();
    }, []);

    async function fetchEverything() {
        setLoading(true);
        setError(null);
        
        // Fetch staff profiles (excluding customers)
        const { data: pData, error: pErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_customer', false)
            .order('role', { ascending: true });

        // Fetch delivery persons
        const dResp = await fetch('/api/delivery-persons');
        const dData = await dResp.json();

        if (!pErr) setProfiles(pData || []);
        if (Array.isArray(dData)) setDeliveries(dData);
        
        setLoading(false);
    }

    async function handleAddStaff(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStaff)
            });

            const result = await res.json();

            if (res.ok) {
                setIsAdding(false);
                setNewStaff({ email: "", phone: "", fullName: "", role: "WAITER" });
                fetchEverything();
            } else {
                if (result.message?.includes("IconUser already registered")) {
                    setError("Este email ya está registrado.");
                } else if (result.message?.includes("Password should be")) {
                    setError("La contraseña debe tener al menos 6 caracteres.");
                } else {
                    setError(result.message || "Error al crear el usuario.");
                }
            }
        } catch {
            setError("Error de conexión con el servidor.");
        }
        setLoading(false);
    }

    async function confirmDelete() {
        if (!deleteId) return;
        setDeleteId(null);
        setLoading(true);
        try {
            const res = await fetch(`/api/staff?id=${deleteId}`, { method: 'DELETE' });
            const result = await res.json();
            if (res.ok) {
                fetchEverything();
            } else {
                setError(`Error: ${result.message}`);
                setLoading(false);
            }
        } catch {
            setError("Error de conexión");
            setLoading(false);
        }
    }

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-gray-900">Personal</h2>
                    <p className="text-gray-500 font-medium">Gestiona tu equipo y su desempeño</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-black text-white px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20"
                >
                    <IconUserPlus size={18} />
                    <span>Registrar Nuevo</span>
                </button>
            </div>

            {error && !isAdding && (
                <div className="bg-red-50 text-red-600 p-5 rounded-3xl mb-8 border border-red-100 text-sm font-bold flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {error}
                </div>
            )}

            {loading && profiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <IconLoader2 className="animate-spin text-gray-200" size={48} />
                    <p className="text-gray-400 font-medium italic">Sincronizando equipo...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {profiles.map((profile) => (
                        <motion.div
                            key={profile.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/70 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/40 shadow-xl hover:shadow-2xl transition-all group overflow-hidden relative"
                        >
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100 group-hover:scale-110 transition-transform">
                                        <IconUser size={32} />
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${profile.role === 'ADMIN'
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-400 border-gray-100'
                                        }`}>
                                        {profile.role}
                                    </span>
                                </div>

                                <h4 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">{profile.full_name || "Sin nombre"}</h4>
                                <div className="flex items-center gap-2 text-gray-400 mb-8 lowercase">
                                    <IconMail size={12} />
                                    <span className="text-xs font-bold tracking-tight">{profile.email || "No sincronizado"}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50/50">
                                    <div className="bg-gray-50/50 p-4 rounded-3xl">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mesas</p>
                                        <div className="flex items-center gap-2">
                                            <IconCoffee size={14} className="text-accent" />
                                            <span className="text-xl font-black text-gray-900">{profile.orders?.[0]?.count || 0}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => setDeleteId(profile.id)}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-3xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all p-3"
                                        >
                                            <IconTrash size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-gray-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                    ))}
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            <AnimatePresence>
                {deleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-md"
                            onClick={() => setDeleteId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center"
                        >
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <IconTrash size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">¿Eliminar Empleado?</h3>
                            <p className="text-gray-500 font-medium text-sm mb-8">Esta acción no se puede deshacer.</p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 py-4 rounded-xl font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-4 rounded-xl font-black bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ADD STAFF MODAL */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                            onClick={() => setIsAdding(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white/90 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/40 shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]"
                        >
                            <h3 className="text-4xl font-black text-gray-900 mb-8 tracking-tighter">Nuevo Empleado</h3>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-5 rounded-3xl mb-8 border border-red-100 text-sm font-bold flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleAddStaff} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Nombre Completo</label>
                                    <input
                                        type="text" required
                                        value={newStaff.fullName}
                                        onChange={e => setNewStaff({ ...newStaff, fullName: e.target.value })}
                                        className="w-full bg-white/60 border border-black/5 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-black/5 outline-none font-bold"
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Email</label>
                                    <input
                                        type="email" required
                                        value={newStaff.email}
                                        onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                                        className="w-full bg-white/60 border border-black/5 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-black/5 outline-none font-bold"
                                        placeholder="personal@bloom.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Celular (será su contraseña)</label>
                                    <PhoneInput
                                        value={newStaff.phone}
                                        onChange={v => setNewStaff({ ...newStaff, phone: v })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Rol</label>
                                    <select
                                        value={newStaff.role}
                                        onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                                        className="w-full bg-white/60 border border-black/5 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-black/5 outline-none appearance-none font-black text-xs uppercase"
                                    >
                                        <option value="WAITER">🤵 Mesero</option>
                                        <option value="KITCHEN">👨‍🍳 Cocina</option>
                                        <option value="MANAGER">🔑 Encargado</option>
                                        <option value="ADMIN">🛡️ Administrador</option>
                                    </select>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="flex-1 py-5 rounded-2xl font-bold bg-white text-gray-400 hover:bg-gray-50 transition-all border border-gray-100"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] py-5 rounded-3xl font-black bg-black text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-black/20 uppercase text-xs tracking-widest"
                                    >
                                        {loading ? "Registrando..." : "Crear Perfil"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
