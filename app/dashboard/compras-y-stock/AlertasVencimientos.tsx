"use client";

import { useMarcarGastoPagado, useAbonarGastoFijo, useCreateGastoFijo, useDeleteGastoFijo, useUpdateGastoFijo } from "@/lib/hooks/use-compras-stock";
import { IconAlertTriangle, IconCalendarDue, IconCheck, IconCoin, IconHistory, IconX, IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface GastoFijo {
    id: string;
    nombre: string;
    monto: number;
    fecha_vencimiento: string;
    estado: string;
    categoria: string;
    historial_pagos?: any[];
}

export function AlertasVencimientos({ gastos }: { gastos: GastoFijo[] }) {
    const marcarPagado = useMarcarGastoPagado();
    const abonarGasto = useAbonarGastoFijo();
    const createGasto = useCreateGastoFijo();
    const deleteGasto = useDeleteGastoFijo();
    const updateGasto = useUpdateGastoFijo();
    const [historyModal, setHistoryModal] = useState<GastoFijo | null>(null);
    const [pagoModal, setPagoModal] = useState<GastoFijo | null>(null);
    const [montoPago, setMontoPago] = useState("");
    const [motivoPago, setMotivoPago] = useState("");
    const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
    const [gastoModal, setGastoModal] = useState<Partial<GastoFijo> | null>(null);
    const [editingMonto, setEditingMonto] = useState<{ id: string; value: string } | null>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (historyModal) setHistoryModal(null);
                else if (pagoModal) setPagoModal(null);
                else if (gastoModal) setGastoModal(null);
                else if (editingMonto) setEditingMonto(null);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [historyModal, pagoModal, gastoModal, editingMonto]);

    const hoy = new Date();
    const en7dias = new Date(hoy);
    en7dias.setDate(en7dias.getDate() + 7);

    const proximos = gastos.filter(g => {
        if (!g.fecha_vencimiento) return true;
        const fecha = new Date(g.fecha_vencimiento);
        return isNaN(fecha.getTime()) || fecha <= en7dias;
    });

    const otros = gastos.filter(g => {
        if (!g.fecha_vencimiento) return false;
        const fecha = new Date(g.fecha_vencimiento);
        return !isNaN(fecha.getTime()) && fecha > en7dias;
    });

    const formatFecha = (f: string) => {
        const d = new Date(f + 'T12:00:00');
        return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    };

    const formatFechaHora = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const diasRestantes = (f: string) => {
        if (!f) return 'SIN FECHA';
        const fecha = new Date(f + 'T12:00:00');
        if (isNaN(fecha.getTime())) return 'SIN FECHA';
        const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return 'VENCIDO';
        if (diff === 0) return 'HOY';
        if (diff === 1) return 'MAÑANA';
        return `${diff} días`;
    };

    const handleSaveMonto = async (id: string) => {
        if (!editingMonto) return;
        const monto = parseFloat(editingMonto.value.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(monto) && monto >= 0) {
            await updateGasto.mutateAsync({ id, monto } as any);
        }
        setEditingMonto(null);
    };

    const handleOpenPagoModal = (e: React.MouseEvent, g: GastoFijo) => {
        e.stopPropagation(); // Prevenir abrir el modal de historial
        setPagoModal(g);
        setMontoPago(g.monto.toString());
        setMotivoPago("");
        setMetodoPago("Efectivo");
    };

    const handleConfirmarPago = async () => {
        if (!pagoModal || !montoPago) return;
        
        const montoAbonar = parseFloat(montoPago);
        if (isNaN(montoAbonar) || montoAbonar <= 0) {
            alert("Monto inválido");
            return;
        }

        const motivoBase = motivoPago || (montoAbonar < pagoModal.monto ? 'Adelanto' : 'Pago Total');
        const motivoFinal = `${motivoBase} (${metodoPago})`;

        try {
            if (montoAbonar >= pagoModal.monto) {
                await marcarPagado.mutateAsync(pagoModal.id);
            } else {
                await abonarGasto.mutateAsync({ id: pagoModal.id, montoAbonado: montoAbonar, motivo: motivoFinal });
            }
            setPagoModal(null);
            setMontoPago("");
            setMotivoPago("");
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    return (
        <section className="mb-10 relative">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <IconCalendarDue size={20} className="text-gray-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Gastos Fijos</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vencimientos y estado</p>
                    </div>
                </div>
                <button
                    onClick={() => setGastoModal({ nombre: '', monto: 0, fecha_vencimiento: '', categoria: 'normal' })}
                    className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all"
                >
                    <IconPlus size={14} /> Agregar
                </button>

                {/* REFERENCIA DE COLORES */}
                <div className="hidden sm:flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Vencido</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">7 Días o menos</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">+7 Días</span>
                    </div>
                </div>
            </div>

            {/* REFERENCIA MOVILE */}
            <div className="flex sm:hidden flex-wrap items-center gap-3 mb-6 bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Vencido</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">≤ 7 Días</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">+7 Días</span>
                </div>
            </div>

            {gastos.length > 0 && (
                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-[200px] bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total pendiente</p>
                        <p className="text-2xl font-black text-gray-900">
                            ${gastos.filter(g => g.estado !== 'pagado').reduce((s, g) => s + (g.monto || 0), 0).toLocaleString('es-AR')}
                        </p>
                    </div>
                    <div className="flex-1 min-w-[200px] bg-amber-50 border border-amber-100 rounded-2xl px-6 py-4 shadow-sm">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Vence en 7 días</p>
                        <p className="text-2xl font-black text-amber-700">
                            ${proximos.filter(g => g.estado !== 'pagado').reduce((s, g) => s + (g.monto || 0), 0).toLocaleString('es-AR')}
                        </p>
                    </div>
                </div>
            )}

            {proximos.length === 0 && otros.length === 0 ? (
                <div className="p-8 rounded-[2rem] bg-gray-50 border border-gray-100 text-center">
                    <IconPlus size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="font-black text-gray-400 text-sm uppercase tracking-widest">No hay gastos cargados</p>
                    <button
                        onClick={() => setGastoModal({ nombre: '', monto: 0, fecha_vencimiento: '', categoria: 'normal' })}
                        className="mt-4 bg-black text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                    >
                        Agregar primer gasto
                    </button>
                </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {proximos.map((g, i) => {
                    const estado = diasRestantes(g.fecha_vencimiento);
                    const vencido = estado === 'VENCIDO';
                    const hasHistory = Array.isArray(g.historial_pagos) && g.historial_pagos.length > 0;
                    return (
                        <motion.div
                            key={g.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setHistoryModal(g)}
                            className={`p-6 rounded-[1.5rem] border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                                vencido ? 'border-red-300 bg-red-50 hover:bg-red-100' : 'border-amber-200 bg-amber-50/60 hover:bg-amber-100/60'
                            } relative group`}
                        >
                            {vencido && (
                                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase animate-pulse">
                                    Vencido
                                </div>
                            )}
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    vencido ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'
                                }`}>
                                    <IconCalendarDue size={16} />
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                                        vencido ? 'text-red-600' : 'text-amber-600'
                                    }`}>
                                        {estado}
                                    </span>
                                    {hasHistory && (
                                        <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full">
                                            <IconHistory size={10} /> Pagos parciales
                                        </span>
                                    )}
                                </div>
                            </div>
                            <h3 className="font-black text-gray-900 text-sm mb-1">{g.nombre}</h3>
                            {editingMonto?.id === g.id ? (
                                <input
                                    autoFocus
                                    type="number"
                                    value={editingMonto.value}
                                    onChange={e => setEditingMonto({ id: g.id, value: e.target.value })}
                                    onBlur={() => handleSaveMonto(g.id)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveMonto(g.id); if (e.key === 'Escape') setEditingMonto(null); }}
                                    onClick={e => e.stopPropagation()}
                                    className="text-2xl font-black text-gray-900 bg-white/80 border-b-2 border-gray-400 outline-none w-full"
                                />
                            ) : (
                                <p
                                    className="text-2xl font-black text-gray-900 cursor-text hover:text-gray-600 transition-colors"
                                    onClick={e => { e.stopPropagation(); setEditingMonto({ id: g.id, value: g.monto.toString() }); }}
                                    title="Clic para editar"
                                >
                                    {g.monto > 0 ? `$${g.monto.toLocaleString('es-AR')}` : 'S/monto'}
                                </p>
                            )}
                            <p className="text-[10px] font-bold text-gray-400 mt-1">
                                {g.fecha_vencimiento ? `Restante | Vence ${formatFecha(g.fecha_vencimiento)}` : 'Sin fecha de vencimiento'}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={(e) => handleOpenPagoModal(e, g)}
                                    className="flex-1 h-10 rounded-xl bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all flex items-center justify-center gap-1"
                                >
                                    <IconCoin size={13} /> Pagar
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setGastoModal(g); }} className="w-9 h-10 rounded-xl bg-white/70 border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all">
                                    <IconEdit size={13} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar este gasto?')) deleteGasto.mutateAsync(g.id); }} className="w-9 h-10 rounded-xl bg-white/70 border border-gray-200 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all">
                                    <IconTrash size={13} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}

                {otros.map((g, i) => {
                    const hasHistory = Array.isArray(g.historial_pagos) && g.historial_pagos.length > 0;
                    return (
                        <motion.div
                            key={g.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (proximos.length + i) * 0.05 }}
                            onClick={() => setHistoryModal(g)}
                            className="p-6 rounded-[1.5rem] border-2 border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 cursor-pointer transition-all hover:scale-[1.02] group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <IconCalendarDue size={16} />
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
                                        {diasRestantes(g.fecha_vencimiento)}
                                    </span>
                                    {hasHistory && (
                                        <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full">
                                            <IconHistory size={10} /> Pagos parciales
                                        </span>
                                    )}
                                </div>
                            </div>
                            <h3 className="font-black text-gray-900 text-sm mb-1">{g.nombre}</h3>
                            {editingMonto?.id === g.id ? (
                                <input
                                    autoFocus
                                    type="number"
                                    value={editingMonto.value}
                                    onChange={e => setEditingMonto({ id: g.id, value: e.target.value })}
                                    onBlur={() => handleSaveMonto(g.id)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveMonto(g.id); if (e.key === 'Escape') setEditingMonto(null); }}
                                    onClick={e => e.stopPropagation()}
                                    className="text-xl font-black text-emerald-700 bg-white/80 border-b-2 border-emerald-400 outline-none w-full"
                                />
                            ) : (
                                <p
                                    className="text-xl font-black text-emerald-700 cursor-text hover:text-emerald-500 transition-colors"
                                    onClick={e => { e.stopPropagation(); setEditingMonto({ id: g.id, value: g.monto.toString() }); }}
                                    title="Clic para editar"
                                >
                                    {g.monto > 0 ? `$${g.monto.toLocaleString('es-AR')}` : 'S/monto'}
                                </p>
                            )}
                            <p className="text-[10px] font-bold text-gray-400 mt-1">
                                Restante | Vence {formatFecha(g.fecha_vencimiento)}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={(e) => handleOpenPagoModal(e, g)}
                                    className="flex-1 h-10 rounded-xl bg-white border border-emerald-200 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1"
                                >
                                    <IconCoin size={13} /> Pagar
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setGastoModal(g); }} className="w-9 h-10 rounded-xl bg-white/70 border border-emerald-200 flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all">
                                    <IconEdit size={13} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar este gasto?')) deleteGasto.mutateAsync(g.id); }} className="w-9 h-10 rounded-xl bg-white/70 border border-emerald-200 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all">
                                    <IconTrash size={13} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            )}

            {/* Modal Historial */}
            <AnimatePresence>
                {historyModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setHistoryModal(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 leading-tight">{historyModal.nombre}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Historial de Pagos</p>
                                </div>
                                <button onClick={() => setHistoryModal(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                    <IconX size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-[100px]">
                                {Array.isArray(historyModal.historial_pagos) && historyModal.historial_pagos.length > 0 ? (
                                    <div className="space-y-3">
                                        {historyModal.historial_pagos.map((p, idx) => (
                                            <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex justify-between items-center">
                                                <div>
                                                    <p className="font-black text-sm text-gray-900">{p.motivo || 'Pago'}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{formatFechaHora(p.fecha)}</p>
                                                </div>
                                                <p className="font-black text-emerald-600">${Number(p.monto || 0).toLocaleString('es-AR')}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                                        <IconHistory size={32} className="opacity-20 mb-2" />
                                        <p className="text-sm font-bold">No hay pagos parciales</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-1">Saldo Pendiente Actual</p>
                                <p className="text-2xl font-black text-center text-gray-900">${historyModal.monto.toLocaleString('es-AR')}</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Crear/Editar Gasto */}
            <AnimatePresence>
                {gastoModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setGastoModal(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm">
                            <h3 className="text-xl font-black mb-6">{gastoModal.id ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nombre</label>
                                    <input type="text" value={gastoModal.nombre || ''} onChange={e => setGastoModal({...gastoModal, nombre: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto ($)</label>
                                    <input type="number" value={gastoModal.monto || ''} onChange={e => setGastoModal({...gastoModal, monto: parseFloat(e.target.value) || 0})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vencimiento (opcional)</label>
                                    <input type="date" value={gastoModal.fecha_vencimiento || ''} onChange={e => setGastoModal({...gastoModal, fecha_vencimiento: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Prioridad</label>
                                    <select value={gastoModal.categoria || 'normal'} onChange={e => setGastoModal({...gastoModal, categoria: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none">
                                        <option value="normal">Normal</option>
                                        <option value="urgente">Urgente</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setGastoModal(null)} className="flex-1 h-12 rounded-xl bg-gray-100 font-black text-gray-400 text-xs uppercase">Cancelar</button>
                                <button
                                    onClick={async () => {
                                        if (!gastoModal.nombre || !gastoModal.monto) return;
                                        try {
                                            if (gastoModal.id) {
                                                await updateGasto.mutateAsync({ id: gastoModal.id, nombre: gastoModal.nombre, monto: gastoModal.monto, fecha_vencimiento: gastoModal.fecha_vencimiento || null, categoria: gastoModal.categoria } as any);
                                            } else {
                                                await createGasto.mutateAsync({ nombre: gastoModal.nombre!, monto: gastoModal.monto!, fecha_vencimiento: gastoModal.fecha_vencimiento || null, categoria: gastoModal.categoria } as any);
                                            }
                                            setGastoModal(null);
                                        } catch (err: any) { alert('Error: ' + err.message); }
                                    }}
                                    className="flex-[2] h-12 rounded-xl bg-black text-white font-black text-xs uppercase"
                                >
                                    Guardar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Pago */}
            <AnimatePresence>
                {pagoModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPagoModal(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm flex flex-col">
                            <h3 className="text-xl font-black mb-1">Abonar a {pagoModal.nombre}</h3>
                            <p className="text-sm text-gray-400 font-bold mb-6">Monto pendiente: ${(pagoModal.monto || 0).toLocaleString('es-AR')}</p>
                            
                            <div className="flex gap-2 mb-4">
                                <button 
                                    onClick={() => setMetodoPago('Efectivo')}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${metodoPago === 'Efectivo' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                >
                                    Efectivo
                                </button>
                                <button 
                                    onClick={() => setMetodoPago('Transferencia')}
                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${metodoPago === 'Transferencia' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                >
                                    Transf.
                                </button>
                            </div>

                            <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)} placeholder="Monto a abonar (ej. adelanto)" className="w-full h-14 px-6 rounded-xl bg-gray-50 font-bold outline-none text-lg mb-3" />
                            
                            <input type="text" value={motivoPago} onChange={e => setMotivoPago(e.target.value)} placeholder="Motivo (opcional, ej: Adelanto)" className="w-full h-14 px-6 rounded-xl bg-gray-50 font-bold outline-none text-sm mb-6" />

                            <div className="flex gap-3">
                                <button onClick={() => setPagoModal(null)} className="flex-1 h-12 rounded-xl bg-gray-100 font-black text-gray-400 text-xs uppercase">Cancelar</button>
                                <button onClick={handleConfirmarPago} className="flex-[2] h-12 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase hover:scale-105 active:scale-95 transition-all">Confirmar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
}
