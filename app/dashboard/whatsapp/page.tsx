'use client';

import React, { useState } from 'react';
import { useWhatsAppPedidos } from '@/lib/hooks/useWhatsAppPedidos';
import { WhatsAppOrder, WhatsAppOrderStatus } from '@/lib/store/whatsappStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IconMessageCircle,
    IconShoppingBag,
    IconClock,
    IconCircleX,
    IconTruck,
    IconAlertCircle
} from "@tabler/icons-react";
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function WhatsAppPOSPage() {
    const { pedidos, isLoading, updateStatus } = useWhatsAppPedidos();
    const [filter, setFilter] = useState<WhatsAppOrderStatus | 'all'>('all');

    const filteredPedidos = pedidos.filter(p =>
        filter === 'all' ? true : p.estado === filter
    );

    const getNextStatus = (current: WhatsAppOrderStatus): WhatsAppOrderStatus | null => {
        switch (current) {
            case 'pendiente': return 'confirmado';
            case 'confirmado': return 'preparando';
            case 'preparando': return 'listo';
            case 'listo': return 'entregado';
            default: return null;
        }
    };

    const getStatusColor = (status: WhatsAppOrderStatus) => {
        switch (status) {
            case 'pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'confirmado': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'preparando': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'listo': return 'bg-green-100 text-green-800 border-green-200';
            case 'entregado': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'cancelado': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-50';
        }
    };

    return (
        <div className="p-6 h-screen overflow-y-auto bg-gray-50/50">
            {/* Header */}
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-900">
                        <IconMessageCircle className="w-8 h-8 text-green-500" />
                        Pedidos WhatsApp
                    </h1>
                    <p className="text-gray-500 mt-1">Gestiona los pedidos entrantes en tiempo real</p>
                </div>

                <div className="flex gap-2">
                    <FilterButton current={filter} target="all" label="Todos" setFilter={setFilter} />
                    <FilterButton current={filter} target="pendiente" label="Pendientes" setFilter={setFilter} />
                    <FilterButton current={filter} target="confirmado" label="Confirmados" setFilter={setFilter} />
                    <FilterButton current={filter} target="preparando" label="En Cocina" setFilter={setFilter} />
                    <FilterButton current={filter} target="listo" label="Listos" setFilter={setFilter} />
                </div>
            </header>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredPedidos.map((pedido) => (
                        <OrderCard
                            key={pedido.id}
                            pedido={pedido}
                            onNext={() => {
                                const next = getNextStatus(pedido.estado);
                                if (next) updateStatus({ id: pedido.id, status: next });
                            }}
                            onCancel={() => updateStatus({ id: pedido.id, status: 'cancelado' })}
                            statusColor={getStatusColor(pedido.estado)}
                            nextStatus={getNextStatus(pedido.estado)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                </div>
            )}

            {!isLoading && filteredPedidos.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    <IconShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">No hay pedidos en esta categoría</p>
                </div>
            )}
        </div>
    );
}

function OrderCard({
    pedido,
    onNext,
    onCancel,
    statusColor,
    nextStatus
}: {
    pedido: WhatsAppOrder,
    onNext: () => void,
    onCancel: () => void,
    statusColor: string,
    nextStatus: WhatsAppOrderStatus | null
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col`}
        >
            {/* Card Header */}
            <div className={clsx("p-4 border-b flex justify-between items-start", statusColor)}>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">#{pedido.id}</span>
                        <span className="text-sm opacity-80 uppercase font-medium tracking-wide border border-current px-2 py-0.5 rounded-full text-[10px]">
                            {pedido.estado}
                        </span>
                    </div>
                    <h3 className="font-semibold text-lg mt-1 truncate max-w-[200px]">
                        {pedido.nombre_cliente || pedido.numero_cliente}
                    </h3>
                    <div className="flex items-center gap-1 text-xs opacity-70 mt-1">
                        <IconClock className="w-3 h-3" />
                        {format(new Date(pedido.created_at), "HH:mm 'hs' - dd MMM", { locale: es })}
                    </div>
                </div>
                <div className="text-right">
                    <a
                        href={`https://wa.me/${pedido.numero_cliente}`}
                        target="_blank"
                        className="text-xs hover:underline flex items-center justify-end gap-1 opacity-80"
                    >
                        {pedido.numero_cliente}
                    </a>
                </div>
            </div>

            {/* Card Body */}
            <div className="p-4 flex-1">
                {/* Parsed Items */}
                {pedido.items_parseados && pedido.items_parseados.items ? (
                    <div className="space-y-3">
                        {pedido.items_parseados.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-sm">
                                <div className="flex gap-2">
                                    <span className="font-bold bg-gray-100 px-2 rounded-md h-fit text-gray-700">{item.cantidad}x</span>
                                    <div>
                                        <p className="text-gray-900 font-medium leading-tight">{item.nombre}</p>
                                        {item.notas && <p className="text-gray-500 text-xs mt-0.5 italic">{item.notas}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {pedido.items_parseados.tipo_entrega && (
                            <div className="mt-4 pt-3 border-t border-dashed flex gap-2 items-center text-sm text-gray-600">
                                {pedido.items_parseados.tipo_entrega === 'delivery' ? (
                                    <IconTruck className="w-4 h-4 text-blue-500" />
                                ) : (
                                    <IconShoppingBag className="w-4 h-4 text-bloom-600" />
                                )}
                                <span className="capitalize font-medium">{pedido.items_parseados.tipo_entrega}</span>
                                {pedido.items_parseados.direccion && (
                                    <span className="text-gray-400 mx-1">|</span>
                                )}
                                <span className="truncate flex-1" title={pedido.items_parseados.direccion}>
                                    {pedido.items_parseados.direccion}
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 italic">
                        {`\u201C${pedido.mensaje}\u201D`}
                    </div>
                )}

                {pedido.notas && (
                    <div className="mt-3 bg-yellow-50 text-yellow-800 text-xs p-2 rounded border border-yellow-100 flex gap-2 items-start">
                        <IconAlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                        {pedido.notas}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-3 bg-gray-50 border-t flex gap-2">
                {pedido.estado !== 'cancelado' && pedido.estado !== 'entregado' && (
                    <button
                        onClick={onNext}
                        className="flex-1 bg-black hover:bg-gray-800 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {nextStatus === 'confirmado' && 'Confirmar'}
                        {nextStatus === 'preparando' && 'A Cocina'}
                        {nextStatus === 'listo' && 'Marcar Listo'}
                        {nextStatus === 'entregado' && 'Entregar'}
                    </button>
                )}

                {pedido.estado !== 'cancelado' && pedido.estado !== 'entregado' && (
                    <button
                        onClick={onCancel}
                        title="Cancelar"
                        className="bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-gray-500 p-2 rounded-lg transition-colors"
                    >
                        <IconCircleX className="w-5 h-5" />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

function FilterButton({ current, target, label, setFilter }: any) {
    const isActive = current === target;
    return (
        <button
            onClick={() => setFilter(target)}
            className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                isActive
                    ? "bg-black text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-100"
            )}
        >
            {label}
        </button>
    )
}
