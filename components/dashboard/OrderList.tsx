"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Order } from "@/lib/types";
import * as XLSX from "xlsx";
import { IconLoader2, IconX, IconFilter, IconDownload, IconBike, IconBuildingStore, IconBuilding, IconToolsKitchen, IconAlertCircle, IconCircleCheck, IconRefresh, IconPrinter, IconFileInvoice } from "@tabler/icons-react";
import { getPaymentIcon, getPaymentLabel } from "@/lib/utils/payment";
import { motion, AnimatePresence } from "framer-motion";
import { CHANNEL_BADGE, CHANNEL_LABEL, CHANNEL_LEFT, getOrderChannel } from "@/lib/dashboard/order-channel";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { createClient } from "@/lib/supabase/client";

type ViewMode = 'day' | 'week' | 'fortnight' | 'month';
const ORDER_HISTORY_DAYS = 90;

interface GroupedData {
    id: string;
    label: string;
    subLabel?: string;
    orders: Order[];
    total: number;
    count: number;
    date: Date;
}

function orderTypeLabel(order: any) {
    const t = order.delivery_type || order.order_type;
    if (t === "tribunales") return { label: "Tribunales", icon: <IconBuilding size={13} /> };
    if (t === "delivery")   return { label: "Delivery",   icon: <IconBike size={13} /> };
    if (t === "retiro")     return { label: "Retiro",     icon: <IconBuildingStore size={13} /> };
    if (order.table_id)     return { label: `Mesa ${order.table_id}`, icon: <IconToolsKitchen size={13} /> };
    return { label: "Web", icon: <IconBuildingStore size={13} /> };
}

function isOrderPaid(o: Order & { paid?: boolean | null; status?: string | null; payment_method?: string | null }) {
    if (o.payment_method === "CUENTA_CORRIENTE") return o.paid === true;
    return Boolean(o.paid) || o.status === 'completed' || o.status === 'paid';
}

function isDeliveryOrder(o: Order & { delivery_type?: string | null }) {
    return String(o.delivery_type ?? "").toLowerCase() === "delivery";
}

