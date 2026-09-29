"use client";

import { useState, useMemo } from "react";
import { 
    useInventoryMovements, 
    useSuppliers,
    useProducts
} from "@/lib/hooks/use-pos-data";
import { 
    IconLoader2, IconSearch, IconCalendar, IconUsers, IconPackage, IconHistory, IconFilter, IconArrowUpRight, IconArrowDownLeft, IconRefresh
} from "@tabler/icons-react";
import { motion } from "framer-motion";

type Timeframe = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';

export default function HistoryStockPage() {
    const { data: movements = [], isLoading: movementsLoading, refetch } = useInventoryMovements();
    const { data: suppliers = [] } = useSuppliers();
    const { data: products = [] } = useProducts();

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [supplierFilter, setSupplierFilter] = useState("");
    const [timeframe, setTimeframe] = useState<Timeframe>('ALL');

    const filteredMovements = useMemo(() => {
        return movements.filter((mov: any) => {
            // Product IconSearch
            const productName = mov.products?.name?.toLowerCase() || "";
            const matchesProduct = productName.includes(searchTerm.toLowerCase());
            
            // Supplier IconFilter
            const matchesSupplier = !supplierFilter || mov.supplier_id === supplierFilter;
            
            // Timeframe IconFilter
            if (!matchesProduct || !matchesSupplier) return false;
            if (timeframe === 'ALL') return true;
            
            const movDate = new Date(mov.created_at);
            const now = new Date();
            
            if (timeframe === 'TODAY') {
                return movDate.toDateString() === now.toDateString();
            }
            if (timeframe === 'WEEK') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return movDate >= oneWeekAgo;
            }
            if (timeframe === 'MONTH') {
                const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return movDate >= oneMonthAgo;
            }
            return true;
        });
    }, [movements, searchTerm, supplierFilter, timeframe]);

    if (movementsLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-40 gap-4">
                <IconLoader2 className="animate-spin text-gray-200" size={64} />
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Cargando Historial...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-40">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-1 uppercase">Historial de Stock</h1>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em]">Auditoría de Insumos y Movimientos</p>
                </div>
                <button 
                    onClick={() => refetch()}
                    className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-black hover:rotate-180 transition-all duration-500"
                >
                    <IconRefresh size={20} />
                </button>
            </header>

            {/* FILTERS BAR */}
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 mb-10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* IconSearch by Product */}
                    <div className="relative">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Buscar Producto</label>
                        <div className="relative">
                            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Nombre del insumo..."
                                className="w-full h-12 pl-12 pr-4 rounded-xl bg-gray-50 border-none font-bold text-sm outline-none focus:ring-2 ring-black/5"
                            />
                        </div>
                    </div>

                    {/* IconFilter by Supplier */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Filtrar Proveedor</label>
                        <div className="relative">
                            <IconUsers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                            <select 
                                value={supplierFilter}
                                onChange={(e) => setSupplierFilter(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 rounded-xl bg-gray-50 border-none font-bold text-sm outline-none appearance-none cursor-pointer focus:ring-2 ring-black/5"
                            >
                                <option value="">Todos los Proveedores</option>
                                {suppliers.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Timeframe */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Rango Temporal</label>
                        <div className="flex bg-gray-50 p-1 rounded-xl h-12">
                            {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as Timeframe[]).map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={`flex-1 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${
                                        timeframe === tf 
                                        ? 'bg-white text-black shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    {tf === 'ALL' ? 'Todo' : tf === 'TODAY' ? 'Hoy' : tf === 'WEEK' ? 'Semana' : 'Mes'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-[3rem] shadow-sm overflow-hidden border border-gray-100">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Fecha / Hora</th>
                            <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Insumo</th>
                            <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Cantidad</th>
                            <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Motivo</th>
                            <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Proveedor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-bold">
                        {filteredMovements.map((mov: any) => (
                            <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="p-8 text-sm text-gray-400">
                                    {new Date(mov.created_at).toLocaleString('es-AR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </td>
                                <td className="p-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                            <IconPackage size={14} />
                                        </div>
                                        <span className="text-gray-900">{mov.products?.name}</span>
                                    </div>
                                </td>
                                <td className={`p-8 text-right`}>
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-black ${mov.qty > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {mov.qty > 0 ? <IconArrowUpRight size={14} /> : <IconArrowDownLeft size={14} />}
                                        {mov.qty > 0 ? '+' : ''}{mov.qty} <span className="text-[10px] uppercase">{mov.products?.unit}</span>
                                    </div>
                                </td>
                                <td className="p-8">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                                        ${mov.reason === 'sale' ? 'bg-blue-50 text-blue-600' :
                                            mov.reason === 'purchase' ? 'bg-green-50 text-green-600' :
                                                mov.reason === 'waste' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {mov.reason === 'sale' ? 'Venta' : mov.reason === 'purchase' ? 'Compra' : mov.reason === 'waste' ? 'Merma' : mov.reason}
                                    </span>
                                </td>
                                <td className="p-8">
                                    {mov.suppliers ? (
                                        <div className="flex items-center gap-2 text-emerald-600">
                                            <IconUsers size={14} className="opacity-50" />
                                            <span className="text-xs uppercase tracking-tight font-black">{mov.suppliers.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 font-bold italic">{mov.reason === 'sale' ? 'Sistema' : 'Manual'}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredMovements.length === 0 && (
                    <div className="p-32 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <IconHistory size={40} className="text-gray-200" />
                        </div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No se encontraron movimientos con estos filtros</p>
                        <button onClick={() => {setSearchTerm(""); setSupplierFilter(""); setTimeframe('ALL');}} className="mt-4 text-emerald-600 text-xs font-black uppercase hover:underline">Limpiar filtros</button>
                    </div>
                )}
            </div>
        </div>
    );
}
