"use client";

import { IconLayoutGrid, IconX } from "@tabler/icons-react";
import { WEB_ORDER_TABLE_DELIVERY, WEB_ORDER_TABLE_RETIRO } from "@/lib/orders/web-virtual-tables";

interface WebOrder {
    id: string;
    created_at: string;
    total: number;
    table_id: number;
    customer_name?: string | null;
    customer_phone?: string | null;
    order_type?: string | null;
    items: Array<{
        id?: string;
        name: string;
        price: number;
        quantity: number;
        is_meta?: boolean;
        details?: Record<string, string>;
    }>;
}

function webOrderDisplayName(order: WebOrder): string {
    const saved = order.customer_name?.trim();
    if (saved) return saved;
    const clientItem = order.items.find((i) => i.is_meta);
    if (clientItem?.name?.trim()) {
        return clientItem.name.replace(/^Cliente:\s*/i, "").trim();
    }
    const isWeb = String(order.order_type ?? "").toLowerCase() === "web";
    return isWeb ? "Cliente Web" : "Cliente";
}

interface WebOrderListProps {
    tableId: number;
    webOrders: WebOrder[];
    onSelectOrder: (order: WebOrder) => void;
    onClose: () => void;
}

export function WebOrderList({ tableId, webOrders, onSelectOrder, onClose }: WebOrderListProps) {
    const title = tableId === WEB_ORDER_TABLE_RETIRO ? "Retiro" : "Envío";

    if (webOrders.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-[#F8F9FA] text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6 text-gray-400">
                    <IconLayoutGrid size={48} />
                </div>
                <h2 className="text-2xl font-black text-gray-400 uppercase tracking-widest mb-4">
                    No hay pedidos pendientes
                </h2>
                <button onClick={onClose} className="px-8 py-3 bg-black text-white rounded-xl font-bold">
                    Volver al Salón
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#F8F9FA] overflow-hidden text-[#1A1C1E] p-8">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black uppercase tracking-tight">
                    Pedidos Pendientes: {title}
                </h2>
                <button
                    onClick={onClose}
                    className="w-12 h-12 rounded-full bg-black/5 hover:bg-black hover:text-white transition-all flex items-center justify-center"
                >
                    <IconX />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20">
                {webOrders.map((order) => {
                    const clientItem = order.items.find((i) => i.is_meta);
                    const displayName = webOrderDisplayName(order);
                    const details = clientItem?.details || {};
                    const phone = order.customer_phone?.trim() || details.phone || "";
                    const productItems = order.items.filter((i) => !i.is_meta);

                    return (
                        <button
                            key={order.id}
                            onClick={() => onSelectOrder(order)}
                            className="bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 flex flex-col text-left group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold">
                                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-2xl font-black text-gray-900">
                                    ${Number(order.total).toLocaleString()}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-1">
                                {displayName}
                            </h3>
                            {phone && (
                                <p className="text-xs text-gray-400 font-bold mb-4">{phone}</p>
                            )}

                            <div className="flex-1 space-y-1 mb-6">
                                {productItems.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm text-gray-600">
                                        <span>{item.quantity}x {item.name}</span>
                                    </div>
                                ))}
                                {productItems.length > 3 && (
                                    <p className="text-xs text-gray-400 italic">
                                        ... y {productItems.length - 3} más
                                    </p>
                                )}
                            </div>

                            <div className="mt-auto w-full bg-[#FFD60A] text-black py-4 rounded-xl font-black text-center uppercase tracking-wider group-hover:scale-[1.02] transition-transform">
                                Cobrar Pedido
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
