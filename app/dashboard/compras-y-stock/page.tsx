"use client";

import { useState, useMemo } from "react";
import {
    useProveedores, useInsumos, useInsumosByProveedor,
    useRegistrarCompra, useGastosFijosPendientes, useGastosFijos,
    useMarcarGastoPagado, useCreateProveedor, useCreateInsumo,
    usePagarSaldoProveedor, useUpdateGastoFijo, useCreateGastoFijo
} from "@/lib/hooks/use-compras-stock";
import {
    IconLoader2, IconAlertTriangle, IconCalendarDue, IconCash,
    IconCreditCard, IconPackage, IconShoppingCart, IconUsers,
    IconPlus, IconCheck, IconX, IconSearch, IconReceipt,
    IconBuildingStore, IconChevronDown, IconCoin, IconFileInvoice
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertasVencimientos } from "./AlertasVencimientos";
import { FormularioCompra } from "./FormularioCompra";
import { GestionPanel } from "./GestionPanel";


interface Proveedor { id: string; nombre: string; cuit: string | null; saldo_cc: number; telefono: string | null; }
interface Gasto { id: string; nombre: string; monto: number; fecha_vencimiento: string; estado: string; categoria: string; }

export default function ComprasYStockPage() {
    const { data: proveedores = [], isLoading: loadProv } = useProveedores();
    const { data: insumos = [], isLoading: loadIns } = useInsumos();
    const { data: gastosPendientes = [], isLoading: loadGastos } = useGastosFijosPendientes();
    const { data: gastosFijosTodos = [], isLoading: loadGastosTodos } = useGastosFijos();

    if (loadProv || loadIns || loadGastos || loadGastosTodos) {
        return (
            <div className="h-full flex items-center justify-center">
                <IconLoader2 className="animate-spin text-gray-300" size={64} />
            </div>
        );
    }

    return (
        <div className="pb-40">
            {/* HEADER */}
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-1 uppercase">
                        Compras & Stock
                    </h1>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em]">
                        Proveedores · Insumos · Gastos Fijos
                    </p>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            // Find the GestionPanel and trigger provider modal
                            window.dispatchEvent(new CustomEvent('open-provider-modal'));
                        }}
                        className="h-12 px-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                    >
                        <IconUsers size={16} /> + Proveedor
                    </button>
                    <button 
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('open-gasto-modal'));
                        }}
                        className="h-12 px-6 rounded-2xl bg-black text-white shadow-xl shadow-black/10 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                    >
                        <IconReceipt size={16} /> + Gasto
                    </button>
                </div>
            </header>

            {/* BLOQUE A: Gastos Fijos — siempre visibles */}
            <AlertasVencimientos gastos={gastosFijosTodos} />

            {/* BLOQUE B: Formulario de Compra */}
            <FormularioCompra proveedores={proveedores} />

            {/* BLOQUE C: Gestión Insumos, Proveedores & Compras */}
            <GestionPanel proveedores={proveedores} insumos={insumos} gastos={gastosFijosTodos} />
        </div>
    );
}
