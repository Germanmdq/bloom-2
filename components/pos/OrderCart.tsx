import React from 'react';
import { IconTrash, IconPlus, IconMinus, IconPrinter, IconCurrencyDollar, IconBike, IconShoppingBag, IconBuildingStore } from "@tabler/icons-react";

interface CartItem {
    id: string; // Product ID
    cartItemId: string; // Unique combination key (or falls back to id)
    name: string;
    price: number;
    quantity: number;
    variants?: any[]; // [{ name: 'Papas Fritas', price: 0 }, ...]
}

interface OrderCartProps {
    tableId: number;
    orderType: 'LOCAL' | 'DELIVERY' | 'RETIRO';
    items: CartItem[];
    onUpdateQuantity: (cartItemId: string, newQty: number) => void;
    onRemoveItem: (cartItemId: string) => void;
    onCheckout: () => void;
    onPrintTicket: () => void;
}

export function OrderCart({
    tableId,
    orderType,
    items,
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
    onPrintTicket
}: OrderCartProps) {
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = subtotal;

    const getTypeIcon = () => {
        switch (orderType) {
            case 'DELIVERY': return <IconBike size={16} />;
            case 'RETIRO': return <IconShoppingBag size={16} />;
            default: return <IconBuildingStore size={16} />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white w-full">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 backdrop-blur-sm shrink-0">
                <div className="flex justify-between items-center mb-0">
                    <div className="flex items-center gap-3">
                        <div className={`
                            w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-md
                            ${orderType === 'DELIVERY' ? 'bg-blue-500' : orderType === 'RETIRO' ? 'bg-purple-500' : 'bg-emerald-500'}
                        `}>
                            {tableId}
                        </div>
                        <div>
                            <h2 className="font-extrabold text-gray-900 uppercase tracking-tight leading-none text-lg">Mesa {tableId}</h2>
                            <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {getTypeIcon()}
                                {orderType}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-60">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <IconShoppingBag size={40} />
                    </div>
                    <p className="font-bold text-gray-500 text-lg">El carrito está vacío</p>
                    <p className="text-sm text-gray-400 mt-1 max-w-[200px]">Selecciona productos del menú para comenzar el pedido</p>
                </div>
            ) : (
                /* Items List */
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                    {items.map((item) => (
                        <div key={item.cartItemId || item.id} className="group bg-white rounded-2xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <div className="pr-2 w-2/3">
                                    <h4 className="font-bold text-gray-900 text-sm leading-tight">{item.name}</h4>

                                    {/* VARIANTS DISPLAY */}
                                    {item.variants && item.variants.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {item.variants.map((v, idx) => (
                                                <span key={idx} className="text-[10px] font-semibold bg-bloom-50 text-bloom-700 px-1.5 py-0.5 rounded border border-bloom-100">
                                                    {v.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="text-xs font-medium text-gray-400 mt-1">
                                        ${Number(item.price || 0).toLocaleString()} u.
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-black text-lg text-gray-900">
                                        ${(Number(item.price || 0) * item.quantity).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between relative z-10 pt-2 border-t border-gray-50 mt-1">
                                <button
                                    onClick={() => onRemoveItem(item.cartItemId || item.id)}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                >
                                    <IconTrash size={16} />
                                </button>

                                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-1 px-1.5">
                                    <button
                                        onClick={() => onUpdateQuantity(item.cartItemId || item.id, item.quantity - 1)}
                                        className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-bloom-600 active:scale-95 disabled:opacity-50"
                                        disabled={item.quantity <= 1}
                                    >
                                        <IconMinus size={14} strokeWidth={3} />
                                    </button>
                                    <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                                    <button
                                        onClick={() => onUpdateQuantity(item.cartItemId || item.id, item.quantity + 1)}
                                        className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 hover:text-emerald-600 active:scale-95"
                                    >
                                        <IconPlus size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer Actions */}
            <div className="p-5 border-t border-gray-200 bg-white shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20">
                <div className="flex justify-between items-end mb-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total a Pagar</span>
                    <span className="text-4xl font-black text-gray-900 tracking-tight leading-none">
                        ${Number(total || 0).toLocaleString()}
                    </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={onPrintTicket}
                        disabled={items.length === 0}
                        className="col-span-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl flex flex-col items-center justify-center py-3 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <IconPrinter size={20} />
                        <span className="text-[10px] font-bold mt-1 uppercase">Ticket</span>
                    </button>

                    <button
                        onClick={onCheckout}
                        disabled={items.length === 0}
                        className="col-span-3 bg-gray-900 hover:bg-black text-white rounded-xl py-3 px-4 font-black text-lg shadow-strong flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <span className="group-hover:translate-x-1 transition-transform">COBRAR</span>
                        <IconCurrencyDollar size={20} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
}
