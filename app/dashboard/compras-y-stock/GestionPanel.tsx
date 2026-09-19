"use client";

import { useState, useMemo, useEffect } from "react";
import { usePagarSaldoProveedor, useUpdateGastoFijo, useCreateGastoFijo, useDeleteGastoFijo, useCompras, useCreateProveedor, useUpdateProveedor } from "@/lib/hooks/use-compras-stock";
import { IconPackage, IconUsers, IconSearch, IconAlertTriangle, IconCoin, IconReceipt, IconPlus, IconX, IconEdit, IconTrash, IconDownload, IconShoppingCart, IconChevronDown } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

interface Proveedor { id: string; nombre: string; cuit: string | null; saldo_cc: number; telefono: string | null; }
interface Insumo { id: string; nombre: string; unidad: string; stock_actual: number; stock_minimo: number; precio_ultima_compra: number; categoria: string; proveedores: { id: string; nombre: string } | null; }
interface Gasto { id: string; nombre: string; monto: number; fecha_vencimiento: string; estado: string; categoria: string; }

export function GestionPanel({ proveedores, insumos, gastos }: { proveedores: Proveedor[]; insumos: Insumo[]; gastos: Gasto[] }) {
    const [tab, setTab] = useState<'insumos' | 'proveedores' | 'compras' | 'gastos'>('insumos');
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("Todos");
    const [pagoModal, setPagoModal] = useState<Proveedor | null>(null);
    const [montoPago, setMontoPago] = useState("");
    const [motivoPago, setMotivoPago] = useState("");
    const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
    const [gastoModal, setGastoModal] = useState<Partial<Gasto> | null>(null);
    const [proveedorModal, setProveedorModal] = useState<Partial<Proveedor> | null>(null);
    const [openInsumoGroups, setOpenInsumoGroups] = useState<Record<string, boolean>>({ "Bajo stock": true });
    const [openProveedorGroups, setOpenProveedorGroups] = useState<Record<string, boolean>>({ deuda: true, alDia: false });

    const { data: compras = [] } = useCompras();
    const pagarSaldo = usePagarSaldoProveedor();
    const updateGasto = useUpdateGastoFijo();
    const createGasto = useCreateGastoFijo();
    const deleteGasto = useDeleteGastoFijo();
    const createProveedor = useCreateProveedor();
    const updateProveedor = useUpdateProveedor();

    const categorias = useMemo(() => {
        const cats = new Set(insumos.map((i: any) => i.categoria || 'General'));
        return ['Todos', ...Array.from(cats).sort()];
    }, [insumos]);

    useEffect(() => {
        const handleOpenProvider = () => {
            setTab('proveedores');
            setProveedorModal({ nombre: '', cuit: '', telefono: '' });
        };
        const handleOpenGasto = () => {
            setTab('gastos');
            setGastoModal({ nombre: '', monto: 0, fecha_vencimiento: new Date().toISOString().split('T')[0], categoria: 'normal' });
        };

        window.addEventListener('open-provider-modal', handleOpenProvider);
        window.addEventListener('open-gasto-modal', handleOpenGasto);

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (pagoModal) setPagoModal(null);
                else if (gastoModal) setGastoModal(null);
                else if (proveedorModal) setProveedorModal(null);
            }
        };
        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('open-provider-modal', handleOpenProvider);
            window.removeEventListener('open-gasto-modal', handleOpenGasto);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [pagoModal, gastoModal, proveedorModal]);

    const filtered = useMemo(() => {
        return insumos.filter((i: any) => {
            const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase());
            const matchCat = catFilter === 'Todos' || i.categoria === catFilter;
            return matchSearch && matchCat;
        });
    }, [insumos, search, catFilter]);

    const filteredProveedores = useMemo(() => {
        return proveedores.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));
    }, [proveedores, search]);

    const groupedInsumos = useMemo(() => {
        const groups: Record<string, Insumo[]> = {};
        filtered.forEach((insumo: any) => {
            const isLow = Number(insumo.stock_actual || 0) <= Number(insumo.stock_minimo || 0);
            const groupName = isLow ? "Bajo stock" : (insumo.categoria || "General");
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(insumo);
        });
        return Object.entries(groups)
            .map(([name, items]) => ({
                name,
                items: [...items].sort((a: any, b: any) => String(a.nombre).localeCompare(String(b.nombre))),
                low: name === "Bajo stock",
            }))
            .sort((a, b) => Number(b.low) - Number(a.low) || a.name.localeCompare(b.name));
    }, [filtered]);

    const proveedoresConDeuda = useMemo(
        () => [...filteredProveedores]
            .filter(p => Number(p.saldo_cc || 0) > 0)
            .sort((a, b) => Number(b.saldo_cc || 0) - Number(a.saldo_cc || 0)),
        [filteredProveedores]
    );

    const proveedoresAlDia = useMemo(
        () => [...filteredProveedores]
            .filter(p => Number(p.saldo_cc || 0) <= 0)
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        [filteredProveedores]
    );

    const toggleInsumoGroup = (name: string) => {
        setOpenInsumoGroups(prev => ({ ...prev, [name]: !(prev[name] ?? name === "Bajo stock") }));
    };

    const toggleProveedorGroup = (name: "deuda" | "alDia") => {
        setOpenProveedorGroups(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const handlePago = async () => {
        if (!pagoModal || !montoPago) return;
        try {
            const motivoFinal = `${motivoPago || 'Pago a cuenta'} (${metodoPago})`;
            await pagarSaldo.mutateAsync({ id: pagoModal.id, monto: parseFloat(montoPago), motivo: motivoFinal });
            alert('Pago registrado ✅');
            setPagoModal(null);
            setMontoPago("");
            setMotivoPago("");
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleSaveGasto = async () => {
        if (!gastoModal?.nombre || !gastoModal?.monto || !gastoModal?.fecha_vencimiento) return;
        try {
            if (gastoModal.id) {
                await updateGasto.mutateAsync({
                    id: gastoModal.id,
                    nombre: gastoModal.nombre,
                    monto: parseFloat(gastoModal.monto.toString()),
                    fecha_vencimiento: gastoModal.fecha_vencimiento,
                    categoria: gastoModal.categoria
                } as any);
            } else {
                await createGasto.mutateAsync({
                    nombre: gastoModal.nombre,
                    monto: parseFloat(gastoModal.monto.toString()),
                    fecha_vencimiento: gastoModal.fecha_vencimiento,
                    categoria: gastoModal.categoria || 'normal'
                });
            }
            setGastoModal(null);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleSaveProveedor = async () => {
        if (!proveedorModal?.nombre) return;
        try {
            if (proveedorModal.id) {
                await updateProveedor.mutateAsync({
                    id: proveedorModal.id,
                    nombre: proveedorModal.nombre,
                    cuit: proveedorModal.cuit || undefined,
                    telefono: proveedorModal.telefono || undefined,
                });
            } else {
                await createProveedor.mutateAsync({
                    nombre: proveedorModal.nombre,
                    cuit: proveedorModal.cuit || undefined,
                    telefono: proveedorModal.telefono || undefined,
                });
            }
            setProveedorModal(null);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleDeleteGasto = async (id: string) => {
        if (!confirm('¿Seguro que querés eliminar este gasto?')) return;
        try {
            await deleteGasto.mutateAsync(id);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleExport = () => {
        let csv = "";
        let filename = "";

        if (tab === 'insumos') {
            filename = "insumos.csv";
            csv = "Nombre;Proveedor;Categoria;Stock;Minimo;Unidad;Precio Ultima Compra\n";
            filtered.forEach((i: any) => {
                csv += `"${i.nombre}";"${i.proveedores?.nombre || ''}";"${i.categoria}";${i.stock_actual};${i.stock_minimo};"${i.unidad}";${i.precio_ultima_compra}\n`;
            });
        } else if (tab === 'proveedores') {
            filename = "proveedores.csv";
            csv = "Nombre;CUIT;Telefono;Saldo CC\n";
            filteredProveedores.forEach((p: any) => {
                csv += `"${p.nombre}";"${p.cuit || ''}";"${p.telefono || ''}";${p.saldo_cc || 0}\n`;
            });
        } else if (tab === 'compras') {
            filename = "compras.csv";
            csv = "Fecha;Proveedor;Factura;Metodo;Total\n";
            compras.forEach((c: any) => {
                const metodo = c.metodo_pago === 'cuenta_corriente' ? 'Cta. Cte.' : 
                               c.metodo_pago === 'mercado_pago' ? 'Mercado Pago' :
                               c.metodo_pago === 'transferencia' ? 'Santander' : 'Efectivo';
                csv += `"${new Date(c.created_at).toLocaleDateString()}";"${c.proveedores?.nombre || ''}";"${c.numero_factura || ''}";"${metodo}";${c.total}\n`;
            });
        } else {
            filename = "gastos.csv";
            csv = "Nombre;Monto;Vencimiento;Estado;Prioridad\n";
            gastos.filter(g => g.nombre.toLowerCase().includes(search.toLowerCase())).forEach((g: any) => {
                csv += `"${g.nombre}";${g.monto};"${g.fecha_vencimiento}";"${g.estado}";"${g.categoria}"\n`;
            });
        }

        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalDeuda = proveedores.reduce((sum, p) => sum + (p.saldo_cc || 0), 0);

    return (
        <section>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <IconPackage size={20} className="text-gray-500" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Gestión</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Insumos y proveedores</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 mb-6">
                <button onClick={() => { setTab('insumos'); setSearch(""); }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'insumos' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
                    Insumos ({insumos.length})
                </button>
                <button onClick={() => { setTab('compras'); setSearch(""); }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'compras' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
                    Compras ({compras.length})
                </button>
                <button onClick={() => { setTab('proveedores'); setSearch(""); }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'proveedores' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
                    Proveedores ({proveedores.length})
                </button>
                <button onClick={() => { setTab('gastos'); setSearch(""); }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'gastos' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
                    Gastos ({gastos.length})
                </button>
            </div>

            {/* Search and Export */}
            <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Buscar ${tab}...`} className="w-full h-12 pl-12 pr-4 rounded-xl bg-white border border-gray-100 font-bold outline-none text-sm" />
                </div>
                <button
                    onClick={handleExport}
                    className="h-12 px-6 rounded-xl bg-emerald-50 text-emerald-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-100"
                >
                    <IconDownload size={16} /> Excel
                </button>
            </div>

            {tab === 'insumos' && (
                <>
                    {/* Category filter */}
                    <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                        {categorias.map(cat => (
                            <button key={cat} onClick={() => setCatFilter(cat)} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${catFilter === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Insumos por grupo */}
                    <div className="space-y-4">
                        {groupedInsumos.map(group => {
                            const isOpen = openInsumoGroups[group.name] ?? group.low;
                            const lowCount = group.items.filter((i: any) => Number(i.stock_actual || 0) <= Number(i.stock_minimo || 0)).length;
                            return (
                                <div key={group.name} className={`rounded-3xl border overflow-hidden ${group.low ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-white'}`}>
                                    <button
                                        type="button"
                                        onClick={() => toggleInsumoGroup(group.name)}
                                        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-black/[0.02] transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${group.low ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                                                {group.low ? <IconAlertTriangle size={20} /> : <IconPackage size={20} />}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-gray-950 uppercase tracking-tight truncate">{group.name}</h3>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {group.items.length} insumo{group.items.length === 1 ? '' : 's'}
                                                    {lowCount > 0 ? ` · ${lowCount} bajo mínimo` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {group.low && <span className="rounded-full bg-red-600 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white">Revisar</span>}
                                            <IconChevronDown className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={20} />
                                        </div>
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {isOpen && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4 pt-0">
                                                    {group.items.map((insumo: any) => {
                                                        const isLow = Number(insumo.stock_actual || 0) <= Number(insumo.stock_minimo || 0);
                                                        return (
                                                            <div key={insumo.id} className={`p-5 rounded-2xl border ${isLow ? 'border-red-200 bg-white' : 'border-gray-100 bg-gray-50/60'} hover:shadow-md transition-all`}>
                                                                <div className="flex items-start justify-between mb-3">
                                                                    <div className="min-w-0">
                                                                        <h3 className="font-black text-gray-900 text-sm truncate">{insumo.nombre}</h3>
                                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                                                            {insumo.proveedores?.nombre || 'Sin proveedor'} · {insumo.categoria}
                                                                        </p>
                                                                    </div>
                                                                    {isLow && <IconAlertTriangle size={16} className="text-red-500 animate-pulse shrink-0" />}
                                                                </div>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className={`text-3xl font-black ${isLow ? 'text-red-500' : 'text-gray-900'}`}>
                                                                        {insumo.stock_actual}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-gray-400 uppercase">{insumo.unidad}</span>
                                                                </div>
                                                                <div className="mt-3 flex justify-between gap-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                                    <span>Min: {insumo.stock_minimo}</span>
                                                                    {insumo.precio_ultima_compra > 0 && (
                                                                        <span className="truncate">${insumo.precio_ultima_compra.toLocaleString('es-AR')}/{insumo.unidad}</span>
                                                                    )}
                                                                </div>
                                                            </div>
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
                </>
            )}

            {tab === 'compras' && (
                <div className="space-y-3">
                    {compras.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 font-bold text-sm">No hay compras registradas.</div>
                    ) : compras.filter((c: any) =>
                        (c.proveedores?.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
                        (c.numero_factura || '').toLowerCase().includes(search.toLowerCase())
                    ).map((c: any) => (
                        <div key={c.id} className="p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-sm transition-all flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                                    <IconShoppingCart size={18} />
                                </div>
                                <div>
                                    <p className="font-black text-sm text-gray-900">{c.proveedores?.nombre || 'Sin proveedor'}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        {new Date(c.created_at).toLocaleDateString('es-AR')}
                                        {c.numero_factura ? ` · Fac: ${c.numero_factura}` : ''}
                                        {' · '}
                                        {c.metodo_pago === 'cuenta_corriente' ? 'Cta. Cte.' : 
                                         c.metodo_pago === 'mercado_pago' ? 'M. Pago' :
                                         c.metodo_pago === 'transferencia' ? 'Santander' : 'Efectivo'}
                                    </p>
                                </div>
                            </div>
                            <p className="font-black text-lg text-gray-900 shrink-0">${(c.total || 0).toLocaleString('es-AR')}</p>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'proveedores' && (
                <>
                    {/* Deuda Total & Add Button */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        {totalDeuda > 0 && (
                            <div className="flex-1 p-6 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Deuda Total CC</p>
                                    <p className="text-3xl font-black text-red-600">${totalDeuda.toLocaleString('es-AR')}</p>
                                </div>
                                <IconCoin size={32} className="text-red-300" />
                            </div>
                        )}
                        <button
                            onClick={() => setProveedorModal({ nombre: '', cuit: '', telefono: '' })}
                            className="p-6 rounded-2xl bg-black text-white flex flex-col items-center justify-center gap-2 hover:bg-gray-800 transition-all border border-black shadow-xl shadow-black/10 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <IconPlus size={24} />
                            </div>
                            <span className="font-black text-[10px] uppercase tracking-[0.2em]">Nuevo Proveedor</span>
                        </button>
                    </div>

                    {/* Proveedores agrupados */}
                    <div className="space-y-4">
                        {([
                            { key: 'deuda' as const, title: 'Con deuda', items: proveedoresConDeuda, tone: 'debt' },
                            { key: 'alDia' as const, title: 'Al día', items: proveedoresAlDia, tone: 'ok' },
                        ]).map(section => {
                            const isOpen = openProveedorGroups[section.key];
                            const sectionDebt = section.items.reduce((sum, prov) => sum + Number(prov.saldo_cc || 0), 0);
                            return (
                                <div key={section.key} className={`rounded-3xl border overflow-hidden ${section.tone === 'debt' ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-white'}`}>
                                    <button
                                        type="button"
                                        onClick={() => toggleProveedorGroup(section.key)}
                                        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-black/[0.02] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${section.tone === 'debt' ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                <IconUsers size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-gray-950 uppercase tracking-tight">{section.title}</h3>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {section.items.length} proveedor{section.items.length === 1 ? '' : 'es'}
                                                    {sectionDebt > 0 ? ` · $${sectionDebt.toLocaleString('es-AR')}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <IconChevronDown className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={20} />
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {isOpen && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <div className="space-y-3 p-4 pt-0">
                                                    {section.items.length === 0 ? (
                                                        <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 py-10 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                            No hay proveedores en esta sección
                                                        </div>
                                                    ) : section.items.map(prov => (
                                                        <div key={prov.id} className="p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                            <div className="flex items-center gap-4 min-w-0">
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${(prov.saldo_cc || 0) > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                    {prov.nombre.charAt(0)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h3 className="font-black text-gray-900 truncate">{prov.nombre}</h3>
                                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                        {prov.cuit && <span>CUIT: {prov.cuit}</span>}
                                                                        {prov.telefono && <span>Tel: {prov.telefono}</span>}
                                                                        <span>{insumos.filter((i: any) => i.proveedores?.id === prov.id).length} insumos</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => setProveedorModal(prov)} className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all">
                                                                        <IconEdit size={16} />
                                                                    </button>
                                                                    {(prov.saldo_cc || 0) > 0 && (
                                                                        <button onClick={() => setPagoModal(prov)} className="h-9 px-3 rounded-xl bg-emerald-50 flex items-center gap-1.5 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest" title="Pagar saldo">
                                                                            <IconCoin size={16} /> Pagar
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {(prov.saldo_cc || 0) > 0 ? (
                                                                    <p className="text-xl font-black text-red-600">-${(prov.saldo_cc || 0).toLocaleString('es-AR')}</p>
                                                                ) : (
                                                                    <p className="text-sm font-black text-emerald-500 uppercase tracking-widest">Al día</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {tab === 'gastos' && (
                <>
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setGastoModal({ nombre: '', monto: 0, fecha_vencimiento: new Date().toISOString().split('T')[0], categoria: 'normal' })}
                            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all"
                        >
                            <IconPlus size={16} /> Agregar Gasto
                        </button>
                    </div>
                    <div className="space-y-3">
                        {gastos.filter(g => g.nombre.toLowerCase().includes(search.toLowerCase())).map(g => (
                            <div key={g.id} className="p-4 rounded-xl border border-gray-100 bg-white flex justify-between items-center hover:shadow-sm transition-all">
                                <div>
                                    <h3 className="font-black text-sm">{g.nombre}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Vence: {g.fecha_vencimiento} · {g.categoria}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-black text-lg">${g.monto.toLocaleString('es-AR')}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setGastoModal(g)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-black hover:text-white transition-all">
                                            <IconEdit size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteGasto(g.id)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                            <IconTrash size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Modal Pago */}
            {pagoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setPagoModal(null); setMotivoPago(''); }} />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm">
                        <h3 className="text-xl font-black mb-1">Abonar a {pagoModal.nombre}</h3>
                        <p className="text-sm text-gray-400 font-bold mb-6">Deuda total: ${(pagoModal.saldo_cc || 0).toLocaleString('es-AR')}</p>
                        
                        <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)} placeholder="Monto a abonar (ej. adelanto)" className="w-full h-14 px-6 rounded-xl bg-gray-50 font-bold outline-none text-lg mb-3" />
                        
                        <input type="text" value={motivoPago} onChange={e => setMotivoPago(e.target.value)} placeholder="Motivo (opcional)" className="w-full h-14 px-6 rounded-xl bg-gray-50 font-bold outline-none text-sm mb-6" />

                        <div className="flex gap-3">
                            <button onClick={() => { setPagoModal(null); setMotivoPago(''); }} className="flex-1 h-12 rounded-xl bg-gray-100 font-black text-gray-400 text-xs uppercase">Cancelar</button>
                            <button onClick={handlePago} className="flex-[2] h-12 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase hover:scale-105 active:scale-95 transition-all">Confirmar</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal Gasto */}
            {gastoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setGastoModal(null)} />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm">
                        <h3 className="text-xl font-black mb-6">{gastoModal.id ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nombre</label>
                                <input type="text" value={gastoModal.nombre} onChange={e => setGastoModal({...gastoModal, nombre: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto ($)</label>
                                <input type="number" value={gastoModal.monto} onChange={e => setGastoModal({...gastoModal, monto: parseFloat(e.target.value) || 0})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vencimiento</label>
                                <input type="date" value={gastoModal.fecha_vencimiento} onChange={e => setGastoModal({...gastoModal, fecha_vencimiento: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Prioridad</label>
                                <select value={gastoModal.categoria} onChange={e => setGastoModal({...gastoModal, categoria: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none">
                                    <option value="normal">Normal</option>
                                    <option value="urgente">Urgente</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setGastoModal(null)} className="flex-1 h-12 rounded-xl bg-gray-100 font-black text-gray-400 text-xs uppercase">Cancelar</button>
                            <button onClick={handleSaveGasto} disabled={updateGasto.isPending || createGasto.isPending} className="flex-[2] h-12 rounded-xl bg-black text-white font-black text-xs uppercase hover:scale-105 active:scale-95 transition-all">Guardar</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal Proveedor */}
            {proveedorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setProveedorModal(null)} />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm">
                        <h3 className="text-xl font-black mb-6">{proveedorModal.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nombre / Razón Social</label>
                                <input type="text" value={proveedorModal.nombre} onChange={e => setProveedorModal({...proveedorModal, nombre: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CUIT (Opcional)</label>
                                <input type="text" value={proveedorModal.cuit || ''} onChange={e => setProveedorModal({...proveedorModal, cuit: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Teléfono (Opcional)</label>
                                <input type="text" value={proveedorModal.telefono || ''} onChange={e => setProveedorModal({...proveedorModal, telefono: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setProveedorModal(null)} className="flex-1 h-12 rounded-xl bg-gray-100 font-black text-gray-400 text-xs uppercase">Cancelar</button>
                            <button onClick={handleSaveProveedor} disabled={createProveedor.isPending || updateProveedor.isPending} className="flex-[2] h-12 rounded-xl bg-black text-white font-black text-xs uppercase hover:scale-105 active:scale-95 transition-all">Guardar</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </section>
    );
}
