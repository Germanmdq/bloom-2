"use client";

import { motion } from "framer-motion";
import { IconEdit, IconTrash, IconX } from "@tabler/icons-react";
import { DashboardProduct } from "@/lib/types";

interface CategoryDetailModalProps {
    categoryName: string;
    products: DashboardProduct[];
    onEdit: (product: DashboardProduct) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

function formatName(name: string): string {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function CategoryDetailModal({ categoryName, products, onEdit, onDelete, onClose }: CategoryDetailModalProps) {
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white/90 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/40 shadow-2xl w-full max-w-7xl overflow-y-auto max-h-[90vh]"
            >
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
                        {formatName(categoryName)}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        <IconX size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="group relative bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-lg transition-all"
                        >
                            <div className="flex-1 flex flex-col px-1 pt-2">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-gray-900 text-xl tracking-tight">{formatName(product.name)}</h4>
                                    <span className="font-black text-gray-900 bg-gray-50 px-3 py-1 rounded-xl text-sm border border-gray-100">
                                        ${parseFloat(String(product.price)).toLocaleString("es-AR")}
                                    </span>
                                </div>
                                {product.description && (
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1 font-medium leading-relaxed">
                                        {product.description}
                                    </p>
                                )}
                                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-2 justify-end">
                                    <button
                                        onClick={() => onEdit(product)}
                                        className="p-2 rounded-xl bg-gray-50 text-black hover:bg-gray-100 transition-colors"
                                    >
                                        <IconEdit size={18} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(product.id)}
                                        className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                    >
                                        <IconTrash size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {products.length === 0 && (
                        <div className="col-span-full py-10 text-center text-gray-500">
                            No hay productos en esta categoría.
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
