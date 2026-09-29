"use client";
import { useState, useEffect } from "react";
import { IconUsers, IconSearch, IconLoader2, IconStar, IconTrendingUp, IconCalendar, IconArrowsUpDown, IconX, IconPhone, IconMail, IconShoppingBag, IconCircleCheck, IconAlertCircle, IconHistory, IconReceipt, IconEdit, IconDeviceFloppy, IconUserPlus, IconChevronDown } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useEscape } from "@/lib/hooks/useEscape";

export default function ClientesPage() {
    const supabase = createClient();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clientsError, setClientsError] = useState<string | null>(null);
    const [openClientGroups, setOpenClientGroups] = useState({ deuda: true, sinDeuda: false });
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"spent" | "points" | "orders" | "name">("spent");
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MERCADO_PAGO" | "SANTANDER_RIO">("CASH");
    const [resettingPwd, setResettingPwd] = useState(false);
    const [resetMsg, setResetMsg] = useState<string | null>(null);
    const [migratingPwds, setMigratingPwds] = useState(false);
    const [migrateResult, setMigrateResult] = useState<string | null>(null);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [isOrdersHistoryOpen, setIsOrdersHistoryOpen] = useState(false);

    const [showNewModal, setShowNewModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newCuit, setNewCuit] = useState("");
    const [newAddress, setNewAddress] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [createMsg, setCreateMsg] = useState<string | null>(null);

    async function handleCreateClient() {
        if (!newName.trim() || !newPhone.trim()) { setCreateMsg("Nombre y teléfono son obligatorios."); return; }
        setIsCreating(true);
        setCreateMsg(null);
        const res = await fetch('/api/auth/register-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: newName.trim(), phone: newPhone.trim(), cuit: newCuit.trim() || null, birthdate: null }),
        });
        const json = await res.json();
        if (!res.ok) {
            setCreateMsg(json.error === 'already_exists' ? 'Ya existe un cliente con ese teléfono.' : (json.error ?? 'Error al crear cliente.'));
            setIsCreating(false);
            return;
        }
        if (newAddress.trim()) {
            await supabase.from('profiles').update({ default_address: newAddress.trim() }).eq('id', json.id);
        }
        const pwd = newPhone.replace(/\D/g, '').slice(-4);
        setCreateMsg(`✓ Cliente creado. Contraseña: ${pwd}`);
        setIsCreating(false);
        setNewName(""); setNewPhone(""); setNewCuit(""); setNewAddress("");
        fetchClients();
    }

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editCuit, setEditCuit] = useState("");
    const [editBirthdate, setEditBirthdate] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);

    useEffect(() => { fetchClients(); }, []);

    useEscape(() => {
        setSelectedClient(null);
        setShowNewModal(false);
        setIsPaying(false);
        setIsEditing(false);
    });

    
    useEffect(() => {
        if (selectedClient) {
            setPaymentAmount(selectedClient.balance > 0 ? selectedClient.balance.toString() : "");
            setResetMsg(null);
            setIsEditing(false);
            setSaveMsg(null);
            setEditName(selectedClient.full_name || "");
            setEditPhone(selectedClient.phone || "");
            setEditCuit(selectedClient.cuit || "");
            setEditBirthdate(selectedClient.birthdate || "");
            setExpandedOrderId(null);
            setIsOrdersHistoryOpen(false);
        }
    }, [selectedClient]);

    useEffect(() => {
        if (!selectedClient?.id) return;
        let cancelled = false;

        async function fetchSelectedClientDetail() {
            try {
                const res = await fetch(`/api/clientes?clientId=${encodeURIComponent(selectedClient.id)}&t=${Date.now()}`, {
                    cache: "no-store",
                });
                const data = await res.json();
                if (!cancelled && res.ok && data?.id === selectedClient.id) {
                    setSelectedClient(data);
                    setClients(prev => prev.map(c => c.id === data.id ? data : c));
                }
            } catch (err) {
                console.error("Error cargando historial completo del cliente:", err);
            }
        }

        fetchSelectedClientDetail();
        return () => { cancelled = true; };
    }, [selectedClient?.id]);

    async function handleSaveEdit() {
        if (!selectedClient) return;
        setIsSaving(true);
        setSaveMsg(null);
        const { error } = await supabase.from('profiles').update({
            full_name: editName.trim() || null,
            phone: editPhone.trim() || null,
            cuit: editCuit.trim() || null,
            birthdate: editBirthdate || null,
        }).eq('id', selectedClient.id);
        setIsSaving(false);
        if (error) {
            setSaveMsg('Error al guardar: ' + error.message);
        } else {
            setSaveMsg('✓ Guardado');
            setIsEditing(false);
            setSelectedClient({ ...selectedClient, full_name: editName.trim(), phone: editPhone.trim(), cuit: editCuit.trim() || null, birthdate: editBirthdate });
            setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, full_name: editName.trim(), phone: editPhone.trim(), cuit: editCuit.trim() || null, birthdate: editBirthdate } : c));
        }
    }

    async function handleResetPassword(phone: string) {
        setResettingPwd(true);
        setResetMsg(null);
        try {
            const res = await fetch('/api/admin/reset-customer-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json();
            setResetMsg(res.ok ? '✓ Contraseña restablecida al número de celular' : `Error: ${data.error}`);
        } catch {
            setResetMsg('Error de conexión');
        } finally {
            setResettingPwd(false);
        }
    }

    async function handleMigratePasswords() {
        if (!confirm('¿Migrar contraseñas de todos los clientes a sus últimos 4 dígitos? Esto afecta a todos los usuarios registrados.')) return;
        setMigratingPwds(true);
        setMigrateResult(null);
        try {
            const res = await fetch('/api/admin/migrate-customer-passwords', { method: 'POST' });
            const data = await res.json();
            setMigrateResult(res.ok ? `✓ ${data.updated} actualizados, ${data.skipped} omitidos` : `Error: ${data.error}`);
        } catch {
            setMigrateResult('Error de conexión');
        } finally {
            setMigratingPwds(false);
        }
    }

    async function fetchClients() {
        setLoading(true);
        setClientsError(null);
        try {
            const res = await fetch("/api/clientes", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || data?.error || "No se pudieron cargar los clientes.");
            }
            if (!Array.isArray(data)) {
                throw new Error("La respuesta de clientes no tiene el formato esperado.");
            }
            setClients(data);
            return data;
        } catch (e) {
            console.error(e);
            setClientsError(e instanceof Error ? e.message : "Error de conexión al cargar clientes.");
            return [];
        } finally {
            setLoading(false);
        }
    }

    async function handleSettleDebt(clientId: string) {
        const amountToPay = parseFloat(paymentAmount);
        if (isNaN(amountToPay) || amountToPay <= 0) {
            alert("Ingresa un monto válido mayor a 0");
            return;
        }

        if (!confirm(`¿Confirmas el pago de $${amountToPay.toLocaleString()}?`)) return;
        
        setIsPaying(true);
        try {
            const res = await fetch("/api/clientes/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId, amount: amountToPay, method: paymentMethod })
            });
            if (res.ok) {
                alert("Pago registrado correctamente ✅");
                await fetchClients();
                setSelectedClient(null);
            } else {
                const errData = await res.json();
                alert("Error: " + errData.error);
            }
        } catch (err) {
            alert("Error al procesar el pago");
        } finally {
            setIsPaying(false);
        }
    }

    async function handlePayOrder(order: any) {
        if (!selectedClient) return;
        const amount = Number(order.total || 0);
        if (!amount || amount <= 0) return;
        if (!confirm(`¿Confirmas el pago de esta comanda por $${amount.toLocaleString()}?`)) return;

        setIsPaying(true);
        try {
            const res = await fetch("/api/clientes/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: selectedClient.id,
                    orderId: order.id,
                    amount,
                    method: paymentMethod,
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                alert("Error: " + (errData.error || "No se pudo registrar el pago"));
                return;
            }

            const updatedClients = await fetchClients();
            const updatedSelected = updatedClients.find((c: any) => c.id === selectedClient.id);
            if (updatedSelected) setSelectedClient(updatedSelected);
        } catch {
            alert("Error al procesar el pago");
        } finally {
            setIsPaying(false);
        }
    }

    const sortClients = (list: any[]) => {
        return [...list].sort((a, b) => {
            const debtA = Number(a.balance || 0) > 0;
            const debtB = Number(b.balance || 0) > 0;
            if (debtA !== debtB) return debtA ? -1 : 1;
            if (sortBy === "spent") return b.total_spent - a.total_spent;
            if (sortBy === "points") return b.points - a.points;
            if (sortBy === "orders") return b.order_count - a.order_count;
            return a.full_name.localeCompare(b.full_name);
        });
    };

    const filtered = sortClients(clients.filter(c =>
        (c.full_name + (c.email || "") + (c.phone || "")).toLowerCase().includes(search.toLowerCase())
    ));

    const clientGroups = [
        {
            key: "deuda" as const,
            title: "Con deuda",
            clients: filtered.filter(c => Number(c.balance || 0) > 0),
            total: filtered.filter(c => Number(c.balance || 0) > 0).reduce((sum, c) => sum + Number(c.balance || 0), 0),
        },
        {
            key: "sinDeuda" as const,
            title: "Sin deuda",
            clients: filtered.filter(c => Number(c.balance || 0) <= 0),
            total: 0,
        },
    ];

    const getInactivityInfo = (lastOrder: string | null) => {
        if (!lastOrder) return { label: "Sin pedidos", color: "text-gray-400 bg-gray-100" };
        const days = Math.floor((Date.now() - new Date(lastOrder).getTime()) / (1000 * 60 * 60 * 24));
        if (days > 30) return { label: `Inactivo (${days}d)`, color: "text-red-600 bg-red-50" };
        if (days > 7) return { label: `Regular (${days}d)`, color: "text-amber-600 bg-amber-50" };
        return { label: "Activo", color: "text-green-600 bg-green-50" };
    };

    const normalizeOrderItems = (items: any) => {
        if (Array.isArray(items)) return items;
        if (typeof items === "string") {
            try {
                const parsed = JSON.parse(items);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    const getOrderPreview = (order: any) => {
        const items = normalizeOrderItems(order.items);
        if (items.length === 0) return "Sin detalle cargado";
        return items
            .slice(0, 2)
            .map((item: any) => {
                const qty = Number(item.quantity || 1);
                return `${qty}x ${item.name || "Producto"}`;
            })
            .join(" · ") + (items.length > 2 ? ` +${items.length - 2}` : "");
    };

    return (
        <div className="min-h-full pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-1 leading-none uppercase">CLIENTES</h2>
                    <p className="text-gray-400 font-bold text-[10px] tracking-[0.2em] uppercase flex items-center gap-2">
                        <IconUsers size={12} className="text-accent" />
                        {clients.length} Registrados • Gestión de CRM
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1">
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text" placeholder="Filtro rápido..."
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            className="bg-white pl-12 pr-6 py-4 rounded-[1.5rem] border border-gray-100 shadow-sm w-full outline-none focus:ring-4 focus:ring-black/5 transition-all text-sm font-bold"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-[1.5rem] border border-gray-100 shadow-sm">
                        <IconArrowsUpDown size={16} className="text-gray-400" />
                        <select 
                            value={sortBy} 
                            onChange={(e: any) => setSortBy(e.target.value)}
                            className="outline-none text-xs font-black uppercase tracking-widest bg-transparent cursor-pointer"
                        >
                            <option value="spent">Gasto</option>
                            <option value="points">Puntos</option>
                            <option value="orders">Pedidos</option>
                            <option value="name">Nombre</option>
                        </select>
                    </div>

                    <button
                        onClick={() => { setShowNewModal(true); setCreateMsg(null); }}
                        className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-80 transition-all whitespace-nowrap"
                    >
                        <IconUserPlus size={14} /> Nuevo Cliente
                    </button>
                    <button
                        onClick={handleMigratePasswords}
                        disabled={migratingPwds}
                        className="flex items-center gap-2 bg-gray-100 text-gray-600 px-5 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-80 transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                        {migratingPwds ? <IconLoader2 size={14} className="animate-spin" /> : null}
                        Migrar contraseñas
                    </button>
                </div>
                {migrateResult && (
                    <p className={`text-xs font-bold mt-2 ${migrateResult.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                        {migrateResult}
                    </p>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <IconLoader2 className="animate-spin text-gray-200" size={64} />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Accediendo a la base de datos...</p>
                </div>
            ) : clientsError ? (
                <div className="flex flex-col items-center justify-center py-40 text-center gap-4">
                    <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center text-red-300 mb-2">
                        <IconAlertCircle size={40} />
                    </div>
                    <p className="text-red-500 font-black uppercase tracking-[0.2em] text-[10px]">No se pudieron cargar los clientes</p>
                    <p className="text-gray-400 font-bold text-sm max-w-md">{clientsError}</p>
                    <button
                        onClick={fetchClients}
                        className="bg-black text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-80 transition-all"
                    >
                        Reintentar
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-center gap-3">
                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200 mb-2">
                        <IconUsers size={40} />
                    </div>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">No se encontraron coincidencias</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {clientGroups.map(group => {
                        const isOpen = openClientGroups[group.key];
                        return (
                            <div key={group.key} className={`rounded-[2rem] border overflow-hidden ${group.key === "deuda" ? "border-red-100 bg-red-50/30" : "border-gray-100 bg-white/60"}`}>
                                <button
                                    type="button"
                                    onClick={() => setOpenClientGroups(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                                    className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-white/70 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${group.key === "deuda" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                                            {group.key === "deuda" ? <IconAlertCircle size={21} /> : <IconUsers size={21} />}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-950 uppercase tracking-tight">{group.title}</h3>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {group.clients.length} cliente{group.clients.length === 1 ? "" : "s"}
                                                {group.total > 0 ? ` · $${group.total.toLocaleString()}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <IconChevronDown className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} size={22} />
                                </button>

                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 p-5 pt-0">
                                                {group.clients.map((client, idx) => {
                                                    const inactivity = getInactivityInfo(client.last_order_at);
                                                    const isDebt = client.balance > 0;

                                                    return (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                                                            key={client.id || `client-${idx}`}
                                                            onClick={() => setSelectedClient(client)}
                                                            className={`group bg-white p-7 rounded-[2.5rem] border ${isDebt ? "border-red-100 shadow-red-900/5" : "border-transparent"} hover:border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden`}
                                                        >
                                                            <div className="flex items-start justify-between mb-8">
                                                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-300 text-3xl group-hover:bg-black group-hover:text-[#FFD60A] transition-all">
                                                                    {client.full_name?.[0]?.toUpperCase() || "?"}
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1.5">
                                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${inactivity.color}`}>
                                                                        {inactivity.label}
                                                                    </span>
                                                                    {isDebt && (
                                                                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                                                                            Deuda
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <h3 className="font-black text-xl text-gray-900 truncate mb-1">{client.full_name || "S/N"}</h3>
                                                            <div className="flex flex-col gap-1.5 mb-8">
                                                                <p className="text-[11px] font-bold text-gray-400 flex items-center gap-2 tracking-tight truncate">
                                                                    <IconMail size={12} className="opacity-40" /> {client.email || 'Email no cargado'}
                                                                </p>
                                                                {client.phone && (
                                                                    <p className="text-[11px] font-bold text-gray-400 flex items-center gap-2 tracking-tight">
                                                                        <IconPhone size={12} className="opacity-40" /> {client.phone}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                                                                <div>
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Gasto Total</p>
                                                                    <p className="text-sm font-black text-gray-900 leading-none">${client.total_spent.toLocaleString()}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${isDebt ? 'text-red-400' : 'text-gray-400'} mb-1`}>Saldo Cuenta</p>
                                                                    <p className={`text-sm font-black ${isDebt ? 'text-red-600' : 'text-gray-900'} leading-none`}>
                                                                        {isDebt ? `-$${client.balance.toLocaleString()}` : `$${client.balance.toLocaleString()}`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Detalle MEJORADO */}
            <AnimatePresence>
                {selectedClient && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedClient(null)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 100 }}
                            className="relative bg-white w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col"
                        >
                            {/* Header Gradient */}
                            <div className="bg-gray-950 p-10 relative shrink-0 overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 blur-[100px] rounded-full -mr-32 -mt-32" />
                                <div className="relative flex items-start gap-8">
                                    <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-center text-5xl font-black text-[#FFD60A] shadow-2xl shrink-0">
                                        {selectedClient.full_name?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD60A] mb-1">Perfil de Cliente</p>
                                        <h2 className="text-3xl font-black text-white leading-tight">{selectedClient.full_name}</h2>
                                        <p className="text-white/40 text-sm font-bold flex items-center gap-2 mt-2 truncate">
                                            <IconPhone size={14} /> {selectedClient.phone || 'Sin teléfono'}
                                        </p>
                                        <div className="flex gap-2 mt-4">
                                            <button
                                                onClick={() => { setIsEditing(v => !v); setSaveMsg(null); }}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all"
                                            >
                                                <IconEdit size={14} /> Editar datos
                                            </button>
                                            <button onClick={() => setSelectedClient(null)} className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all">
                                                <IconX size={14} /> Cerrar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Formulario de edición */}
                                {isEditing && (
                                    <div className="relative mt-8 space-y-3">
                                        <input
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            placeholder="Nombre completo"
                                            className="w-full bg-white/10 text-white placeholder:text-white/30 font-bold rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-[#FFD60A]/40 text-sm"
                                        />
                                        <input
                                            value={editPhone}
                                            onChange={e => setEditPhone(e.target.value)}
                                            placeholder="Teléfono"
                                            className="w-full bg-white/10 text-white placeholder:text-white/30 font-bold rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-[#FFD60A]/40 text-sm"
                                        />
                                        <input
                                            value={editCuit}
                                            onChange={e => setEditCuit(e.target.value)}
                                            placeholder="CUIT (opcional)"
                                            className="w-full bg-white/10 text-white placeholder:text-white/30 font-bold rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-[#FFD60A]/40 text-sm"
                                        />
                                        <input
                                            type="date"
                                            value={editBirthdate}
                                            onChange={e => setEditBirthdate(e.target.value)}
                                            className="w-full bg-white/10 text-white placeholder:text-white/30 font-bold rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-[#FFD60A]/40 text-sm"
                                        />
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={isSaving}
                                            className="w-full flex items-center justify-center gap-2 bg-[#FFD60A] text-black font-black text-xs uppercase tracking-widest rounded-2xl py-3 hover:opacity-90 transition-all disabled:opacity-50"
                                        >
                                            {isSaving ? <IconLoader2 size={16} className="animate-spin" /> : <IconDeviceFloppy size={16} />}
                                            Guardar cambios
                                        </button>
                                        {saveMsg && <p className={`text-xs font-bold text-center ${saveMsg.startsWith('✓') ? 'text-[#FFD60A]' : 'text-red-400'}`}>{saveMsg}</p>}
                                    </div>
                                )}
                            </div>

                            {/* Main Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-12 no-scrollbar">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-50/50 p-5 rounded-[2.5rem] text-center border border-gray-100 group hover:bg-white hover:shadow-xl transition-all">
                                        <IconTrendingUp className="mx-auto mb-3 text-black opacity-20" size={20} />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Gasto Total</p>
                                        <p className="text-xl font-black text-gray-900">${selectedClient.total_spent.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gray-50/50 p-5 rounded-[2.5rem] text-center border border-gray-100 group hover:bg-white hover:shadow-xl transition-all">
                                        <IconShoppingBag className="mx-auto mb-3 text-black opacity-20" size={20} />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Frecuencia</p>
                                        <p className="text-xl font-black text-gray-900">{selectedClient.order_count}</p>
                                    </div>
                                    <div className="bg-gray-50/50 p-5 rounded-[2.5rem] text-center border border-gray-100 group hover:bg-white hover:shadow-xl transition-all">
                                        <IconStar className="mx-auto mb-3 text-[#FFD60A]" size={20} fill="currentColor" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Puntos</p>
                                        <p className="text-xl font-black text-gray-900">{selectedClient.points}</p>
                                    </div>
                                    <div className={`${selectedClient.balance > 0 ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : selectedClient.balance < 0 ? 'bg-emerald-600 text-white' : 'bg-black text-white'} p-5 rounded-[2.5rem] text-center transition-all relative overflow-hidden`}>
                                         {selectedClient.balance !== 0 && <div className="absolute top-0 right-0 w-8 h-8 -mr-4 -mt-4 bg-white/20 rotate-45" />}
                                        <IconArrowsUpDown className="mx-auto mb-3 opacity-40" size={20} />
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Saldo CC</p>
                                        <p className="text-xl font-black">
                                            {selectedClient.balance > 0 ? `-$${selectedClient.balance.toLocaleString()}` : selectedClient.balance < 0 ? `+$${Math.abs(selectedClient.balance).toLocaleString()}` : `$0`}
                                        </p>
                                    </div>
                                </div>

                                {/* Debt Settlement Section */}
                                <div className={`p-8 rounded-[3rem] ${selectedClient.balance > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'} border-2 flex flex-col gap-6 shadow-sm`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 ${selectedClient.balance > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'} rounded-full flex items-center justify-center`}>
                                            <IconReceipt size={28} />
                                        </div>
                                        <div>
                                            <h4 className={`font-black ${selectedClient.balance > 0 ? 'text-red-900' : 'text-emerald-900'} text-lg`}>Registrar Pago</h4>
                                            <p className={`${selectedClient.balance > 0 ? 'text-red-700/60' : 'text-emerald-700/60'} font-bold text-xs uppercase tracking-widest`}>Ingresa el monto que entrega el cliente</p>
                                        </div>
                                    </div>
                                    
                                    {/* Método de pago */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {([
                                            { key: "CASH", label: "Efectivo" },
                                            { key: "MERCADO_PAGO", label: "Mercado Pago" },
                                            { key: "SANTANDER_RIO", label: "Santander" },
                                        ] as const).map(({ key, label }) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setPaymentMethod(key)}
                                                className={`py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                                                    paymentMethod === key
                                                        ? "bg-gray-900 text-white border-gray-900"
                                                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-1">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">$</span>
                                            <input
                                                type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                                                className="w-full h-16 pl-10 pr-6 rounded-2xl bg-white border-transparent focus:ring-4 ring-black/5 outline-none font-black text-xl text-gray-900 shadow-inner"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <button
                                            disabled={isPaying} onClick={() => handleSettleDebt(selectedClient.id)}
                                            className={`h-16 px-10 ${selectedClient.balance > 0 ? 'bg-red-600 shadow-red-600/20' : 'bg-emerald-600 shadow-emerald-600/20'} text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-xl`}
                                        >
                                            {isPaying ? <IconLoader2 className="animate-spin" size={18} /> : <><IconCircleCheck size={18} /> Confirmar Pago</>}
                                        </button>
                                    </div>
                                    
                                    {selectedClient.balance > 0 && (
                                        <button 
                                            onClick={() => setPaymentAmount(selectedClient.balance.toString())}
                                            className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors mx-auto"
                                        >
                                            Autocompletar deuda total (${selectedClient.balance.toLocaleString()})
                                        </button>
                                    )}
                                </div>

                                {/* CONSUMPTION HISTORY - NEW SECTION */}
                                <div className="space-y-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsOrdersHistoryOpen(prev => !prev)}
                                        className="w-full flex items-center justify-between rounded-3xl border border-gray-100 bg-white px-5 py-4 text-left shadow-sm hover:border-gray-200 transition-all"
                                    >
                                        <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                                            <IconHistory size={16} /> ÚLTIMOS CONSUMOS
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-gray-400 italic">
                                                {selectedClient.last_orders?.length || 0} órdenes
                                            </span>
                                            <IconChevronDown
                                                size={16}
                                                className={`text-gray-400 transition-transform ${isOrdersHistoryOpen ? "rotate-180" : ""}`}
                                            />
                                        </div>
                                    </button>
                                    <AnimatePresence initial={false}>
                                        {isOrdersHistoryOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="space-y-3">
                                                    {selectedClient.last_orders && selectedClient.last_orders.length > 0 ? (
                                            selectedClient.last_orders.map((order: any, oIdx: number) => {
                                                const orderItems = normalizeOrderItems(order.items);
                                                const orderKey = order.id || `order-${oIdx}`;
                                                const isExpanded = expandedOrderId === orderKey;
                                                const isDebtOrder = order.payment_method === "CUENTA_CORRIENTE" && order.paid !== true;
                                                const statusLabel = isDebtOrder ? "Adeudada" : "Pagada";
                                                const statusClasses = isDebtOrder
                                                    ? "border-red-200 bg-red-50/80 hover:shadow-red-100"
                                                    : "border-emerald-100 bg-emerald-50/70 hover:shadow-emerald-100";
                                                const iconClasses = isDebtOrder
                                                    ? "bg-red-100 text-red-500 group-hover:bg-red-600 group-hover:text-white"
                                                    : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white";

                                                return (
                                                    <div key={orderKey} className={`rounded-[2rem] border overflow-hidden hover:shadow-lg transition-all group ${statusClasses}`}>
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => setExpandedOrderId(isExpanded ? null : orderKey)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" || e.key === " ") {
                                                                    e.preventDefault();
                                                                    setExpandedOrderId(isExpanded ? null : orderKey);
                                                                }
                                                            }}
                                                            className="w-full p-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-5 min-w-0">
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${iconClasses}`}>
                                                                    <IconReceipt size={20} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <p className="font-black text-gray-900 text-sm">Pedido #{order.id?.slice(0, 8) || 'N/A'}</p>
                                                                        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${isDebtOrder ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
                                                                            {statusLabel}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                        {new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                    </p>
                                                                    <p className="mt-1 text-[10px] font-black text-gray-500 uppercase tracking-tight truncate">
                                                                        {getOrderPreview(order)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className={`font-black text-base ${isDebtOrder ? "text-red-700" : "text-emerald-700"}`}>${Number(order.total).toLocaleString()}</p>
                                                                <p className="text-[9px] font-black text-accent uppercase tracking-tighter">
                                                                    {isExpanded ? "Ocultar detalle" : "Ver comanda"}
                                                                </p>
                                                                {isDebtOrder && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handlePayOrder(order);
                                                                        }}
                                                                        disabled={isPaying}
                                                                        className="mt-2 px-4 py-2 rounded-xl bg-red-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 transition-all"
                                                                    >
                                                                        Pagar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <AnimatePresence initial={false}>
                                                            {isExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="mx-5 mb-5 rounded-3xl bg-gray-50 border border-gray-100 p-4 space-y-3">
                                                                        {orderItems.length > 0 ? (
                                                                            orderItems.map((item: any, itemIdx: number) => {
                                                                                const qty = Number(item.quantity || 1);
                                                                                const price = Number(item.price || 0);
                                                                                const subtotal = price * qty;
                                                                                return (
                                                                                    <div key={`${orderKey}-item-${itemIdx}`} className="flex items-start justify-between gap-3 border-b border-gray-200/70 last:border-0 pb-3 last:pb-0">
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-sm font-black text-gray-900">
                                                                                                {qty}x {item.name || "Producto"}
                                                                                            </p>
                                                                                            {item.notes && (
                                                                                                <p className="mt-1 text-[10px] font-bold text-gray-500 leading-snug">
                                                                                                    Nota: {item.notes}
                                                                                                </p>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="text-right shrink-0">
                                                                                            <p className="text-xs font-black text-gray-900">${subtotal.toLocaleString()}</p>
                                                                                            <p className="text-[9px] font-bold text-gray-400">${price.toLocaleString()} c/u</p>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400 py-3">
                                                                                Esta orden no tiene comanda guardada
                                                                            </p>
                                                                        )}

                                                                        {order.notes && (
                                                                            <div className="pt-3 border-t border-gray-200/70">
                                                                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Nota del pedido</p>
                                                                                <p className="text-xs font-bold text-gray-700">{order.notes}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })
                                                    ) : (
                                                        <div className="py-12 border-2 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center text-center opacity-30">
                                                            <IconShoppingBag size={32} className="mb-2" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest">No hay historial de compras</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* CONTACT FOOTER */}
                                <div className="pt-8 border-t border-gray-100 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-5 bg-gray-50 rounded-[1.5rem] border border-transparent hover:border-gray-200 transition-colors">
                                            <IconPhone size={18} className="text-gray-300" />
                                            <div>
                                                <p className="text-[8px] font-black uppercase opacity-40 text-black mb-0.5">Teléfono</p>
                                                <p className="text-xs font-bold text-gray-900 truncate">{selectedClient.phone || 'S/N'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-5 bg-gray-50 rounded-[1.5rem] border border-transparent hover:border-gray-200 transition-colors">
                                            <IconMail size={18} className="text-gray-300" />
                                            <div>
                                                <p className="text-[8px] font-black uppercase opacity-40 text-black mb-0.5">Email</p>
                                                <p className="text-xs font-bold text-gray-900 truncate">{selectedClient.email || 'S/N'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {selectedClient.phone && (
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => handleResetPassword(selectedClient.phone)}
                                                disabled={resettingPwd}
                                                className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                            >
                                                {resettingPwd ? 'Restableciendo...' : '🔑 Restablecer contraseña al celular'}
                                            </button>
                                            {resetMsg && (
                                                <p className={`text-xs font-bold text-center ${resetMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                                                    {resetMsg}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Nuevo Cliente */}
            <AnimatePresence>
                {showNewModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 flex flex-col gap-5"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-2xl font-black">Nuevo Cliente</h3>
                                <button onClick={() => setShowNewModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-all"><IconX size={20} /></button>
                            </div>

                            <input
                                value={newName} onChange={e => setNewName(e.target.value)}
                                placeholder="Nombre completo *"
                                className="w-full bg-gray-50 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-black/10 text-sm"
                            />
                            <input
                                value={newPhone} onChange={e => setNewPhone(e.target.value)}
                                placeholder="Teléfono * (últimos 4 = contraseña)"
                                className="w-full bg-gray-50 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-black/10 text-sm"
                            />
                            <input
                                value={newCuit} onChange={e => setNewCuit(e.target.value)}
                                placeholder="CUIT (opcional)"
                                className="w-full bg-gray-50 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-black/10 text-sm"
                            />
                            <input
                                value={newAddress} onChange={e => setNewAddress(e.target.value)}
                                placeholder="Dirección (opcional)"
                                className="w-full bg-gray-50 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-black/10 text-sm"
                            />

                            {newPhone.replace(/\D/g, '').length >= 4 && (
                                <p className="text-xs font-bold text-gray-400 -mt-2 px-1">
                                    Contraseña: <span className="text-black font-black">{newPhone.replace(/\D/g, '').slice(-4)}</span>
                                </p>
                            )}

                            {createMsg && (
                                <p className={`text-sm font-bold rounded-2xl px-4 py-3 ${createMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{createMsg}</p>
                            )}

                            <div className="flex gap-3 mt-2">
                                <button onClick={() => setShowNewModal(false)} className="flex-1 py-4 rounded-2xl bg-gray-100 font-bold text-sm">Cancelar</button>
                                <button
                                    onClick={handleCreateClient}
                                    disabled={isCreating}
                                    className="flex-[2] py-4 rounded-2xl bg-black text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isCreating ? <IconLoader2 size={18} className="animate-spin" /> : <IconUserPlus size={18} />}
                                    {isCreating ? 'Creando...' : 'Crear Cliente'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
