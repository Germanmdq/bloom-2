"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { IconChartPie, IconCurrencyDollar, IconCreditCard, IconWallet, IconCalendar, IconLoader2, IconTrendingUp, IconShoppingBag, IconReceipt, IconRefresh, IconPackage, IconArrowUpRight, IconArrowDownRight, IconPrinter, IconFileInvoice, IconChevronDown } from "@tabler/icons-react";
import { ReceiptModal } from "@/components/pos/ReceiptModal";

type Timeframe = 'TODAY' | 'WEEK' | 'MONTH';

const APERTURA_KEY = 'bloom_apertura_caja';
const RENDICION_KEY = 'bloom_rendicion_caja';

function getAperturaStored() {
    try {
        const raw = localStorage.getItem(APERTURA_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const today = new Date().toDateString();
        if (parsed.date !== today) return null;
        return parsed as { date: string; efectivo: number; mercadoPago: number; santander: number };
    } catch { return null; }
}

function getRendicionStored() {
    try {
        const raw = localStorage.getItem(RENDICION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const today = new Date().toDateString();
        if (parsed.date !== today) return null;
        return parsed as { date: string; efectivoReal: number; mercadoPagoReal: number; santanderReal: number };
    } catch { return null; }
}

export default function ReportsPage() {
    const [stats, setStats] = useState({
        cash: 0,
        card: 0,
        mercadoPago: 0,
        santanderRio: 0,
        totalSales: 0,
        totalExpenses: 0,
        totalPurchases: 0,
        netBalance: 0,
        expensesByCategory: {} as Record<string, number>,
        productsByCategory: {} as Record<string, Record<string, number>>,
        salesCount: 0,
        orders: [] as any[]
    });
    const [timeframe, setTimeframe] = useState<Timeframe>('TODAY');
    const [loading, setLoading] = useState(true);
    const [drillMethod, setDrillMethod] = useState<string | null>(null);
    const [apertura, setApertura] = useState<{ efectivo: number; mercadoPago: number; santander: number } | null>(null);
    const [editingApertura, setEditingApertura] = useState(false);
    const [aperturaForm, setAperturaForm] = useState({ efectivo: '', mercadoPago: '', santander: '' });

    const [rendicion, setRendicion] = useState<{ efectivoReal: number; mercadoPagoReal: number; santanderReal: number } | null>(null);
    const [editingRendicion, setEditingRendicion] = useState(false);
    const [rendicionForm, setRendicionForm] = useState({ efectivoReal: '', mercadoPagoReal: '', santanderReal: '' });
    const [openProductCategories, setOpenProductCategories] = useState<Record<string, boolean>>({});
    const [showOrdersHistory, setShowOrdersHistory] = useState(false);
    const [ordersSearch, setOrdersSearch] = useState("");
    const [ordersMethodFilter, setOrdersMethodFilter] = useState("ALL");

    // ── Reprint state ──
    const [reprintOrder, setReprintOrder] = useState<any | null>(null);
    const [reprintMode, setReprintMode] = useState<'ticket' | 'factura' | null>(null);
    const [isEmittingFactura, setIsEmittingFactura] = useState(false);
    const [reprintCaeData, setReprintCaeData] = useState<{ cae: string; expiration: string; voucherNumber: number } | null>(null);
    const [reprintFeedback, setReprintFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const supabase = createClient();

    useEffect(() => {
        const storedA = getAperturaStored();
        if (storedA) setApertura({ efectivo: storedA.efectivo, mercadoPago: storedA.mercadoPago, santander: storedA.santander });
        
        const storedR = getRendicionStored();
        if (storedR) setRendicion({ efectivoReal: storedR.efectivoReal, mercadoPagoReal: storedR.mercadoPagoReal || 0, santanderReal: storedR.santanderReal || 0 });
    }, []);

    useEffect(() => {
        fetchReports();
    }, [timeframe]);

    async function fetchReports() {
        setLoading(true);
        const now = new Date();
        let thresholdDate: string;
        
        if (timeframe === 'TODAY') {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            thresholdDate = startOfDay.toISOString();
        } else if (timeframe === 'WEEK') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
            startOfWeek.setHours(0, 0, 0, 0);
            thresholdDate = startOfWeek.toISOString();
        } else {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            thresholdDate = startOfMonth.toISOString();
        }

        try {
            const [salesRes, comprasRes, gastosFijosRes, productsRes] = await Promise.all([
                supabase.from('orders').select('id, total, payment_method, items, table_id, customer_id, customer_name, created_at, cae, voucher_number, cae_expiration').gte('created_at', thresholdDate).order('created_at', { ascending: false }),
                supabase.from('compras').select('total, created_at').gte('created_at', thresholdDate),
                supabase.from('gastos_fijos').select('nombre, monto, estado, updated_at, historial_pagos, categoria'),
                supabase.from('products').select('name, categories(name)')
            ]);

            if (salesRes.error) throw salesRes.error;
            if (comprasRes.error) throw comprasRes.error;
            if (gastosFijosRes.error) throw gastosFijosRes.error;

            const productMappings = (productsRes.data || []).reduce((acc, p) => {
                acc[p.name] = (p.categories as any)?.name || "Otros";
                return acc;
            }, {} as Record<string, string>);

            // Procesar Ventas
            const prodByCat: Record<string, Record<string, number>> = {};
            const totals = (salesRes.data || []).reduce((acc, order) => {
                const amount = Number(order.total);
                if (order.payment_method === 'CASH') acc.cash += amount;
                else if (order.payment_method === 'CARD') acc.card += amount;
                else if (order.payment_method === 'MERCADO_PAGO') acc.mercadoPago += amount;
                else if (order.payment_method === 'SANTANDER_RIO' || order.payment_method === 'BANK_TRANSFER') acc.santanderRio += amount;
                acc.totalSales += amount;
                acc.salesCount += 1;

                (order.items as any[] || []).forEach(item => {
                    const catName = productMappings[item.name] || "Otros";
                    if (!prodByCat[catName]) prodByCat[catName] = {};
                    prodByCat[catName][item.name] = (prodByCat[catName][item.name] || 0) + (item.quantity || 1);
                });
                return acc;
            }, { cash: 0, card: 0, mercadoPago: 0, santanderRio: 0, totalSales: 0, salesCount: 0 });

            // Procesar Compras (Mercadería)
            const totalPurchases = (comprasRes.data || []).reduce((sum, c) => sum + Number(c.total), 0);

            // Procesar Gastos Fijos (Pagos realizados en el periodo)
            let totalFixedExpenses = 0;
            const expByCat: Record<string, number> = {};
            
            (gastosFijosRes.data || []).forEach(g => {
                const historial = Array.isArray(g.historial_pagos) ? g.historial_pagos : [];
                if (historial.length > 0) {
                    // Paid via partial payments — count each payment within the period
                    historial.forEach((p: any) => {
                        if (p.fecha >= thresholdDate) {
                            const monto = Number(p.monto);
                            totalFixedExpenses += monto;
                            const cat = g.categoria || 'General';
                            expByCat[cat] = (expByCat[cat] || 0) + monto;
                        }
                    });
                } else if (g.estado === 'pagado' && g.updated_at >= thresholdDate) {
                    // Paid via "marcar como pagado" — no historial_pagos entry
                    const monto = Number(g.monto);
                    totalFixedExpenses += monto;
                    const cat = g.categoria || 'General';
                    expByCat[cat] = (expByCat[cat] || 0) + monto;
                }
            });

            setStats({
                ...totals,
                totalExpenses: totalFixedExpenses,
                totalPurchases: totalPurchases,
                netBalance: totals.totalSales - (totalFixedExpenses + totalPurchases),
                expensesByCategory: expByCat,
                productsByCategory: prodByCat,
                orders: salesRes.data || []
            });
        } catch (error: any) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    }

    const cashPercentage = stats.totalSales > 0 ? (stats.cash / stats.totalSales) * 100 : 0;
    const cardPercentage = stats.totalSales > 0 ? (stats.card / stats.totalSales) * 100 : 0;
    const mpPercentage = stats.totalSales > 0 ? (stats.mercadoPago / stats.totalSales) * 100 : 0;
    const santanderPercentage = stats.totalSales > 0 ? (stats.santanderRio / stats.totalSales) * 100 : 0;

    const drillOrders = drillMethod ? stats.orders.filter(o => {
        if (drillMethod === 'CASH') return o.payment_method === 'CASH';
        if (drillMethod === 'MERCADO_PAGO') return o.payment_method === 'MERCADO_PAGO';
        if (drillMethod === 'SANTANDER_RIO') return o.payment_method === 'SANTANDER_RIO' || o.payment_method === 'BANK_TRANSFER';
        if (drillMethod === 'CARD') return o.payment_method === 'CARD';
        return false;
    }) : [];

    const visibleReportOrders = stats.orders.filter((order: any) => {
        const matchesMethod = ordersMethodFilter === "ALL" || order.payment_method === ordersMethodFilter;
        const items = Array.isArray(order.items) ? order.items : [];
        const haystack = [
            order.customer_name,
            order.table_id != null ? `mesa ${order.table_id}` : "",
            order.total,
            order.payment_method,
            ...items.map((item: any) => item.name),
        ].join(" ").toLowerCase();
        const matchesSearch = ordersSearch.trim() === "" || haystack.includes(ordersSearch.trim().toLowerCase());
        return matchesMethod && matchesSearch;
    });

    const saveApertura = () => {
        const data = {
            date: new Date().toDateString(),
            efectivo: parseFloat(aperturaForm.efectivo) || 0,
            mercadoPago: parseFloat(aperturaForm.mercadoPago) || 0,
            santander: parseFloat(aperturaForm.santander) || 0,
        };
        localStorage.setItem(APERTURA_KEY, JSON.stringify(data));
        setApertura({ efectivo: data.efectivo, mercadoPago: data.mercadoPago, santander: data.santander });
        setEditingApertura(false);
    };

    const saveRendicion = () => {
        const data = {
            date: new Date().toDateString(),
            efectivoReal: parseFloat(rendicionForm.efectivoReal) || 0,
            mercadoPagoReal: parseFloat(rendicionForm.mercadoPagoReal) || 0,
            santanderReal: parseFloat(rendicionForm.santanderReal) || 0,
        };
        localStorage.setItem(RENDICION_KEY, JSON.stringify(data));
        setRendicion({ 
            efectivoReal: data.efectivoReal,
            mercadoPagoReal: data.mercadoPagoReal,
            santanderReal: data.santanderReal
        });
        setEditingRendicion(false);
    };

    // ── Reprint helpers ──
    const PAYMENT_LABELS: Record<string, string> = {
        CASH: 'Efectivo',
        CARD: 'Tarjeta',
        MERCADO_PAGO: 'Mercado Pago',
        SANTANDER_RIO: 'Santander',
        BANK_TRANSFER: 'Transferencia',
        CUENTA_CORRIENTE: 'Cuenta Corriente',
    };

    const handleReprintTicket = (order: any) => {
        setReprintOrder(order);
        setReprintCaeData(null);
        setReprintMode('ticket');
    };

    const handleReprintFactura = async (order: any) => {
        // If the order already has a CAE, just reprint it
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

        // Otherwise, emit a new factura via ARCA
        setIsEmittingFactura(true);
        setReprintFeedback(null);
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

            // Save CAE to the order in DB
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
    };

    // Auto-clear reprint feedback
    useEffect(() => {
        if (reprintFeedback) {
            const t = setTimeout(() => setReprintFeedback(null), 5000);
            return () => clearTimeout(t);
        }
    }, [reprintFeedback]);

    // Handle Escape key to close modals
    useEffect(() => {
        const handleCloseAll = () => {
            setEditingApertura(false);
            setEditingRendicion(false);
            setReprintOrder(null);
            setDrillMethod(null);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleCloseAll();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('bloom-close-all', handleCloseAll);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('bloom-close-all', handleCloseAll);
        };
    }, []);

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto pb-40">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <IconChartPie className="text-[#FFD60A]" size={20} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-gray-900">Reporte Diario</h1>
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Estatus del negocio en tiempo real</p>
                </div>
                
                <div className="flex bg-gray-100/80 backdrop-blur-xl p-1 rounded-2xl border border-gray-200">
                    {(['TODAY', 'WEEK', 'MONTH'] as Timeframe[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                timeframe === tf 
                                ? 'bg-white text-black shadow-sm border border-gray-100' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {tf === 'TODAY' ? 'Hoy' : tf === 'WEEK' ? 'Semana' : 'Mes'}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <IconLoader2 className="animate-spin text-gray-200" size={64} />
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Sincronizando datos...</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* APERTURA DE CAJA */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Apertura de Caja</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Dinero disponible al inicio del día</p>
                            </div>
                            <button onClick={() => { setAperturaForm({ efectivo: apertura?.efectivo?.toString() || '', mercadoPago: apertura?.mercadoPago?.toString() || '', santander: apertura?.santander?.toString() || '' }); setEditingApertura(true); }} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all">
                                {apertura ? 'Editar' : 'Registrar'}
                            </button>
                        </div>
                        {apertura ? (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100"><p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Efectivo</p><p className="text-2xl font-black text-emerald-700">${apertura.efectivo.toLocaleString('es-AR')}</p></div>
                                <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100"><p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-1">Mercado Pago</p><p className="text-2xl font-black text-sky-700">${apertura.mercadoPago.toLocaleString('es-AR')}</p></div>
                                <div className="bg-red-50 rounded-2xl p-5 border border-red-100"><p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Santander Río</p><p className="text-2xl font-black text-red-700">${apertura.santander.toLocaleString('es-AR')}</p></div>
                            </div>
                        ) : (
                            <p className="text-gray-400 font-bold text-sm">No registrada para hoy. Hacé clic en Registrar para ingresar el dinero en caja.</p>
                        )}
                    </div>

                    {/* RENDICION DE CAJA (ARQUEO) */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Rendición de Caja</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Control de cierre y arqueo de efectivo</p>
                            </div>
                            <button 
                                onClick={() => { 
                                    setRendicionForm({ 
                                        efectivoReal: rendicion?.efectivoReal?.toString() || '',
                                        mercadoPagoReal: rendicion?.mercadoPagoReal?.toString() || '',
                                        santanderReal: rendicion?.santanderReal?.toString() || ''
                                    }); 
                                    setEditingRendicion(true); 
                                }} 
                                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10"
                            >
                                {rendicion ? 'Ver Rendición' : 'Rendir Caja'}
                            </button>
                        </div>
                        {rendicion ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* EFECTIVO */}
                                <div className={`rounded-2xl p-5 border ${
                                    (rendicion.efectivoReal - ((apertura?.efectivo || 0) + stats.cash - (stats.totalExpenses + stats.totalPurchases))) >= 0 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                    : 'bg-red-50 border-red-100 text-red-700'
                                }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Dif. Efectivo</p>
                                        <p className="text-xs font-black">${rendicion.efectivoReal.toLocaleString('es-AR')}</p>
                                    </div>
                                    <p className="text-2xl font-black">
                                        ${(rendicion.efectivoReal - ((apertura?.efectivo || 0) + stats.cash - (stats.totalExpenses + stats.totalPurchases))).toLocaleString('es-AR')}
                                    </p>
                                </div>
                                {/* MERCADO PAGO */}
                                <div className={`rounded-2xl p-5 border ${
                                    (rendicion.mercadoPagoReal - ((apertura?.mercadoPago || 0) + stats.mercadoPago)) >= 0 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                    : 'bg-red-50 border-red-100 text-red-700'
                                }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Dif. Mercado Pago</p>
                                        <p className="text-xs font-black">${rendicion.mercadoPagoReal.toLocaleString('es-AR')}</p>
                                    </div>
                                    <p className="text-2xl font-black">
                                        ${(rendicion.mercadoPagoReal - ((apertura?.mercadoPago || 0) + stats.mercadoPago)).toLocaleString('es-AR')}
                                    </p>
                                </div>
                                {/* SANTANDER */}
                                <div className={`rounded-2xl p-5 border ${
                                    (rendicion.santanderReal - ((apertura?.santander || 0) + stats.santanderRio)) >= 0 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                    : 'bg-red-50 border-red-100 text-red-700'
                                }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Dif. Santander</p>
                                        <p className="text-xs font-black">${rendicion.santanderReal.toLocaleString('es-AR')}</p>
                                    </div>
                                    <p className="text-2xl font-black">
                                        ${(rendicion.santanderReal - ((apertura?.santander || 0) + stats.santanderRio)).toLocaleString('es-AR')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400 font-bold text-sm">Cierre de caja no realizado. Hacé clic en Rendir Caja al finalizar la jornada.</p>
                        )}
                    </div>

                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <SummaryCard 
                            title="Ingresos Brutos" 
                            amount={stats.totalSales} 
                            subtitle={`${stats.salesCount} pedidos`} 
                            icon={IconTrendingUp} 
                            color="emerald" 
                        />
                        <SummaryCard 
                            title="Compras Mercadería" 
                            amount={stats.totalPurchases} 
                            subtitle="Inversión en stock" 
                            icon={IconShoppingBag} 
                            color="amber" 
                        />
                        <SummaryCard 
                            title="Gastos Fijos" 
                            amount={stats.totalExpenses} 
                            subtitle="Sueldos y servicios" 
                            icon={IconReceipt} 
                            color="red" 
                        />
                        <SummaryCard 
                            title="Balance Neto" 
                            amount={stats.netBalance} 
                            subtitle="Margen de ganancia" 
                            icon={IconCurrencyDollar} 
                            color={stats.netBalance >= 0 ? "black" : "red-dark"} 
                            dark
                        />
                    </div>

                    {/* Main Analytics Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Breakdown Chart-like area */}
                        <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-12">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Medios de Pago</h3>
                                <button onClick={fetchReports} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                                    <IconRefresh size={18} className="text-gray-300" />
                                </button>
                            </div>

                            <div className="space-y-10">
                                <PaymentRow label="Efectivo" amount={stats.cash} percentage={cashPercentage} icon={IconWallet} color="bg-emerald-500" textColor="text-emerald-600" bgColor="bg-emerald-50" onClick={() => setDrillMethod('CASH')} />
                                <PaymentRow label="Mercado Pago" amount={stats.mercadoPago} percentage={mpPercentage} icon={IconCurrencyDollar} color="bg-sky-500" textColor="text-sky-600" bgColor="bg-sky-50" onClick={() => setDrillMethod('MERCADO_PAGO')} />
                                <PaymentRow label="Santander Río" amount={stats.santanderRio} percentage={santanderPercentage} icon={IconCreditCard} color="bg-red-500" textColor="text-red-600" bgColor="bg-red-50" onClick={() => setDrillMethod('SANTANDER_RIO')} />
                            </div>
                        </div>

                        {/* Profitability Column */}
                        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase mb-10">Rentabilidad</h3>
                            <div className="space-y-8 flex-1">
                                <div className="flex justify-between items-center group">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ingresos</span>
                                    <span className="text-lg font-black text-gray-900 flex items-center gap-2"><IconArrowUpRight size={16} className="text-emerald-500" /> ${stats.totalSales.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Egresos</span>
                                    <span className="text-lg font-bold text-red-500 flex items-center gap-2"><IconArrowDownRight size={16} className="text-red-500" /> -${(stats.totalExpenses + stats.totalPurchases).toLocaleString()}</span>
                                </div>
                                <div className="h-px bg-gray-50" />
                                <div className="flex justify-between items-center py-4 rounded-3xl bg-gray-50/50 px-6">
                                    <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Margen</span>
                                    <span className={`text-2xl font-black ${stats.netBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                        {stats.totalSales > 0 ? ((stats.netBalance / stats.totalSales) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </div>
                            
                            <div className="mt-8">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Meta Diaria: $250.000</p>
                                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden p-1">
                                    <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${Math.min(100, (stats.totalSales / 250000) * 100)}%` }} 
                                        className="h-full bg-black rounded-full" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Units Sold Section - Full Width Grid */}
                    <div className="w-full">
                         <div className="flex items-center gap-3 mb-8 ml-2">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                                <IconShoppingBag size={20} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Unidades Vendidas</h3>
                        </div>

                        {Object.keys(stats.productsByCategory).length === 0 ? (
                            <div className="bg-white p-20 rounded-[3rem] border border-gray-100 text-center">
                                <IconPackage size={40} className="mx-auto text-gray-100 mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No hay ventas registradas</p>
                            </div>
                        ) : (
                            <div className="space-y-4 pb-20">
                                {Object.entries(stats.productsByCategory)
                                    .map(([category, items]) => ({
                                        category,
                                        items,
                                        total: Object.values(items).reduce((a, b) => a + b, 0),
                                    }))
                                    .sort((a, b) => b.total - a.total)
                                    .map(({ category, items, total }, idx) => {
                                        const isOpen = openProductCategories[category] ?? idx === 0;
                                        const sortedItems = Object.entries(items).sort((a, b) => b[1] - a[1]);

                                        return (
                                            <motion.div
                                                key={category}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenProductCategories(prev => ({ ...prev, [category]: !isOpen }))}
                                                    className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="min-w-0">
                                                        <h4 className="text-base font-black text-gray-900 uppercase tracking-tight truncate">{category}</h4>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            {sortedItems.length} producto{sortedItems.length === 1 ? "" : "s"}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <span className="bg-gray-100 text-gray-900 px-3 py-1.5 rounded-full text-[10px] font-black">
                                                            {total} U.
                                                        </span>
                                                        <IconChevronDown className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} size={20} />
                                                    </div>
                                                </button>

                                                <AnimatePresence initial={false}>
                                                    {isOpen && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-6 pb-5">
                                                                <div className="rounded-2xl bg-gray-50/70 border border-gray-100 divide-y divide-gray-100">
                                                                    {sortedItems.map(([name, qty]) => (
                                                                        <div key={name} className="flex justify-between items-center gap-4 px-4 py-3">
                                                                            <span className="text-sm font-bold text-gray-600 truncate">{name}</span>
                                                                            <span className="font-black text-gray-950 text-sm shrink-0">x{qty}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>

                    {/* ── HISTORIAL DE ÓRDENES ── */}
                    <div className="w-full">
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                <button
                                    type="button"
                                    onClick={() => setShowOrdersHistory(v => !v)}
                                    className="flex items-center gap-3 text-left"
                                >
                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-[#FFD60A]">
                                        <IconReceipt size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Historial de Órdenes</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {visibleReportOrders.length} de {stats.orders.length} órdenes · Reimprimir ticket o emitir factura
                                        </p>
                                    </div>
                                    <IconChevronDown className={`text-gray-400 transition-transform ${showOrdersHistory ? "rotate-180" : ""}`} size={22} />
                                </button>

                                <div className="flex flex-col gap-3 sm:flex-row xl:w-[34rem]">
                                    <select
                                        value={ordersMethodFilter}
                                        onChange={e => {
                                            setOrdersMethodFilter(e.target.value);
                                            setShowOrdersHistory(true);
                                        }}
                                        className="h-12 rounded-2xl border border-gray-100 bg-gray-50 px-4 text-xs font-black uppercase tracking-widest text-gray-700 outline-none focus:border-gray-300"
                                    >
                                        <option value="ALL">Todos</option>
                                        <option value="CASH">Efectivo</option>
                                        <option value="MERCADO_PAGO">Mercado Pago</option>
                                        <option value="SANTANDER_RIO">Santander</option>
                                        <option value="CUENTA_CORRIENTE">Cuenta corriente</option>
                                    </select>
                                    <input
                                        value={ordersSearch}
                                        onChange={e => {
                                            setOrdersSearch(e.target.value);
                                            setShowOrdersHistory(true);
                                        }}
                                        placeholder="Buscar cliente, mesa o producto..."
                                        className="h-12 flex-1 rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-bold outline-none focus:border-gray-300"
                                    />
                                </div>
                            </div>

                            <AnimatePresence initial={false}>
                                {showOrdersHistory && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                        {stats.orders.length === 0 ? (
                                            <div className="p-20 border-t border-gray-100 text-center">
                                                <IconReceipt size={40} className="mx-auto text-gray-100 mb-4" />
                                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No hay órdenes registradas</p>
                                            </div>
                                        ) : visibleReportOrders.length === 0 ? (
                                            <div className="p-16 border-t border-gray-100 text-center">
                                                <IconReceipt size={36} className="mx-auto text-gray-100 mb-4" />
                                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No hay coincidencias</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 p-5 pt-0 max-h-[42rem] overflow-y-auto">
                                                {visibleReportOrders.map((order: any) => {
                                    const createdAt = order.created_at ? new Date(order.created_at) : null;
                                    const timeLabel = createdAt
                                        ? createdAt.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' })
                                        : '—';
                                    const dateLabel = createdAt
                                        ? createdAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                                        : '';
                                    const items = Array.isArray(order.items) ? order.items : [];
                                    const hasFactura = !!order.cae && !!order.voucher_number;

                                    return (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-gray-50/70 rounded-[2rem] p-6 border border-gray-100 hover:border-gray-200 transition-all"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-black text-gray-900 uppercase tracking-tight">
                                                            {order.customer_name ? `👤 ${order.customer_name}` : `Mesa ${order.table_id ?? '—'}`}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400">
                                                            {dateLabel} {timeLabel}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                                            order.payment_method === 'CASH' ? 'bg-emerald-50 text-emerald-600' :
                                                            order.payment_method === 'MERCADO_PAGO' ? 'bg-sky-50 text-sky-600' :
                                                            order.payment_method === 'SANTANDER_RIO' || order.payment_method === 'BANK_TRANSFER' ? 'bg-red-50 text-red-600' :
                                                            'bg-gray-100 text-gray-500'
                                                        }`}>
                                                            {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                                                        </span>
                                                        {hasFactura && (
                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-green-50 text-green-600 border border-green-100">
                                                                Facturada
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mb-1">
                                                        {items.filter((i: any) => i.id !== 'meta-customer').slice(0, 6).map((item: any, idx: number) => (
                                                            <span key={idx} className="text-[10px] font-bold bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">
                                                                {item.quantity > 1 ? `x${item.quantity} ` : ''}{item.name}
                                                            </span>
                                                        ))}
                                                        {items.length > 6 && (
                                                            <span className="text-[10px] font-bold text-gray-400">+{items.length - 6} más</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <p className="text-xl font-black text-gray-900 tracking-tighter">${Number(order.total).toLocaleString('es-AR')}</p>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => handleReprintTicket(order)}
                                                            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-900 hover:text-white transition-all active:scale-90"
                                                            title="Reimprimir Ticket"
                                                        >
                                                            <IconPrinter size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReprintFactura(order)}
                                                            disabled={isEmittingFactura}
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                                                                hasFactura
                                                                    ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                                                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                                            } disabled:opacity-30`}
                                                            title={hasFactura ? 'Reimprimir Factura C' : 'Emitir Factura C'}
                                                        >
                                                            {isEmittingFactura ? <IconLoader2 size={18} className="animate-spin" /> : <IconFileInvoice size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            )}

            {/* DRILL-DOWN MODAL */}
            <AnimatePresence>
                {drillMethod && (
                    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrillMethod(null)} />
                        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="relative bg-white rounded-[2rem] w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 uppercase">{drillMethod === 'CASH' ? 'Efectivo' : drillMethod === 'MERCADO_PAGO' ? 'Mercado Pago' : drillMethod === 'SANTANDER_RIO' ? 'Santander Río' : drillMethod}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{drillOrders.length} operaciones</p>
                                </div>
                                <button onClick={() => setDrillMethod(null)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
                            </div>
                            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                                {drillOrders.length === 0 ? (
                                    <p className="text-center text-gray-400 font-bold py-12 text-sm">Sin operaciones</p>
                                ) : drillOrders.map((order: any) => (
                                    <div key={order.id} className="p-5">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                                                {order.customer_name ? `👤 ${order.customer_name}` : `Mesa ${order.table_id ?? '—'}`}
                                            </span>
                                            <span className="text-base font-black text-gray-900">${Number(order.total).toLocaleString('es-AR')}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {(order.items as any[] || []).map((item: any, idx: number) => (
                                                <span key={idx} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                    {item.quantity > 1 ? `x${item.quantity} ` : ''}{item.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* APERTURA EDIT MODAL */}
            <AnimatePresence>
                {editingApertura && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingApertura(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl">
                            <h3 className="text-xl font-black mb-6">Apertura de Caja</h3>
                            <div className="space-y-4 mb-6">
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Efectivo ($)</label><input type="number" value={aperturaForm.efectivo} onChange={e => setAperturaForm(f => ({ ...f, efectivo: e.target.value }))} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" placeholder="0" /></div>
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mercado Pago ($)</label><input type="number" value={aperturaForm.mercadoPago} onChange={e => setAperturaForm(f => ({ ...f, mercadoPago: e.target.value }))} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" placeholder="0" /></div>
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Santander Río ($)</label><input type="number" value={aperturaForm.santander} onChange={e => setAperturaForm(f => ({ ...f, santander: e.target.value }))} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" placeholder="0" /></div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setEditingApertura(false)} className="flex-1 h-12 rounded-xl bg-gray-100 font-black text-gray-400 text-xs uppercase">Cancelar</button>
                                <button onClick={saveApertura} className="flex-[2] h-12 rounded-xl bg-black text-white font-black text-xs uppercase">Guardar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* RENDICION EDIT MODAL */}
            <AnimatePresence>
                {editingRendicion && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingRendicion(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-[3rem] p-8 w-full max-w-2xl shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-black mb-2 uppercase tracking-tight text-gray-900">Rendición de Caja</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Arqueo de efectivo y billeteras al cierre</p>
                            
                            <div className="space-y-8 mb-10">
                                {/* EFECTIVO SECTION */}
                                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">💵 Efectivo</h4>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Esperado</p>
                                            <p className="text-xl font-black text-gray-900">${((apertura?.efectivo || 0) + stats.cash - (stats.totalExpenses + stats.totalPurchases)).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-1">
                                            <p className="text-[9px] text-gray-400 uppercase font-black mb-1">Físico Contado</p>
                                            <input 
                                                type="number" 
                                                value={rendicionForm.efectivoReal} 
                                                onChange={e => setRendicionForm(f => ({...f, efectivoReal: e.target.value}))} 
                                                className="w-full h-14 px-4 rounded-xl bg-white border border-gray-200 focus:ring-2 ring-emerald-500/20 font-black text-xl text-gray-900 outline-none" 
                                                placeholder="0" 
                                            />
                                        </div>
                                        {rendicionForm.efectivoReal && (
                                            <div className={`flex-1 p-3 rounded-xl border text-center ${
                                                (parseFloat(rendicionForm.efectivoReal) - ((apertura?.efectivo || 0) + stats.cash - (stats.totalExpenses + stats.totalPurchases))) >= 0
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                                            }`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5">Dif.</p>
                                                <p className="text-lg font-black">${(parseFloat(rendicionForm.efectivoReal) - ((apertura?.efectivo || 0) + stats.cash - (stats.totalExpenses + stats.totalPurchases))).toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* MERCADO PAGO SECTION */}
                                <div className="bg-sky-50/50 p-6 rounded-3xl border border-sky-100/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-black uppercase tracking-widest text-sky-900">📱 Mercado Pago</h4>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Esperado</p>
                                            <p className="text-xl font-black text-sky-900">${((apertura?.mercadoPago || 0) + stats.mercadoPago).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-1">
                                            <p className="text-[9px] text-sky-500 uppercase font-black mb-1">Monto en App</p>
                                            <input 
                                                type="number" 
                                                value={rendicionForm.mercadoPagoReal} 
                                                onChange={e => setRendicionForm(f => ({...f, mercadoPagoReal: e.target.value}))} 
                                                className="w-full h-14 px-4 rounded-xl bg-white border border-sky-200 focus:ring-2 ring-sky-500/20 font-black text-xl text-sky-900 outline-none" 
                                                placeholder="0" 
                                            />
                                        </div>
                                        {rendicionForm.mercadoPagoReal && (
                                            <div className={`flex-1 p-3 rounded-xl border text-center ${
                                                (parseFloat(rendicionForm.mercadoPagoReal) - ((apertura?.mercadoPago || 0) + stats.mercadoPago)) >= 0
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                                            }`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5">Dif.</p>
                                                <p className="text-lg font-black">${(parseFloat(rendicionForm.mercadoPagoReal) - ((apertura?.mercadoPago || 0) + stats.mercadoPago)).toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* SANTANDER SECTION */}
                                <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-black uppercase tracking-widest text-red-900">🏦 Santander</h4>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Esperado</p>
                                            <p className="text-xl font-black text-red-900">${((apertura?.santander || 0) + stats.santanderRio).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-1">
                                            <p className="text-[9px] text-red-500 uppercase font-black mb-1">Monto en Cuenta</p>
                                            <input 
                                                type="number" 
                                                value={rendicionForm.santanderReal} 
                                                onChange={e => setRendicionForm(f => ({...f, santanderReal: e.target.value}))} 
                                                className="w-full h-14 px-4 rounded-xl bg-white border border-red-200 focus:ring-2 ring-red-500/20 font-black text-xl text-red-900 outline-none" 
                                                placeholder="0" 
                                            />
                                        </div>
                                        {rendicionForm.santanderReal && (
                                            <div className={`flex-1 p-3 rounded-xl border text-center ${
                                                (parseFloat(rendicionForm.santanderReal) - ((apertura?.santander || 0) + stats.santanderRio)) >= 0
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                                            }`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5">Dif.</p>
                                                <p className="text-lg font-black">${(parseFloat(rendicionForm.santanderReal) - ((apertura?.santander || 0) + stats.santanderRio)).toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setEditingRendicion(false)} className="flex-1 h-14 rounded-2xl bg-gray-100 font-black text-gray-400 text-xs uppercase tracking-widest">Cerrar</button>
                                <button onClick={saveRendicion} className="flex-[2] h-14 rounded-2xl bg-black text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-black/10">Guardar Cierre</button>
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
                        // Refresh to show updated factura badge
                        fetchReports();
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

// Subcomponentes para Limpieza de Código

function SummaryCard({ title, amount, subtitle, icon: Icon, color, dark }: any) {
    const colors: any = {
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        red: "bg-red-50 text-red-600",
        black: "bg-white/10 text-white",
        "red-dark": "bg-red-500/10 text-red-400"
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${dark ? "bg-black text-white" : "bg-white border border-gray-100"} p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group`}>
            <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{title}</p>
            <h4 className="text-3xl font-black tracking-tighter">${amount.toLocaleString()}</h4>
            <p className={`text-xs font-bold mt-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>{subtitle}</p>
            {dark && <div className="absolute top-[-20%] right-[-10%] opacity-5"><Icon size={120} /></div>}
        </motion.div>
    );
}

function PaymentRow({ label, amount, percentage, icon: Icon, color, textColor, bgColor, onClick }: any) {
    return (
        <div className="group cursor-pointer" onClick={onClick}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${bgColor} ${textColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-900 leading-none">{label}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{percentage.toFixed(1)}% de los ingresos</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-gray-900 tracking-tighter">${amount.toLocaleString()}</p>
                </div>
            </div>
            <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={`h-full ${color} shadow-sm`} />
            </div>
        </div>
    );
}
