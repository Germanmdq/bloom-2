"use client";

import { useState } from "react";
import { useInsumosByProveedor, useRegistrarCompra, useCreateInsumo } from "@/lib/hooks/use-compras-stock";
import { IconShoppingCart, IconFileInvoice, IconCash, IconCreditCard, IconPlus, IconX, IconCheck, IconSearch, IconBuildingStore } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

interface Proveedor {
    id: string;
    nombre: string;
    cuit: string | null;
    saldo_cc: number;
}

interface CompraItem {
    insumo_id: string;
    nombre: string;
    cantidad: string;
    precio_unitario: string;
    unidad: string;
}

export function FormularioCompra({ proveedores }: { proveedores: Proveedor[] }) {
    const [open, setOpen] = useState(false);
    const [proveedorId, setProveedorId] = useState("");
    const [cuit, setCuit] = useState("");
    const [numFactura, setNumFactura] = useState("");
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'cuenta_corriente' | 'mercado_pago' | 'transferencia'>('efectivo');
    const [items, setItems] = useState<CompraItem[]>([]);
    const [searchInsumo, setSearchInsumo] = useState("");

    const { data: insumosProveedor = [] } = useInsumosByProveedor(proveedorId || null);
    const registrarCompra = useRegistrarCompra();
    const createInsumo = useCreateInsumo();

    const proveedorSeleccionado = proveedores.find(p => p.id === proveedorId);

    const handleSelectProveedor = (id: string) => {
        setProveedorId(id);
        setItems([]);
        const prov = proveedores.find(p => p.id === id);
        if (prov?.cuit) setCuit(prov.cuit);
        else setCuit("");
    };

    const addItem = (insumo: any) => {
        if (items.find(i => i.insumo_id === insumo.id)) return;
        setItems(prev => [...prev, {
            insumo_id: insumo.id,
            nombre: insumo.nombre,
            cantidad: "",
            precio_unitario: insumo.precio_ultima_compra?.toString() || "",
            unidad: insumo.unidad
        }]);
        setSearchInsumo("");
    };

    const updateItem = (idx: number, field: string, value: string) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };

    const removeItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const total = items.reduce((sum, item) => {
        const cant = parseFloat(item.cantidad) || 0;
        const precio = parseFloat(item.precio_unitario) || 0;
        return sum + (cant * precio);
    }, 0);

    const handleSubmit = async () => {
        const validItems = items.filter(i => parseFloat(i.cantidad) > 0 && parseFloat(i.precio_unitario) >= 0);
        if (!proveedorId || validItems.length === 0) {
            alert('Seleccioná un proveedor y cargá al menos un item');
            return;
        }

        try {
            await registrarCompra.mutateAsync({
                proveedor_id: proveedorId,
                numero_factura: numFactura || undefined,
                metodo_pago: metodoPago,
                items: validItems.map(i => ({
                    insumo_id: i.insumo_id,
                    cantidad: parseFloat(i.cantidad),
                    precio_unitario: parseFloat(i.precio_unitario)
                }))
            });
            alert('Compra registrada ✅ Stock actualizado');
            setOpen(false);
            setProveedorId("");
            setItems([]);
            setNumFactura("");
            setCuit("");
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleCrearInsumo = async () => {
        if (!searchInsumo.trim() || !proveedorId) return;
        try {
            const result = await createInsumo.mutateAsync({
                nombre: searchInsumo.trim(),
                unidad: 'un',
                proveedor_id: proveedorId,
                categoria: 'General'
            });
            if (result?.[0]) addItem(result[0]);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const filteredInsumos = insumosProveedor.filter((ins: any) =>
        ins.nombre.toLowerCase().includes(searchInsumo.trim().toLowerCase()) &&
        !items.find(i => i.insumo_id === ins.id)
    );

    return (
        <section className="mb-10">
            {!open ? (
                <button
                    onClick={() => setOpen(true)}
                    className="w-full p-8 rounded-[2rem] border-2 border-dashed border-gray-200 hover:border-black hover:bg-black hover:text-white transition-all group flex items-center justify-center gap-4"
                >
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 group-hover:bg-white/20 flex items-center justify-center transition-all">
                        <IconShoppingCart size={28} className="text-gray-400 group-hover:text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-black text-lg uppercase tracking-tight">Registrar Compra</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Cargar factura de proveedor</p>
                    </div>
                </button>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8 md:p-10"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Nueva Compra</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Formulario transaccional</p>
                        </div>
                        <button onClick={() => setOpen(false)} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
                            <IconX size={18} />
                        </button>
                    </div>

                    {/* Cabecera */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-6 rounded-2xl bg-gray-50/80 border border-gray-100">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Proveedor *</label>
                            <div className="flex gap-2">
                                <select value={proveedorId} onChange={e => handleSelectProveedor(e.target.value)} className="flex-1 h-12 px-4 rounded-xl bg-white border-transparent font-bold outline-none appearance-none cursor-pointer">
                                    <option value="">Seleccionar...</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                                <button 
                                    type="button"
                                    onClick={() => window.dispatchEvent(new CustomEvent('open-provider-modal'))}
                                    className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all shadow-sm"
                                    title="Nuevo Proveedor"
                                >
                                    <IconPlus size={18} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nro Factura</label>
                            <input type="text" value={numFactura} onChange={e => setNumFactura(e.target.value)} placeholder="Ej: 0001-00012345" className="w-full h-12 px-4 rounded-xl bg-white border-transparent font-bold outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">CUIT (opcional)</label>
                            <input type="text" value={cuit} onChange={e => setCuit(e.target.value)} placeholder="20-12345678-9" className="w-full h-12 px-4 rounded-xl bg-white border-transparent font-bold outline-none" />
                        </div>
                    </div>

                    {/* Método de Pago */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                        <button onClick={() => setMetodoPago('efectivo')} className={`h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${metodoPago === 'efectivo' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-white text-gray-400'}`}>
                            <IconCash size={16} /> Efectivo
                        </button>
                        <button onClick={() => setMetodoPago('mercado_pago')} className={`h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${metodoPago === 'mercado_pago' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-100 bg-white text-gray-400'}`}>
                            <IconCreditCard size={16} /> Mercado Pago
                        </button>
                        <button onClick={() => setMetodoPago('transferencia')} className={`h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${metodoPago === 'transferencia' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 bg-white text-gray-400'}`}>
                            <IconBuildingStore size={16} /> Santander
                        </button>
                        <button onClick={() => setMetodoPago('cuenta_corriente')} className={`h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-2 ${metodoPago === 'cuenta_corriente' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-400'}`}>
                            <IconFileInvoice size={16} /> Cta. Cte.
                        </button>
                    </div>

                    {/* Items */}
                    {proveedorId && (
                        <>
                            <div className="relative mb-4">
                                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input
                                    type="text"
                                    value={searchInsumo}
                                    onChange={e => setSearchInsumo(e.target.value)}
                                    onFocus={() => {
                                        // Forzar el estado para abrir el dropdown
                                        if (!searchInsumo) setSearchInsumo(" ");
                                    }}
                                    onBlur={() => {
                                        // Si quedó en espacio, lo limpiamos al salir
                                        setTimeout(() => {
                                            if (searchInsumo === " ") setSearchInsumo("");
                                        }, 200);
                                    }}
                                    placeholder="Buscar o agregar insumo..."
                                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-gray-50 border-transparent font-bold outline-none text-sm"
                                />
                                {searchInsumo !== "" && (
                                    <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl max-h-48 overflow-y-auto border border-gray-100 p-2">
                                        {filteredInsumos.map((ins: any) => (
                                            <div key={ins.id} onMouseDown={() => addItem(ins)} className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer flex justify-between items-center">
                                                <span className="font-bold text-sm">{ins.nombre}</span>
                                                <span className="text-[10px] text-gray-400 font-black uppercase">{ins.unidad}</span>
                                            </div>
                                        ))}
                                        {searchInsumo.trim().length > 0 && (
                                            <div onMouseDown={handleCrearInsumo} className="p-3 mt-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer text-center border border-dashed border-emerald-200">
                                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                                    <IconPlus size={12} className="inline mr-1" /> Crear &quot;{searchInsumo.trim()}&quot;
                                                </span>
                                            </div>
                                        )}
                                        {searchInsumo === " " && filteredInsumos.length === 0 && (
                                            <div className="p-3 text-center">
                                                <span className="text-xs font-bold text-gray-400">No hay insumos creados para este proveedor. Escribí para crear uno.</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {items.length > 0 && (
                                <div className="space-y-3 mb-8">
                                    {items.map((item, idx) => (
                                        <div key={item.insumo_id} className="grid grid-cols-12 gap-3 items-center bg-gray-50/50 p-4 rounded-xl">
                                            <div className="col-span-5 md:col-span-6">
                                                <p className="font-black text-sm text-gray-900">{item.nombre}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">{item.unidad}</p>
                                            </div>
                                            <div className="col-span-3 md:col-span-2 relative">
                                                <label className="absolute -top-3 left-0 w-full text-center text-[8px] font-black text-gray-400 uppercase tracking-widest">CANTIDAD</label>
                                                <input type="number" step="0.01" value={item.cantidad} onChange={e => updateItem(idx, 'cantidad', e.target.value)} placeholder="Cant" className="w-full h-10 px-3 mt-1 rounded-lg bg-white font-bold text-sm outline-none text-center" />
                                            </div>
                                            <div className="col-span-3 md:col-span-3 relative">
                                                <label className="absolute -top-3 left-0 w-full text-center text-[8px] font-black text-gray-400 uppercase tracking-widest">PRECIO UNIDAD</label>
                                                <input type="number" step="0.01" value={item.precio_unitario} onChange={e => updateItem(idx, 'precio_unitario', e.target.value)} placeholder="$/u" className="w-full h-10 px-3 mt-1 rounded-lg bg-white font-bold text-sm outline-none text-center" />
                                            </div>
                                            <div className="col-span-1 pt-1">
                                                <button onClick={() => removeItem(idx)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50">
                                                    <IconX size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {items.length === 0 && (
                                <div className="mb-8 p-6 rounded-xl bg-gray-50 text-center">
                                    <p className="text-sm font-bold text-gray-400">Buscá y agregá insumos de {proveedorSeleccionado?.nombre}</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Compra</p>
                            <p className="text-3xl font-black text-gray-900">${total.toLocaleString('es-AR')}</p>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!proveedorId || items.length === 0 || registrarCompra.isPending}
                            className="h-14 px-10 rounded-2xl bg-black text-white font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-3 shadow-xl"
                        >
                            <IconCheck size={18} />
                            {registrarCompra.isPending ? 'Procesando...' : 'Confirmar Compra'}
                        </button>
                    </div>
                </motion.div>
            )}
        </section>
    );
}
