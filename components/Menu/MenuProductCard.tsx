"use client";

import { motion } from "framer-motion";

export function MenuProductCard({ product }: { product: any }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8A387]/20 flex justify-between items-start gap-4"
        >
            <div className="flex-1">
                <h3 className="text-lg font-bold text-[#3E2723] mb-1">{product.name}</h3>
                {product.description && (
                    <p className="text-sm text-gray-500 leading-relaxed mb-2">{product.description}</p>
                )}
            </div>
            <div className="text-right">
                <span className="text-xl font-black text-[#D4AF37] block">
                    ${product.price?.toLocaleString('es-AR')}
                </span>
            </div>
        </motion.div>
    );
}
