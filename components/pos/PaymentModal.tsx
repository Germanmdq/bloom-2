"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { IconLoader2 } from "@tabler/icons-react";
import { CartItem } from "@/lib/store/order-store";
import { PaymentMethod } from "@/lib/types";
import { IconSearch, IconX, IconUser } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";

interface PaymentModalProps {
    tableId: number;
    total: number;
    finalTotal: number;
    discount: number;
    setDiscount: (v: number) => void;
    paymentMethod: PaymentMethod;
    setPaymentMethod: (m: PaymentMethod) => void;
    cart: CartItem[];
    isFinishing: boolean;
    onClose: () => void;
    onConfirm: (ctx?: { mpOrderId?: string | null; customerId?: string | null; printFactura?: boolean }) => void;
    onMpOrderReady?: (orderId: string | null) => void;
    waiterId?: string | null;
    selectedCustomerId?: string | null;
    setSelectedCustomerId?: (id: string | null) => void;
    customerName?: string;
    setCustomerName?: (name: string) => void;
}

export function PaymentModal({
    tableId,
    total,
    finalTotal,
    discount,
    setDiscount,
    paymentMethod,
    setPaymentMethod,
    cart,
    isFinishing,
    onClose,
    onConfirm,
    waiterId = null,
    selectedCustomerId,
    setSelectedCustomerId,
    customerName,
    setCustomerName
}: PaymentModalProps) {
    const supabase = createClient();
    const [willPrintFactura, setWillPrintFactura] = useState(false);

    const [q, setQ] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [clienteStamps, setClienteStamps] = useState<number | null>(null);

    const handleSearch = async (val: string) => {
        setQ(val);
        if (val.length < 2) { setResults([]); return; }
        setIsSearching(true);
        const isPhone = /^\d+$/.test(val.replace(/\s/g, ''));
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, balance, coffee_stamps, phone')
            .or(isPhone
                ? `phone.ilike.%${val.replace(/\s/g, '')}%`
                : `full_name.ilike.%${val}%,phone.ilike.%${val}%`)
            .limit(4);
        setResults(data || []);
        setIsSearching(false);
    };

    useEffect(() => {
        if (!selectedCustomerId) { setClienteStamps(null); return; }
        supabase.from('profiles').select('coffee_stamps').eq('id', selectedCustomerId).maybeSingle()
            .then(({ data }) => setClienteStamps(data?.coffee_stamps ?? null));
    }, [selectedCustomerId]);

    const coffeeCountInCart = cart.reduce((acc, item) => {
        const n = item.name.toLowerCase();
        const esCafe = n.includes('café') || n.includes('cafe') ||
            n.includes('capuccino') || n.includes('submarino') ||
            n.includes('chocolatada') || n.includes('lágrima') || n.includes('lagrima');
        return esCafe ? acc + item.quantity : acc;
    }, 0);

    const stampsConCarrito = (clienteStamps ?? 0) + coffeeCountInCart;
    const cafeGratisDisponible = clienteStamps !== null && stampsConCarrito >= 10;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-12">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-white w-full max-w-5xl max-h-[96dvh] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!isFinishing && !(paymentMethod === "CUENTA_CORRIENTE" && !selectedCustomerId && !customerName)) {
                            onConfirm({ customerId: selectedCustomerId, printFactura: willPrintFactura });
                        }
                    }}
                    className="flex flex-col md:flex-row w-full h-full"
                >
                <div className="md:w-1/3 bg-[#FFD60A] p-7 flex flex-col justify-between relative overflow-hidden">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-widest opacity-40 mb-2">Total a Cobrar</h3>
                        <p className="text-6xl font-black tracking-tighter text-black mb-8">${finalTotal.toLocaleString()}</p>
                    </div>
                    {discount > 0 && (
                        <div className="flex flex-col gap-1 bg-black/5 p-4 rounded-xl">
                            <span className="text-[10px] font-black uppercase opacity-40">Descuento aplicado</span>
                            <span className="text-2xl font-black text-black">-${Math.round(total * (discount / 100)).toLocaleString()}</span>
                        </div>
                    )}
                    <div className="mt-8">
                        <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Detalles</p>
                        <div className="text-sm font-bold flex flex-col gap-1">
                            <span>Items: {cart.length}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 md:p-8 bg-white flex flex-col overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Método de Pago</h3>
                        {waiterId && (
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mozo</span>
                                <span className="text-xs font-bold text-gray-700">Enviado</span>
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        {!selectedCustomerId && !customerName ? (
                            <div className="relative">
                                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={q}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && results.length > 0) {
                                            const cust = results[0];
                                            setSelectedCustomerId?.(cust.id);
                                            setCustomerName?.(cust.full_name);
                                            setResults([]);
                                            setQ("");
                                            e.preventDefault();
                                        }
                                    }}
                                    placeholder="Vincular cliente seleccionado..."
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-black/5 focus:bg-white transition-all"
                                />
                                {isSearching && <IconLoader2 className="absolute right-4 top-1/3 h-4 w-4 animate-spin text-gray-400" />}
                                {results.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[110] overflow-hidden divide-y divide-gray-50">
                                        {results.map(cust => (
                                            <button
                                                key={cust.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCustomerId?.(cust.id);
                                                    setCustomerName?.(cust.full_name);
                                                    setResults([]);
                                                    setQ("");
                                                }}
                                                className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors flex justify-between items-center group"
                                            >
                                                <div>
                                                    <p className="font-bold text-gray-900">{cust.full_name}</p>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{cust.phone || 'Sin teléfono'}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {Number(cust.coffee_stamps || 0) >= 10 && (
                                                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">☕ CAFÉ GRATIS</span>
                                                    )}
                                                    {Number(cust.balance || 0) > 0 && (
                                                        <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100">DEUDOR: ${Number(cust.balance).toLocaleString()}</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-2xl border border-black shadow-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                            <IconUser size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white leading-none">{customerName}</p>
                                            <p className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-wider">
                                                {clienteStamps !== null ? `${Math.min(stampsConCarrito, 10)}/10 cafés` : 'Cliente Vinculado'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomerId?.(null);
                                            setCustomerName?.("");
                                            setClienteStamps(null);
                                        }}
                                        className="p-2 rounded-xl hover:bg-white/10 text-white/40 transition-colors"
                                    >
                                        <IconX size={18} />
                                    </button>
                                </div>
                                {cafeGratisDisponible && (
                                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500 text-white font-black text-sm animate-pulse">
                                        <span className="text-xl">☕</span>
                                        <span>¡CAFÉ GRATIS! Descontá 1 café del total antes de cobrar.</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 mb-4">
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("CASH")}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === "CASH" ? "border-[#FFD60A] bg-[#FFD60A]/5" : "border-gray-100"}`}
                            >
                                <p className="font-black text-sm">Efectivo</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Cash</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("MERCADO_PAGO")}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === "MERCADO_PAGO" ? "border-sky-500 bg-sky-50" : "border-gray-100"}`}
                            >
                                <p className="font-black text-sm">Mercado Pago</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">QR manual</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("SANTANDER_RIO")}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === "SANTANDER_RIO" ? "border-red-500 bg-red-50" : "border-gray-100"}`}
                            >
                                <p className="font-black text-sm">Santander</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Río</p>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("CUENTA_CORRIENTE")}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${paymentMethod === "CUENTA_CORRIENTE" ? "border-orange-500 bg-orange-50" : "border-gray-100"}`}
                            >
                                <p className="font-black text-sm">Cta. Corriente</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Clientes</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setWillPrintFactura(v => !v)}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${willPrintFactura ? "border-purple-500 bg-purple-50" : "border-gray-100"}`}
                            >
                                <p className="font-black text-sm">Factura C</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{willPrintFactura ? "✓ Activo" : "Imprimir"}</p>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-gray-50 rounded-3xl p-8 flex items-center justify-center border border-gray-100 mb-4 overflow-y-auto">
                        {paymentMethod === "CASH" && (
                            <input
                                type="number"
                                placeholder={Math.round(finalTotal).toString()}
                                className="text-4xl font-black text-center bg-transparent outline-none w-full"
                                autoFocus
                            />
                        )}
                        {paymentMethod === "MERCADO_PAGO" && (
                            <div className="text-center space-y-2">
                                <p className="text-4xl">📱</p>
                                <p className="text-sm font-black text-sky-600 uppercase tracking-widest">Mercado Pago</p>
                                <p className="text-xs font-semibold text-gray-400">Cobrá con tu QR y confirmá cuando el cliente pague.</p>
                                {cafeGratisDisponible && (
                                    <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl mt-2">☕ Café gratis — aplicá el descuento en MP antes de cobrar</p>
                                )}
                            </div>
                        )}
                        {paymentMethod === "SANTANDER_RIO" && (
                            <div className="text-center">
                                <p className="text-sm font-bold text-red-600 uppercase tracking-widest mb-2">Santander Río</p>
                                <p className="text-xs font-semibold text-gray-400">Verificá el comprobante o el ingreso en la cuenta antes de confirmar.</p>
                            </div>
                        )}
                        {paymentMethod === "CUENTA_CORRIENTE" && (
                            <div className="text-center">
                                <p className="text-sm font-bold text-orange-600 uppercase tracking-widest mb-2">Cuenta Corriente</p>
                                {customerName ? (
                                    <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-3 mt-2">
                                        <p className="text-xs font-black text-orange-400 uppercase tracking-widest mb-0.5">Se carga a</p>
                                        <p className="text-lg font-black text-orange-700">{customerName}</p>
                                        <p className="text-xs font-bold text-orange-400 mt-1">El total se suma al saldo pendiente</p>
                                    </div>
                                ) : (
                                    <p className="text-xs font-semibold text-red-400">Buscá y vinculá un cliente arriba para continuar.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl bg-gray-50 text-gray-400 font-bold hover:bg-gray-100"
                        >
                            Volver
                        </button>
                        <button
                            type="submit"
                            disabled={isFinishing || (paymentMethod === "CUENTA_CORRIENTE" && !selectedCustomerId && !customerName)}
                            className={`flex-[2] py-4 rounded-2xl font-black hover:scale-[1.02] disabled:opacity-20 shadow-xl transition-all ${
                                paymentMethod === "CUENTA_CORRIENTE" && !selectedCustomerId && !customerName
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-black text-[#FFD60A]"
                            }`}
                        >
                            {isFinishing ? "..." : (paymentMethod === "CUENTA_CORRIENTE" && !selectedCustomerId && !customerName ? "Seleccionar Cliente" : "Confirmar Venta")}
                        </button>
                    </div>
                </div>
                </form>
            </motion.div>
        </div>
    );
}