export function OrderList() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [selectedGroup, setSelectedGroup] = useState<GroupedData | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [unpaidOnly, setUnpaidOnly] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [assigningDeliveryId, setAssigningDeliveryId] = useState<string | null>(null);

    // Reprint state
    const [reprintOrder, setReprintOrder] = useState<any | null>(null);
    const [reprintMode, setReprintMode] = useState<'ticket' | 'factura' | null>(null);
    const [isEmittingFactura, setIsEmittingFactura] = useState(false);
    const [reprintCaeData, setReprintCaeData] = useState<{ cae: string; expiration: string; voucherNumber: number } | null>(null);
    const [reprintFeedback, setReprintFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const supabase = createClient();

    // Advanced Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    const fetchOrders = useCallback(async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent === true;
        if (!silent) {
            setLoading(true);
            setFetchError(null);
        }
        try {
            const res = await fetch(`/api/orders/list?days=${ORDER_HISTORY_DAYS}`, { credentials: "include" });
            const result = await res.json();
            console.log(
                "[OrderList] status:",
                res.status,
                "orders:",
                result.data?.length,
                "error:",
                result.error
            );
            if (!res.ok) {
                const msg =
                    typeof result.error === "string"
                        ? result.error
                        : res.status === 401
                          ? "Sesión inválida o no sos el admin del panel."
                          : `No se pudieron cargar los pedidos (${res.status}).`;
                setOrders([]);
                setFetchError(msg);
                console.error("[OrderList] /api/orders/list", res.status, result);
                return;
            }
            setOrders(Array.isArray(result.data) ? (result.data as Order[]) : []);
            setFetchError(null);
        } catch (e) {
            console.error(e);
            setOrders([]);
            setFetchError("Error de red al cargar pedidos.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchOrders();
        const interval = setInterval(() => void fetchOrders({ silent: true }), 30000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    async function setOrderPaid(orderId: string, paid: boolean) {
        setTogglingId(orderId);
        try {
            const res = await fetch("/api/orders/paid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, paid }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                console.error(j);
                return;
            }
            await fetchOrders();
        } finally {
            setTogglingId(null);
        }
    }

    function patchOrderDeliveryPerson(orderId: string, delivery_person_id: number | null) {
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, delivery_person_id } : o))
        );
        setSelectedOrder((prev) =>
            prev?.id === orderId ? { ...prev, delivery_person_id } : prev
        );
        setSelectedGroup((prev) =>
            prev
                ? {
                      ...prev,
                      orders: prev.orders.map((o) =>
                          o.id === orderId ? { ...o, delivery_person_id } : o
                      ),
                  }
                : null
        );
    }

    async function setDeliveryPerson(orderId: string, delivery_person_id: number | null) {
        setAssigningDeliveryId(orderId);
        try {
            const res = await fetch("/api/orders/delivery-person", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, delivery_person_id }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                console.error(j);
                return;
            }
            patchOrderDeliveryPerson(orderId, delivery_person_id);
            await fetchOrders();
        } finally {
            setAssigningDeliveryId(null);
        }
    }

    const unpaidSummary = useMemo(() => {
        const historyStart = new Date();
        historyStart.setDate(historyStart.getDate() - ORDER_HISTORY_DAYS);
        
        const unpaid = orders.filter((o) => {
            const isUnpaid = !isOrderPaid(o as Order & { paid?: boolean });
            const isRecent = new Date(o.created_at) >= historyStart;
            return isUnpaid && isRecent;
        });
        
        const total = unpaid.reduce((s, o) => s + Number(o.total), 0);
        return { count: unpaid.length, total };
    }, [orders]);

    const visibleOrders = useMemo(() => {
        let items = unpaidOnly ? orders.filter((o) => !isOrderPaid(o as Order & { paid?: boolean })) : orders;

        if (searchTerm) {
            const low = searchTerm.toLowerCase();
            items = items.filter(o => 
                (o.customer_name?.toLowerCase().includes(low)) || 
                (o.table_id?.toString() === searchTerm)
            );
        }

        if (dateFilter) {
            // dateFilter is YYYY-MM-DD
            items = items.filter(o => o.created_at.startsWith(dateFilter));
        }

        if (minAmount) {
            items = items.filter(o => Number(o.total) >= Number(minAmount));
        }
        if (maxAmount) {
            items = items.filter(o => Number(o.total) <= Number(maxAmount));
        }

        return items;
    }, [orders, unpaidOnly, searchTerm, dateFilter, minAmount, maxAmount]);

    const exportToExcel = () => {
        if (orders.length === 0) return;
        const rows: any[] = [];
        let grandTotal = 0;
        orders.forEach((order: any) => {
            const date = new Date(order.created_at);
            grandTotal += Number(order.total);
            const items = order.items || [];
            if (Array.isArray(items) && items.length > 0) {
                items.forEach((item: any) => {
                    rows.push({
                        "Fecha": date.toLocaleDateString("es-AR"),
                        "Hora": date.toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' }),
                        "Cliente": order.customer_name || `Mesa ${order.table_id}`,
                        "Tipo": orderTypeLabel(order).label,
                        "Método Pago": getPaymentLabel(order.payment_method),
                        "Producto": item.name,
                        "Cantidad": item.quantity || 1,
                        "Precio": item.price || 0,
                        "Subtotal": (item.price || 0) * (item.quantity || 1),
                    });
                });
            } else {
                rows.push({
                    "Fecha": date.toLocaleDateString("es-AR"),
                    "Hora": date.toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' }),
                    "Cliente": order.customer_name || `Mesa ${order.table_id}`,
                    "Tipo": orderTypeLabel(order).label,
                    "Método Pago": getPaymentLabel(order.payment_method),
                    "Producto": "Venta General", "Cantidad": 1,
                    "Precio": order.total, "Subtotal": order.total,
                });
            }
        });
        const wb = XLSX.utils.book_new();
        rows.push({}, { "Producto": "TOTAL", "Subtotal": grandTotal });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Pedidos");
        XLSX.writeFile(wb, `Bloom_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`);
    };

    const groupedOrders = useMemo(() => {
        const groups: Record<string, GroupedData> = {};
        visibleOrders.forEach(order => {
            const date = new Date(order.created_at);
            const y = date.getFullYear();
            const m = date.getMonth();
            const d = date.getDate();
            const dayStr = String(d).padStart(2, '0');
            const monthStr = String(m + 1).padStart(2, '0');
            
            let key = "", label = "", subLabel = "";
            if (viewMode === 'day') {
                key = `${y}-${monthStr}-${dayStr}`;
                label = date.toLocaleDateString("es-AR", { weekday: 'long', day: 'numeric', month: 'long' });
                subLabel = `Día ${dayStr}/${monthStr}`;
            } else if (viewMode === 'week') {
                const first = new Date(y, 0, 1);
                const wn = Math.ceil(((date.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) / 7);
                key = `${y}-W${wn}`; 
                label = `Semana ${wn}`; 
                subLabel = `Año ${y}`;
            } else if (viewMode === 'fortnight') {
                const fn = d <= 15 ? "1ra" : "2da";
                key = `${y}-${m}-${fn}`;
                label = `${fn} Quincena de ${date.toLocaleDateString("es-AR", { month: 'long' })}`;
                subLabel = `Año ${y}`;
            } else {
                key = `${y}-${m}`;
                label = date.toLocaleDateString("es-AR", { month: 'long' });
                subLabel = `Mensual ${y}`;
            }
            if (!groups[key]) groups[key] = { id: key, label, subLabel, orders: [], total: 0, count: 0, date };
            groups[key].orders.push(order);
            groups[key].total += Number(order.total);
            groups[key].count += 1;
        });
        return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [visibleOrders, viewMode]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <IconLoader2 className="animate-spin text-[#FFD60A]" size={64} />
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Cargando historial...</p>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="rounded-3xl border-2 border-red-200 bg-red-50/90 p-6 space-y-3">
                <p className="font-black text-red-900">No se pudo cargar el historial</p>
                <p className="text-sm text-red-800 leading-relaxed">{fetchError}</p>
                <button
                    type="button"
                    onClick={() => void fetchOrders()}
                    className="rounded-xl bg-red-900 text-white px-4 py-2 text-sm font-bold hover:bg-red-800"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Resumen impagos */}
            <div className={`rounded-3xl border-2 p-5 flex flex-wrap items-center justify-between gap-4 ${unpaidSummary.count > 0 ? "border-amber-400 bg-amber-50/90" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${unpaidSummary.count > 0 ? "bg-amber-200 text-amber-900" : "bg-gray-100 text-gray-500"}`}>
                        <IconAlertCircle size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                             <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cuentas por cobrar</p>
                             <span className="bg-amber-200 text-amber-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Reciente</span>
                        </div>
                        <p className="text-xl font-black text-gray-900">
                             {unpaidSummary.count} pedido{unpaidSummary.count === 1 ? "" : "s"} sugerido{unpaidSummary.count === 1 ? "" : "s"}
                        </p>
                        <p className="text-sm font-bold text-amber-800">
                            Pendientes (últimos {ORDER_HISTORY_DAYS} días): <span className="text-lg">${Number(unpaidSummary.total || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setUnpaidOnly((v) => !v)}
                    className={`px-4 py-2.5 rounded-2xl text-sm font-black uppercase tracking-wide transition-all ${unpaidOnly ? "bg-black text-[#FFD60A]" : "bg-white border border-gray-200 text-gray-700 hover:border-amber-300"}`}
                >
                    {unpaidOnly ? "Ver todos" : "Ver solo impagos"}
                </button>
            </div>

            {/* Leyenda de canales */}
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Leyenda</p>
                <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-black text-gray-800 leading-relaxed">
                    <span>🔴 Mesa</span>
                    <span>🟢 Delivery</span>
                    <span>🟡 Retiro en sucursal</span>
                </p>
            </div>

            {/* CONTROLS */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex gap-1 flex-wrap">
                    {(['day', 'week', 'fortnight', 'month'] as ViewMode[]).map(mode => (
                        <button key={mode} onClick={() => setViewMode(mode)}
                            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${viewMode === mode ? "bg-[#FFD60A] text-black shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
                        >
                            {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : mode === 'fortnight' ? 'Quincena' : 'Mes'}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-95 border ${showFilters ? "bg-black text-[#FFD60A] border-black" : "bg-white border-gray-200 text-gray-700 hover:border-black/20"}`}
                >
                    <IconFilter size={16} /> {showFilters ? "Ocultar Filtros" : "Búsqueda Avanzada"}
                </button>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void fetchOrders({ silent: true })}
                        className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-95"
                    >
                        <IconRefresh size={16} /> Actualizar
                    </button>
                    <button onClick={exportToExcel}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-2xl text-sm font-bold shadow transition-all active:scale-95"
                    >
                        <IconDownload size={16} /> Excel
                    </button>
                </div>
            </div>

            {/* ADVANCED FILTERS PANEL */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cliente / Mesa</label>
                                <input
                                    type="text"
                                    placeholder="Nombre o Nº Mesa..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-black transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Fecha</label>
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-black transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Monto Mínimo</label>
                                <input
                                    type="number"
                                    placeholder="$ Min"
                                    value={minAmount}
                                    onChange={(e) => setMinAmount(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-black transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Monto Máximo</label>
                                <input
                                    type="number"
                                    placeholder="$ Max"
                                    value={maxAmount}
                                    onChange={(e) => setMaxAmount(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-black transition-all"
                                />
                            </div>
                            {(searchTerm || dateFilter || minAmount || maxAmount) && (
                                <div className="lg:col-span-4 flex justify-end">
                                    <button
                                        onClick={() => {
                                            setSearchTerm("");
                                            setDateFilter("");
                                            setMinAmount("");
                                            setMaxAmount("");
                                        }}
                                        className="text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                        Limpiar Filtros
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* GRID */}
            {groupedOrders.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <IconFilter size={48} className="mx-auto mb-4" />
                    <p className="font-bold">No hay órdenes para mostrar</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {groupedOrders.map((group, idx) => (
                        <motion.button key={group.id} layoutId={`card-${group.id}`}
                            onClick={() => setSelectedGroup(group)}
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-left"
                        >
                            <p className="text-[10px] font-black text-[#FFD60A] uppercase tracking-widest mb-1.5 bg-black w-fit px-2 py-0.5 rounded-md">
                                {group.subLabel}
                            </p>
                            <h3 className="text-lg font-black text-gray-900 capitalize leading-tight mb-4">{group.label}</h3>
                            <div className="space-y-1">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase">Ventas</span>
                                    <span className="text-2xl font-black text-gray-900">${Number(group.total || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase">Órdenes</span>
                                    <span className="text-sm font-bold text-gray-600">{group.count}</span>
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}

            {/* DETAIL MODAL — group */}
            <AnimatePresence>
                {selectedGroup && !selectedOrder && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedGroup(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div layoutId={`card-${selectedGroup.id}`}
                            className="bg-white w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col"
                        >
                            {/* Header */}
                            <div className="bg-[#FFD60A] px-5 py-5 sm:px-8 sm:py-7 flex justify-between items-start shrink-0">
                                <div>
                                    <p className="text-[10px] font-black text-black/50 uppercase tracking-widest mb-0.5">{selectedGroup.subLabel}</p>
                                    <h2 className="text-xl sm:text-3xl font-black text-black capitalize leading-tight">{selectedGroup.label}</h2>
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="bg-black text-white px-3 py-1.5 rounded-xl">
                                            <p className="text-[9px] font-black uppercase opacity-60">Total</p>
                                            <p className="text-lg font-black">${Number(selectedGroup.total || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/60 px-3 py-1.5 rounded-xl">
                                            <p className="text-[9px] font-black uppercase opacity-60">Órdenes</p>
                                            <p className="text-lg font-black">{selectedGroup.count}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedGroup(null)}
                                    className="w-9 h-9 rounded-full bg-black/10 hover:bg-black hover:text-white transition-colors flex items-center justify-center shrink-0"
                                >
                                    <IconX size={18} />
                                </button>
                            </div>

                            {/* Lista de pedidos */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
                                {selectedGroup.orders.map(order => {
                                    const o = order as Order & { paid?: boolean };
                                    const paid = isOrderPaid(o);
                                    const channel = getOrderChannel(o);
                                    const chLeft = CHANNEL_LEFT[channel];
                                    const chBadge = CHANNEL_BADGE[channel];
                                    const chShort = CHANNEL_LABEL[channel];
                                    const { label: typeLabel, icon: typeIcon } = orderTypeLabel(o);
                                    const time = new Date(o.created_at).toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' });
                                    const frame = paid
                                        ? "border border-gray-200 bg-white shadow-sm"
                                        : "border-2 border-red-500 bg-red-50 shadow-lg shadow-red-900/10";
                                    return (
                                        <div
                                            key={o.id}
                                            className={`rounded-3xl transition-all flex flex-col gap-2 p-2 ${frame} ${chLeft}`}
                                        >
                                            <button type="button" onClick={() => setSelectedOrder(o)}
                                                className="w-full hover:bg-white rounded-2xl px-3 py-3 text-left flex items-center gap-3 transition-colors"
                                            >
                                                <span
                                                    className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide shadow-sm ${chBadge}`}
                                                    title={chShort}
                                                >
                                                    {chShort}
                                                </span>
                                                <div className={`shrink-0 ${paid ? "text-gray-400" : "text-red-500"}`}>{typeIcon}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-gray-950 text-base truncate">
                                                        {o.customer_name || `Mesa ${o.table_id}`}
                                                    </p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 flex-wrap">
                                                        <span>{time}</span>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                        <span>{typeLabel}</span>
                                                        {o.customer_phone && (
                                                            <>
                                                                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                                <span>{o.customer_phone}</span>
                                                            </>
                                                        )}
                                                        <span className={`ml-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${paid ? "bg-emerald-100 text-emerald-800" : "bg-red-600 text-white shadow-sm shadow-red-600/20"}`}>
                                                            {paid ? "Pagado" : "Impago"}
                                                        </span>
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`font-black text-lg ${paid ? "text-gray-950" : "text-red-700"}`}>${Number(o.total).toLocaleString()}</p>
                                                    {!paid && <p className="text-[9px] font-black uppercase tracking-widest text-red-500">Sin cobrar</p>}
                                                </div>
                                            </button>
                                            <div className="flex flex-col items-stretch gap-2 px-2 pb-2 sm:flex-row sm:items-center sm:justify-end">
                                                {isDeliveryOrder(o) && (
                                                    <div className="flex items-center gap-2 sm:mr-auto">
                                                        <label className="text-[10px] font-black uppercase text-gray-500 shrink-0">
                                                            Repartidor
                                                        </label>
                                                        <select
                                                            value={
                                                                o.delivery_person_id != null
                                                                    ? String(o.delivery_person_id)
                                                                    : ""
                                                            }
                                                            disabled={assigningDeliveryId === o.id}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                const v = e.target.value;
                                                                void setDeliveryPerson(
                                                                    o.id,
                                                                    v === "" ? null : Number(v)
                                                                );
                                                            }}
                                                            className="text-xs font-bold rounded-xl border border-gray-200 bg-white px-2 py-1.5 min-w-[7rem]"
                                                        >
                                                            <option value="">Sin asignar</option>
                                                            {[1, 2, 3, 4, 5].map((n) => (
                                                                <option key={n} value={n}>
                                                                    {n}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={togglingId === o.id}
                                                    onClick={(e) => { e.stopPropagation(); void setOrderPaid(o.id, !paid); }}
                                                    className={`inline-flex items-center justify-center gap-1.5 text-xs font-black uppercase px-4 py-2 rounded-2xl transition-all ${paid ? "bg-white border border-red-200 text-red-600 hover:bg-red-50" : "bg-emerald-600 text-white shadow-lg shadow-emerald-700/20 hover:bg-emerald-700"}`}
                                                >
                                                    {togglingId === o.id ? <IconLoader2 className="animate-spin" size={14} /> : paid ? <><IconAlertCircle size={14} /> Marcar impago</> : <><IconCircleCheck size={14} /> Marcar pagado</>}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DETAIL MODAL — single order */}
            <AnimatePresence>
                {selectedOrder && (
                    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedOrder(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                            className={`bg-white w-full sm:max-w-md max-h-[85vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col border-2 border-gray-200 ${CHANNEL_LEFT[getOrderChannel(selectedOrder)]}`}
                        >
                            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between shrink-0">
                                <div>
                                    <span
                                        className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide mb-2 ${CHANNEL_BADGE[getOrderChannel(selectedOrder)]}`}
                                    >
                                        {CHANNEL_LABEL[getOrderChannel(selectedOrder)]}
                                    </span>
                                    <p className="font-black text-gray-900 text-lg">{selectedOrder.customer_name || `Mesa ${selectedOrder.table_id}`}</p>
                                    {selectedOrder.customer_phone && (
                                        <a href={`tel:${selectedOrder.customer_phone}`} className="text-sm text-bloom-600 font-bold">{selectedOrder.customer_phone}</a>
                                    )}
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1">
                                            {orderTypeLabel(selectedOrder).icon} {orderTypeLabel(selectedOrder).label}
                                        </span>
                                        {selectedOrder.delivery_info && (
                                            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg max-w-xs truncate">{selectedOrder.delivery_info}</span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedOrder(null)}
                                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0"
                                >
                                    <IconX size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-2">
                                {(selectedOrder.items || []).length === 0 ? (
                                    <p className="text-gray-400 text-sm">Sin detalle de items</p>
                                ) : (
                                    (selectedOrder.items as any[]).map((item: any, i: number) => (
                                        <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900 text-sm">{item.quantity > 1 && <span className="text-bloom-600 font-black">{item.quantity}x </span>}{item.name}</p>
                                                {item.variants?.length > 0 && (
                                                    <p className="text-xs text-gray-400 mt-0.5">{item.variants.join(", ")}</p>
                                                )}
                                                {item.observations && (
                                                    <p className="text-xs text-gray-400 italic">
                                                        {`\u201C${item.observations}\u201D`}
                                                    </p>
                                                )}
                                            </div>
                                            <p className="text-sm font-black text-gray-700 shrink-0">${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex flex-col gap-3 bg-gray-50">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-gray-400">{new Date(selectedOrder.created_at).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                                        {selectedOrder.payment_method && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                {getPaymentIcon(selectedOrder.payment_method)}
                                                <span className="text-xs font-bold text-gray-500">{getPaymentLabel(selectedOrder.payment_method)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-2xl font-black text-gray-900">${Number(selectedOrder.total).toLocaleString()}</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {isDeliveryOrder(selectedOrder as Order) && (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-black uppercase text-gray-500">
                                                Repartidor
                                            </span>
                                            <select
                                                value={
                                                    selectedOrder.delivery_person_id != null
                                                        ? String(selectedOrder.delivery_person_id)
                                                        : ""
                                                }
                                                disabled={assigningDeliveryId === selectedOrder.id}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    void setDeliveryPerson(
                                                        selectedOrder.id,
                                                        v === "" ? null : Number(v)
                                                    );
                                                }}
                                                className="text-xs font-bold rounded-xl border border-gray-200 bg-white px-2 py-2 min-w-[8rem]"
                                            >
                                                <option value="">Sin asignar</option>
                                                {[1, 2, 3, 4, 5].map((n) => (
                                                    <option key={n} value={n}>
                                                        {n}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-2">
                                    <span className={`text-xs font-black uppercase px-3 py-2 rounded-xl ${isOrderPaid(selectedOrder) ? "bg-emerald-100 text-emerald-800" : "bg-red-600 text-white shadow-sm shadow-red-600/20"}`}>
                                        {isOrderPaid(selectedOrder) ? "Pagado" : "Impago"}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={togglingId === selectedOrder.id}
                                        onClick={() => void setOrderPaid(selectedOrder.id, !isOrderPaid(selectedOrder))}
                                        className={`text-xs font-black uppercase px-4 py-2 rounded-xl ${isOrderPaid(selectedOrder) ? "bg-white border border-red-200 text-red-600 hover:bg-red-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                                    >
                                        {togglingId === selectedOrder.id ? "…" : isOrderPaid(selectedOrder) ? "Marcar impago" : "Marcar pagado"}
                                    </button>
                                    </div>

                                    {/* ── REIMPRIMIR TICKET / FACTURA ── */}
                                    <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setReprintOrder(selectedOrder);
                                                setReprintCaeData(null);
                                                setReprintMode('ticket');
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-900 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                                        >
                                            <IconPrinter size={16} /> Ticket
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isEmittingFactura}
                                            onClick={async () => {
                                                const order = selectedOrder as any;
                                                // If already has CAE, just reprint
                                                if (order.cae && order.voucher_number) {
                                                    setReprintOrder(order);
                                                    setReprintCaeData({
                                                        cae: String(order.cae),
                                                        expiration: String(order.cae_expiration ?? ''),
                                                        voucherNumber: Number(order.voucher_number),
                                                    });
                                                    setReprintMode('factura');
                                                    return;
                                                }
                                                // Emit new factura
                                                setIsEmittingFactura(true);
                                                try {
                                                    const res = await fetch('/api/facturar', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ amount: Number(order.total) }),
                                                    });
                                                    const data = await res.json();
                                                    if (!res.ok) throw new Error(data.details || data.error || 'Error al facturar');
                                                    const caeInfo = {
                                                        cae: String(data.cae),
                                                        expiration: String(data.expiration),
                                                        voucherNumber: Number(data.voucher_number),
                                                    };
                                                    await supabase.from('orders').update({
                                                        cae: caeInfo.cae,
                                                        cae_expiration: caeInfo.expiration,
                                                        voucher_number: caeInfo.voucherNumber,
                                                    }).eq('id', order.id);
                                                    setReprintOrder(order);
                                                    setReprintCaeData(caeInfo);
                                                    setReprintMode('factura');
                                                    setReprintFeedback({ message: 'Factura emitida ✅', type: 'success' });
                                                } catch (err: any) {
                                                    setReprintFeedback({ message: `ARCA: ${err.message}`, type: 'error' });
                                                } finally {
                                                    setIsEmittingFactura(false);
                                                }
                                            }}
                                            className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 ${
                                                (selectedOrder as any).cae
                                                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                            }`}
                                        >
                                            {isEmittingFactura
                                                ? <><IconLoader2 size={16} className="animate-spin" /> Emitiendo...</>
                                                : <><IconFileInvoice size={16} /> {(selectedOrder as any).cae ? 'Reimprimir Factura' : 'Emitir Factura C'}</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── REPRINT RECEIPT MODAL ── */}
            {reprintMode && reprintOrder && (
                <ReceiptModal
                    tableId={reprintOrder.table_id || 0}
                    invoiceType={reprintMode === 'factura' ? 'Factura C' : 'Sin Validez'}
                    extraTotal={0}
                    cart={(Array.isArray(reprintOrder.items) ? reprintOrder.items : []).filter((i: any) => i.id !== 'meta-customer').map((i: any) => ({
                        id: i.id || i.product_id || 'r-' + Math.random(),
                        name: i.name || 'Ítem',
                        price: Number(i.price || 0),
                        quantity: Number(i.quantity || 1),
                    }))}
                    total={Number(reprintOrder.total)}
                    customerName={reprintOrder.customer_name || ''}
                    customerId={reprintOrder.customer_id}
                    isKitchen={false}
                    isPreview={false}
                    cae={reprintCaeData?.cae}
                    voucherNumber={reprintCaeData?.voucherNumber}
                    caeExpiration={reprintCaeData?.expiration}
                    onClose={() => {
                        setReprintMode(null);
                        setReprintOrder(null);
                        setReprintCaeData(null);
                        void fetchOrders({ silent: true });
                    }}
                />
            )}

            {/* ── REPRINT FEEDBACK ── */}
            <AnimatePresence>
                {reprintFeedback && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`pointer-events-auto px-8 py-5 rounded-2xl shadow-2xl font-black text-sm ${
                                reprintFeedback.type === 'success' ? 'bg-gray-900 text-white' : 'bg-white text-red-500 border border-red-100'
                            }`}
                        >
                            {reprintFeedback.message}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
