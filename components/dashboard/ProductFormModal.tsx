"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { IconTag, IconCurrencyDollar, IconPhoto as IconPhoto, IconCheck } from "@tabler/icons-react";

interface Category {
    id: string;
    name: string;
}

interface ProductFormData {
    id: string;
    name: string;
    description: string;
    price: string;
    category_id: string;
    image_url: string;
}

interface ProductFormModalProps {
    product: ProductFormData;
    categories: Category[];
    loading: boolean;
    onChange: (updated: ProductFormData) => void;
    onSave: (e: FormEvent) => void;
    onAddCategory: (name: string) => Promise<Category | null>;
    onClose: () => void;
}

export function ProductFormModal({ product, categories, loading, onChange, onSave, onAddCategory, onClose }: ProductFormModalProps) {
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        const created = await onAddCategory(newCategoryName.trim());
        if (created) onChange({ ...product, category_id: created.id });
        setIsAddingCategory(false);
        setNewCategoryName("");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
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
                className="relative bg-white/90 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/40 shadow-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh]"
            >
                <h3 className="text-4xl font-black text-gray-900 mb-10 tracking-tighter">
                    {product.id ? "Editar Producto" : "Nuevo Producto"}
                </h3>

                <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Nombre</label>
                            <div className="relative">
                                <IconTag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input
                                    type="text" required
                                    value={product.name}
                                    onChange={e => onChange({ ...product, name: e.target.value })}
                                    className="w-full bg-white/60 border border-black/5 rounded-[1.5rem] pl-12 pr-5 py-4 focus:ring-4 focus:ring-black/5 outline-none transition-all font-bold"
                                    placeholder="Ej: Flat White"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Precio</label>
                            <div className="relative">
                                <IconCurrencyDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input
                                    type="number" step="0.01" required
                                    value={product.price}
                                    onChange={e => onChange({ ...product, price: e.target.value })}
                                    className="w-full bg-white/60 border border-black/5 rounded-[1.5rem] pl-12 pr-5 py-4 focus:ring-4 focus:ring-black/5 outline-none transition-all font-black text-lg"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-3 ml-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categoría</label>
                                <button
                                    type="button"
                                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                                    className="text-[10px] font-black text-black bg-[#FFD60A] px-2 py-1 rounded-md uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                >
                                    {isAddingCategory ? "Cancelar" : "+ Nueva"}
                                </button>
                            </div>
                            {isAddingCategory ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        className="flex-1 bg-white/60 border border-black/5 rounded-[1.2rem] px-4 py-3 focus:ring-4 focus:ring-black/5 outline-none font-bold text-sm"
                                        placeholder="Nombre de categoría..."
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        className="bg-black text-white px-4 rounded-[1.2rem] font-bold hover:scale-105 transition-all"
                                    >
                                        <IconCheck size={18} />
                                    </button>
                                </div>
                            ) : (
                                <select
                                    required
                                    value={product.category_id}
                                    onChange={e => onChange({ ...product, category_id: e.target.value })}
                                    className="w-full bg-white/60 border border-black/5 rounded-[1.5rem] px-5 py-4 focus:ring-4 focus:ring-black/5 outline-none appearance-none font-bold text-black"
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Imagen URL</label>
                            <div className="relative">
                                <IconPhoto className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input
                                    type="text"
                                    value={product.image_url}
                                    onChange={e => onChange({ ...product, image_url: e.target.value })}
                                    className="w-full bg-white/60 border border-black/5 rounded-[1.5rem] pl-12 pr-5 py-4 focus:ring-4 focus:ring-black/5 outline-none transition-all"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Descripción</label>
                            <textarea
                                rows={4}
                                value={product.description}
                                onChange={e => onChange({ ...product, description: e.target.value })}
                                className="w-full bg-white/60 border border-black/5 rounded-[1.5rem] px-5 py-4 focus:ring-4 focus:ring-black/5 outline-none transition-all resize-none font-medium"
                                placeholder="Detalles del producto..."
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-5 rounded-[1.5rem] font-bold bg-white text-gray-400 border border-gray-100 hover:bg-gray-50 transition-all"
                        >
                            Descartar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] py-5 rounded-[1.5rem] font-bold bg-black text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-black/20"
                        >
                            {loading ? "Guardando..." : "Guardar Producto"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
