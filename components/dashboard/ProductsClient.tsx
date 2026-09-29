"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { AnimatePresence } from "framer-motion";
import { IconSearch, IconPlus, IconTag, IconChevronRight, IconX, IconCurrencyDollar, IconFlame, IconEdit, IconTrash } from "@tabler/icons-react";

function formatName(name: string): string {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

interface ProductsClientProps {
    initialProducts: any[];
    initialCategories: any[];
    rawProducts?: any[];
}

export default function ProductsClient({ initialProducts, initialCategories, rawProducts = [] }: ProductsClientProps) {
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [categories, setCategories] = useState<any[]>(initialCategories);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isQuickPricing, setIsQuickPricing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [currentProduct, setCurrentProduct] = useState<any>({
        id: "", name: "", description: "", price: "", category_id: "", raw_product_id: ""
    });
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [saveError, setSaveError] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isAddingCategory) setIsAddingCategory(false);
                else if (isEditing) setIsEditing(false);
                else if (selectedCategory) setSelectedCategory(null);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isAddingCategory, isEditing, selectedCategory]);

    async function fetchData() {
        const { data: catData } = await supabase.from('categories').select('*');
        const { data: prodData } = await supabase.from('products').select('*, categories(name)');
        if (catData) setCategories(catData);
        if (prodData) setProducts(prodData);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setSaveError(null);
        const productData = {
            name: currentProduct.name,
            description: currentProduct.description,
            price: parseFloat(currentProduct.price),
            category_id: currentProduct.category_id,
            raw_product_id: currentProduct.raw_product_id || null,
        };
        const { error } = currentProduct.id
            ? await supabase.from('products').update(productData).eq('id', currentProduct.id)
            : await supabase.from('products').insert([productData]);
        if (error) {
            setSaveError(error.message);
            setLoading(false);
            return;
        }
        setIsEditing(false);
        await fetchData();
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar este producto?')) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) { alert('Error al eliminar: ' + error.message); return; }
        await fetchData();
    }

    async function handleUpdatePrice(id: string, newPrice: string) {
        const price = parseFloat(newPrice);
        if (isNaN(price)) return;
        setProducts(products.map(p => p.id === id ? { ...p, price } : p));
        await supabase.from('products').update({ price }).eq('id', id);
    }

    async function handleAddCategory() {
        if (!newCategoryName.trim()) return;
        const { data } = await supabase.from('categories').insert([{ name: newCategoryName }]).select().single();
        if (data) {
            setCategories([...categories, data]);
            setIsAddingCategory(false);
            setNewCategoryName("");
        }
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const productsByCategory = filteredProducts.reduce((acc: any, product) => {
        const catName = product.categories?.name || "Otros";
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(product);
        return acc;
    }, {});

    const categoryGridItems = categories.map(cat => ({
        name: cat.name,
        count: productsByCategory[cat.name]?.length || 0,
        id: cat.id
    })).filter(c => c.count > 0);

    return (
        <div className="pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-gray-900">Menú</h2>
                    <p className="text-gray-500 font-medium">Gestiona productos y precios</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsAddingCategory(true)}
                        className="bg-gray-100 px-5 py-3 rounded-2xl font-bold flex items-center gap-2"
                    >
                        <IconTag size={18} /> Categorías
                    </button>
                    <button
                        onClick={() => {
                            setCurrentProduct({ id: "", name: "", description: "", price: "", category_id: categories[0]?.id });
                            setIsEditing(true);
                        }}
                        className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl"
                    >
                        <IconPlus size={20} /> Nuevo Item
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categoryGridItems.map(category => (
                    <div
                        key={category.id}
                        onClick={() => setSelectedCategory(category.name)}
                        className="cursor-pointer bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all border border-gray-50 flex justify-between items-center"
                    >
                        <div>
                            <h3 className="text-2xl font-black">{formatName(category.name)}</h3>
                            <span className="text-xs text-gray-400 font-bold uppercase">{category.count} Items</span>
                        </div>
                        <IconChevronRight className="text-gray-300" />
                    </div>
                ))}
            </div>

            {/* Category Modal */}
            <AnimatePresence>
                {selectedCategory && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/10 backdrop-blur-md">
                        <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-4xl font-black">{formatName(selectedCategory)}</h3>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setIsQuickPricing(!isQuickPricing)}
                                        className={`px-6 py-3 rounded-2xl font-bold ${isQuickPricing ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
                                    >
                                        {isQuickPricing ? "Guardando..." : "Editar Precios"}
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCategory(null); setIsQuickPricing(false); }}
                                        className="p-3 bg-gray-100 rounded-full"
                                    >
                                        <IconX />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {productsByCategory[selectedCategory]?.map((product: any) => (
                                    <div key={product.id} className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold flex-1 pr-2">{formatName(product.name)}</h4>
                                            {!isQuickPricing ? (
                                                <span className="font-black text-sm shrink-0">${product.price?.toLocaleString()}</span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    defaultValue={product.price}
                                                    onBlur={(e) => handleUpdatePrice(product.id, e.target.value)}
                                                    className="w-24 bg-white border rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-black"
                                                />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 italic mb-4">{product.description}</p>
                                        <div className="mt-auto pt-4 border-t border-gray-100/50 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg">
                                                <IconFlame size={12} className="animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-tight">
                                                    {product.total_vendidos || 0} vendidos
                                                </span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => {
                                                        setCurrentProduct({ ...product, price: String(product.price), raw_product_id: product.raw_product_id || "" });
                                                        setIsEditing(true);
                                                    }}
                                                    className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-black hover:text-white transition-all"
                                                >
                                                    <IconEdit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                                                >
                                                    <IconTrash size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* New Product Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
                    <div className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
                        <h3 className="text-2xl font-black mb-6">{currentProduct.id ? "Editar Producto" : "Nuevo Producto"}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <input
                                type="text" required placeholder="Nombre"
                                value={currentProduct.name}
                                onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                                className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold"
                            />
                            <input
                                type="text" placeholder="Descripción"
                                value={currentProduct.description}
                                onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                                className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold"
                            />
                            <input
                                type="number" required placeholder="Precio"
                                value={currentProduct.price}
                                onChange={e => setCurrentProduct({ ...currentProduct, price: e.target.value })}
                                className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold"
                            />
                            <select
                                value={currentProduct.category_id}
                                onChange={e => setCurrentProduct({ ...currentProduct, category_id: e.target.value })}
                                className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold"
                            >
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            
                            <div className="space-y-1.5 px-1">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Vincular para descontar Stock</label>
                                <select
                                    value={currentProduct.raw_product_id || ""}
                                    onChange={e => setCurrentProduct({ ...currentProduct, raw_product_id: e.target.value })}
                                    className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-sm appearance-none cursor-pointer"
                                >
                                    <option value="">No descuenta stock automáticamente</option>
                                    {rawProducts.map((rp: any) => (
                                        <option key={rp.id} value={rp.id}>
                                            {rp.name} (Stock: {rp.current_stock} {rp.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {saveError && (
                                <p className="text-sm font-bold text-red-600 bg-red-50 rounded-2xl px-4 py-3">{saveError}</p>
                            )}
                            <div className="flex gap-3">
                                <button type="button" onClick={() => { setIsEditing(false); setSaveError(null); }} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-1 py-4 bg-black text-white rounded-2xl font-black">
                                    {loading ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {isAddingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
                    <div className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl">
                        <h3 className="text-2xl font-black mb-6">Nueva Categoría</h3>
                        <input
                            type="text" placeholder="Nombre de categoría"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold mb-4"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setIsAddingCategory(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">Cancelar</button>
                            <button onClick={handleAddCategory} className="flex-1 py-4 bg-black text-white rounded-2xl font-black">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
