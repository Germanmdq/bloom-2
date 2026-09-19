"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    useStock, 
    useInventoryMovements, 
    useCreateMovement, 
    useProducts, 
    useExpenses, 
    useCreateExpense, 
    useSuppliers,
    useCreateSupplier,
    useUpdateSupplier,
    useCreateProduct
} from "@/lib/hooks/use-pos-data";
import { 
    IconLoader2, IconPlus, IconArrowDown, IconAlertTriangle, IconPackage, IconSearch,
    IconReceipt, IconUsers, IconTrendingDown, IconBulb, IconFlame, IconHome,
    IconTool, IconFileText, IconShoppingCart, IconSpeakerphone, IconShieldExclamation,
    IconDots, IconEdit, IconPhone, IconMail, IconTag, IconCheck, IconX, IconHistory, IconFilter
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = 'stock' | 'expenses' | 'suppliers';

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<Tab>('stock');
    
    // Data Hooks
    const { data: stock = [], isLoading: stockLoading } = useStock();
    const { data: rawProducts = [] } = useProducts();
    const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
    const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
    
    // Mutation Hooks
    const createMovement = useCreateMovement();
    const createExpense = useCreateExpense();
    const createSupplier = useCreateSupplier();
    const updateSupplier = useUpdateSupplier();
    const createProduct = useCreateProduct();

    const rawOptions = rawProducts.filter((p: any) => p.kind === 'raw');

    // UI States
    const [showStockModal, setShowStockModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);

    // IconSearch & IconFilter States
    const [stockSearch, setStockSearch] = useState("");
    const [expenseSearch, setExpenseSearch] = useState("");
    const [supplierSearch, setSupplierSearch] = useState("");

    // Form States - Stock
    const [stockForm, setStockForm] = useState({
        type: 'purchase' as 'purchase' | 'waste' | 'adjustment',
        note: "",
        supplierId: "",
        items: [{ productId: "", qty: "", search: "", isOpen: false }]
    });

    // Form States - Expenses
    const [expenseForm, setExpenseForm] = useState({
        description: "",
        amount: "",
        category: "Mercadería",
        supplierId: ""
    });

    // Form States - Suppliers
    const [supplierForm, setSupplierForm] = useState({
        name: "",
        phone: "",
        provided_items: [] as string[]
    });
    const [supplierItemSearch, setSupplierItemSearch] = useState("");
    const [isSupplierItemSearchOpen, setIsSupplierItemSearchOpen] = useState(false);

    // Handlers
    const handleAddStockItem = () => {
        setStockForm(prev => ({
            ...prev,
            items: [...prev.items, { productId: "", qty: "", search: "", isOpen: false }]
        }));
    };

    const handleRemoveStockItem = (index: number) => {
        if (stockForm.items.length === 1) return;
        setStockForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateStockItem = (index: number, field: string, value: any) => {
        setStockForm(prev => {
            const newItems = [...prev.items];
            newItems[index] = { ...newItems[index], [field]: value };
            return { ...prev, items: newItems };
        });
    };

    const handleStockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validItems = stockForm.items.filter(item => item.productId && item.qty);
        if (validItems.length === 0) return;

        try {
            const movements = validItems.map(item => {
                let finalDelta = parseFloat(item.qty);
                if (stockForm.type === 'waste') finalDelta = -Math.abs(finalDelta);
                if (stockForm.type === 'purchase') finalDelta = Math.abs(finalDelta);

                return createMovement.mutateAsync({
                    raw_product_id: item.productId,
                    qty: finalDelta,
                    reason: stockForm.type,
                    ref_table: 'manual',
                    note: stockForm.note || 'Movimiento manual',
                    supplier_id: stockForm.supplierId || null
                });
            });

            await Promise.all(movements);
            setShowStockModal(false);
            setStockForm({ 
                type: 'purchase', 
                note: "", 
                supplierId: "", 
                items: [{ productId: "", qty: "", search: "", isOpen: false }] 
            });
            alert("Operación registrada con éxito ✅ (" + validItems.length + " ítems)");
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleExpenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createExpense.mutateAsync({
                description: expenseForm.description,
                amount: parseFloat(expenseForm.amount),
                category: expenseForm.category,
                supplier_id: expenseForm.supplierId || null
            });
            setShowExpenseModal(false);
            setExpenseForm({ description: "", amount: "", category: "Mercadería", supplierId: "" });
            alert("Gasto registrado ✅");
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleSupplierSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSave = {
                name: supplierForm.name,
                phone: supplierForm.phone,
                category: supplierForm.provided_items.join(", ")
            };

            if (editingSupplier) {
                await updateSupplier.mutateAsync({ id: editingSupplier.id, ...dataToSave });
                alert("Proveedor actualizado ✅");
            } else {
                await createSupplier.mutateAsync(dataToSave);
                alert("Proveedor creado ✅");
            }
            setShowSupplierModal(false);
            setEditingSupplier(null);
            setSupplierForm({ name: "", phone: "", provided_items: [] });
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleQuickCreateInsumo = async (name: string, type: 'stock' | 'supplier', index?: number) => {
        try {
            const result = await createProduct.mutateAsync({
                name,
                kind: 'raw',
                category_id: null,
                current_stock: 0,
                min_stock: 0,
                active: true,
                price: 0
            });
            const newId = result[0].id;
            if (type === 'stock' && index !== undefined) {
                updateStockItem(index, 'productId', newId);
                updateStockItem(index, 'search', name);
                updateStockItem(index, 'isOpen', false);
            } else if (type === 'supplier') {
                setSupplierForm(prev => ({ ...prev, provided_items: [...prev.provided_items, name] }));
                setSupplierItemSearch("");
                setIsSupplierItemSearchOpen(false);
            }
            alert(`Insumo "${name}" creado ✅`);
        } catch (err: any) {
            alert("Error al crear: " + err.message);
        }
    };

    // F1 Shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                const searchId = activeTab === 'stock' ? 'stock-search' : 
                               activeTab === 'expenses' ? 'expense-search' : 
                               activeTab === 'suppliers' ? 'supplier-search' : null;
                if (searchId) document.getElementById(searchId)?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab]);

    // Filters Logic
    const filteredStock = useMemo(() => stock.filter((item: any) =>
        item.name.toLowerCase().includes(stockSearch.toLowerCase())
    ), [stock, stockSearch]);

    const filteredExpenses = useMemo(() => expenses.filter((exp: any) =>
        exp.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.suppliers?.name?.toLowerCase().includes(expenseSearch.toLowerCase())
    ), [expenses, expenseSearch]);

    const filteredSuppliers = useMemo(() => suppliers.filter((s: any) =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.category?.toLowerCase().includes(supplierSearch.toLowerCase())
    ), [suppliers, supplierSearch]);

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const getExpenseIcon = (cat: string) => {
        switch (cat) {
            case 'Luz': return <IconBulb size={24} />;
            case 'Gas': return <IconFlame size={24} />;
            case 'Alquiler': return <IconHome size={24} />;
            case 'Sueldos': return <IconUsers size={24} className="text-blue-500" />;
            case 'Reparaciones': return <IconTool size={24} className="text-orange-500" />;
            case 'Impuestos': return <IconFileText size={24} className="text-purple-500" />;
            case 'Mercadería': return <IconShoppingCart size={24} className="text-emerald-500" />;
            case 'Publicidad': return <IconSpeakerphone size={24} className="text-pink-500" />;
            case 'Seguros': return <IconShieldExclamation size={24} className="text-indigo-500" />;
            default: return <IconDots size={24} />;
        }
    };

    if (stockLoading || expensesLoading || suppliersLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <IconLoader2 className="animate-spin text-gray-200" size={64} />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-40">
            {/* HEADER & QUICK ACTIONS */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-1 uppercase">OPERACIONES</h1>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em]">Gestión Integral Bloom</p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => { setStockForm({...stockForm, type: 'purchase'}); setShowStockModal(true); }} className="flex-1 lg:flex-none h-16 px-6 bg-black text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"> <IconShoppingCart size={18} /> + Insumo </button>
                    <button onClick={() => setShowExpenseModal(true)} className="flex-1 lg:flex-none h-16 px-6 bg-red-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-500/10"> <IconReceipt size={18} /> + Gasto </button>
                    <button onClick={() => { setEditingSupplier(null); setSupplierForm({ name: "", phone: "", provided_items: [] }); setShowSupplierModal(true); }} className="flex-1 lg:flex-none h-16 px-6 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/10"> <IconUsers size={18} /> + Proveedor </button>
                </div>
            </header>

            {/* MAIN NAVIGATION TABS */}
            <div className="flex bg-gray-50/80 backdrop-blur-md p-1.5 rounded-[2rem] border border-gray-100 shadow-inner mb-12 overflow-x-auto no-scrollbar">
                {(['stock', 'expenses', 'suppliers'] as Tab[]).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[100px] py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-md border border-gray-100' : 'text-gray-400 hover:text-gray-600' }`}> {tab === 'stock' ? 'Insumos' : tab === 'expenses' ? 'Gastos' : 'Proveedores'} </button>
                ))}
            </div>

            {/* CONTENT AREA */}
            <AnimatePresence mode="wait">
                {activeTab === 'stock' && (
                    <motion.div key="stock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="flex items-center justify-between mb-8 gap-4">
                            <div className="relative flex-1 max-w-md">
                                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                <input id="stock-search" type="text" value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} placeholder="Buscar insumo (F1)..." className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white border-transparent focus:ring-2 ring-black/5 shadow-sm outline-none font-bold" />
                            </div>
                            <button onClick={() => { setStockForm({...stockForm, type: 'waste'}); setShowStockModal(true); }} className="h-14 px-8 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-red-100 transition-all"> <IconArrowDown size={18} /> Merma </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredStock.map((item: any) => {
                                const isLow = item.current_stock <= item.min_stock;
                                return ( <div key={item.id} className={`p-8 rounded-[2.5rem] border-2 ${isLow ? 'border-red-100 bg-red-50/50' : 'border-transparent bg-white'} shadow-sm hover:shadow-xl transition-all group`}> <div className="flex justify-between items-start mb-6"> <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform"> <IconPackage size={28} /> </div> {isLow && ( <div className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse"> <IconAlertTriangle size={12} /> Bajo Stock </div> )} </div> <h3 className="text-xl font-black text-gray-900 mb-2">{item.name}</h3> <div className="flex items-baseline gap-1"> <span className={`text-5xl font-black ${isLow ? 'text-red-500' : 'text-gray-900'}`}> {Number(item.current_stock || 0).toLocaleString()} </span> <span className="text-sm font-bold text-gray-400 uppercase tracking-widest"> {item.unit} </span> </div> {item.total_vendidos > 0 && ( <div className="mt-4 flex items-center gap-2 text-orange-600"> <IconFlame size={14} /> <span className="text-xs font-black uppercase tracking-tighter">{item.total_vendidos} Vendidos Históricos</span> </div> )} <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between text-xs font-bold text-gray-400 font-mono"> <span>MIN: {item.min_stock}</span> <span className="opacity-50">{item.id.slice(0, 8)}</span> </div> </div> );
                            })}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'expenses' && (
                    <motion.div key="expenses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <div className="flex items-center justify-between mb-10 gap-6">
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="bg-white px-8 py-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4"> <IconTrendingDown className="text-red-500" size={24} /> <div> <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Gastos</p> <p className="text-2xl font-black text-gray-900">${totalExpenses.toLocaleString()}</p> </div> </div>
                                <div className="relative w-64"> <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} /> <input id="expense-search" type="text" value={expenseSearch} onChange={(e) => setExpenseSearch(e.target.value)} placeholder="Filtrar gastos (F1)..." className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white border-transparent shadow-sm outline-none font-bold text-sm" /> </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {filteredExpenses.map((expense: any) => ( <div key={expense.id} className="bg-white p-6 rounded-[2rem] border border-transparent hover:border-gray-100 hover:shadow-xl transition-all flex items-center justify-between group"> <div className="flex items-center gap-6"> <div className="w-16 h-16 rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-gray-400 group-hover:scale-105 transition-transform"> {getExpenseIcon(expense.category)} </div> <div> <h4 className="text-lg font-black text-gray-900">{expense.description}</h4> <div className="flex items-center gap-3 mt-1"> <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(expense.expense_date).toLocaleDateString()}</span> {expense.suppliers?.name && ( <> <span className="w-1 h-1 rounded-full bg-gray-200" /> <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">💼 {expense.suppliers.name}</span> </> )} </div> </div> </div> <div className="text-right"> <p className="text-2xl font-black text-red-600">-${Number(expense.amount || 0).toLocaleString()}</p> <span className="text-[10px] font-black text-gray-400 border border-gray-100 px-3 py-1 rounded-full uppercase tracking-tighter mt-2 inline-block font-mono"> {expense.category} </span> </div> </div> ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'suppliers' && (
                    <motion.div key="suppliers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                         <div className="flex items-center justify-between mb-8"> <div className="relative flex-1 max-w-md"> <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} /> <input id="supplier-search" type="text" value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} placeholder="Buscar proveedores (F1)..." className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white border-transparent focus:ring-2 ring-black/5 shadow-sm outline-none font-bold" /> </div> </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredSuppliers.map((supplier: any) => ( <div key={supplier.id} className="bg-white p-8 rounded-[2.5rem] border border-transparent hover:border-gray-100 shadow-sm hover:shadow-xl transition-all group"> <div className="flex justify-between items-start mb-6"> <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform"> <IconUsers size={28} /> </div> <button onClick={() => { setEditingSupplier(supplier); setSupplierForm({ name: supplier.name, phone: supplier.phone || "", provided_items: supplier.category ? supplier.category.split(", ") : [] }); setShowSupplierModal(true); }} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-black transition-all"> <IconEdit size={16} /> </button> </div> <h3 className="text-xl font-black text-gray-900 mb-1">{supplier.name}</h3> <div className="space-y-3 mt-4 text-xs font-bold text-gray-500"> {supplier.phone && ( <div className="flex items-center gap-3"> <IconPhone size={14} className="text-emerald-500" /> {supplier.phone} </div> )} {supplier.category && ( <div className="flex flex-wrap gap-1 items-center"> <IconTag size={14} className="text-gray-300" /> {supplier.category.split(", ").map((t: string) => <span key={t} className="bg-gray-50 px-2 py-0.5 rounded text-[9px] uppercase">{t}</span>)} </div> )} </div> </div> ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODALS */}
            {showStockModal && ( 
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"> 
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowStockModal(false)} /> 
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white/95 backdrop-blur-3xl p-10 rounded-[3rem] shadow-2xl w-full max-w-4xl border border-white/50 overflow-visible max-h-[90vh] overflow-y-auto"> 
                        <h2 className="text-3xl font-black mb-1 capitalize">Registro de {stockForm.type === 'purchase' ? 'Compra' : 'Movimiento'}</h2> 
                        <p className="text-sm font-bold text-gray-400 mb-8 uppercase tracking-widest font-mono">Carga Masiva de Insumos</p> 
                        
                        <form onSubmit={handleStockSubmit} className="space-y-8"> 
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                                <div> 
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Proveedor (Opcional)</label> 
                                    <select value={stockForm.supplierId} onChange={(e) => setStockForm({...stockForm, supplierId: e.target.value})} className="w-full h-14 px-5 rounded-2xl bg-white border-transparent focus:ring-2 ring-black font-bold outline-none appearance-none cursor-pointer"> 
                                        <option value="">Sin Proveedor / Compra Directa</option> 
                                        {suppliers.map((s: any) => ( <option key={s.id} value={s.id}>{s.name}</option> ))} 
                                    </select> 
                                </div> 
                                <div> 
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Observaciones</label> 
                                    <input type="text" value={stockForm.note} onChange={(e) => setStockForm({...stockForm, note: e.target.value})} className="w-full h-14 px-6 rounded-2xl bg-white border-transparent focus:ring-2 ring-black font-bold outline-none" placeholder="Ej: Factura #1234..." /> 
                                </div> 
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ítems a cargar</label>
                                {stockForm.items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                        <div className="md:col-span-1 flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400">{index + 1}</div>
                                        </div>
                                        <div className="md:col-span-6 relative">
                                            <div className="relative">
                                                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} /> 
                                                <input type="text" placeholder="Buscar insumo..." value={item.search} 
                                                    onChange={(e) => {
                                                        updateStockItem(index, 'search', e.target.value);
                                                        updateStockItem(index, 'isOpen', true);
                                                        if (!e.target.value) updateStockItem(index, 'productId', "");
                                                    }}
                                                    onFocus={() => updateStockItem(index, 'isOpen', true)}
                                                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none text-sm" 
                                                />
                                                {item.isOpen && item.search && (
                                                    <div className="absolute z-[110] w-full mt-2 bg-white rounded-2xl shadow-2xl max-h-48 overflow-y-auto border border-gray-100 p-2">
                                                        {rawOptions.filter((p: any) => p.name.toLowerCase().includes(item.search.toLowerCase())).map((p: any) => (
                                                            <div key={p.id} onClick={() => {
                                                                updateStockItem(index, 'productId', p.id);
                                                                updateStockItem(index, 'search', p.name);
                                                                updateStockItem(index, 'isOpen', false);
                                                            }} className="p-4 hover:bg-gray-50 rounded-xl cursor-pointer flex justify-between items-center transition-colors">
                                                                <span className="font-bold text-gray-900 text-sm">{p.name}</span>
                                                                <span className="text-[10px] text-gray-400 font-black uppercase font-mono">{p.unit}</span>
                                                            </div>
                                                        ))}
                                                        <div onClick={() => handleQuickCreateInsumo(item.search, 'stock', index)} className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl cursor-pointer flex items-center justify-center gap-2 border border-dashed border-emerald-200 transition-all">
                                                            <IconPlus size={14} className="text-emerald-600" />
                                                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Crear "{item.search}" como nuevo</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="md:col-span-3">
                                            <input type="number" step="0.01" value={item.qty} 
                                                onChange={(e) => updateStockItem(index, 'qty', e.target.value)}
                                                className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none text-sm" 
                                                placeholder="Cantidad" required 
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <button type="button" onClick={() => handleRemoveStockItem(index)} className="w-full h-14 rounded-2xl flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors">
                                                <IconX size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddStockItem} className="w-full h-14 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:border-black hover:text-black transition-all flex items-center justify-center gap-2">
                                    <IconPlus size={16} /> Agregar otro insumo
                                </button>
                            </div>

                            <div className="flex gap-4 pt-6"> 
                                <button type="button" onClick={() => setShowStockModal(false)} className="flex-1 h-16 rounded-2xl font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest">Cerrar</button> 
                                <button type="submit" className={`flex-[2] h-16 rounded-2xl font-black text-white transition-all shadow-xl shadow-black/10 hover:scale-105 active:scale-95 ${stockForm.type === 'waste' ? 'bg-red-600' : 'bg-black'}`}> 
                                    Confirmar Carga ({stockForm.items.filter(i => i.productId).length} ítems)
                                </button> 
                            </div> 
                        </form> 
                    </motion.div> 
                </div> 
            )}

            {showExpenseModal && ( 
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"> 
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)} /> 
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white/95 backdrop-blur-3xl p-10 rounded-[3rem] shadow-2xl w-full max-w-xl border border-white/50"> 
                        <h2 className="text-3xl font-black mb-1 capitalize">Registrar Gasto</h2> 
                        <p className="text-sm font-bold text-gray-400 mb-8 uppercase tracking-widest font-mono">Salida de Caja</p> 
                        <form onSubmit={handleExpenseSubmit} className="space-y-6"> 
                            <div> 
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Descripción del Gasto</label> 
                                <input type="text" required value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none" placeholder="Ej: Pago de servicios..." /> 
                            </div> 
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
                                <div> 
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Monto ($ Total)</label> 
                                    <input type="number" required value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none" placeholder="0.00" /> 
                                </div> 
                                <div> 
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoría</label> 
                                    <select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none appearance-none cursor-pointer"> 
                                        <option value="Mercadería">Mercadería</option> 
                                        <option value="Sueldos">Sueldos / Personal</option> 
                                        <option value="Servicios">Servicios (Luz, Agua, Gas)</option> 
                                        <option value="Alquiler">Alquiler</option> 
                                        <option value="Reparaciones">Reparaciones</option> 
                                        <option value="Impuestos">Impuestos</option> 
                                        <option value="Publicidad">Publicidad</option> 
                                        <option value="Seguros">Seguros</option> 
                                        <option value="Otros">Otros</option> 
                                    </select> 
                                </div> 
                            </div> 
                            <div> 
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Proveedor Asociado</label> 
                                <select value={expenseForm.supplierId} onChange={(e) => setExpenseForm({...expenseForm, supplierId: e.target.value})} className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none appearance-none cursor-pointer"> 
                                    <option value="">Proveedor Ocasional / Otros</option> 
                                    {suppliers.map((s: any) => ( <option key={s.id} value={s.id}>{s.name}</option> ))} 
                                </select> 
                            </div> 
                            <div className="flex gap-4 pt-6"> 
                                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 h-14 rounded-2xl font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest">Cerrar</button> 
                                <button type="submit" className="flex-[2] h-14 rounded-2xl font-black text-white bg-red-600 transition-all shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95">Confirmar Gasto</button> 
                            </div> 
                        </form> 
                    </motion.div> 
                </div> 
            )}

            {showSupplierModal && ( 
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"> 
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => {setShowSupplierModal(false); setEditingSupplier(null);}} /> 
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white/95 backdrop-blur-3xl p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-white/50"> 
                        <h2 className="text-3xl font-black mb-1">{editingSupplier ? 'Editar' : 'Nuevo'} Proveedor</h2> 
                        <form onSubmit={handleSupplierSubmit} className="space-y-6 mt-8"> 
                            <div> 
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nombre</label> 
                                <input type="text" required value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none" placeholder="Ej: La Serenísima" /> 
                            </div> 
                            <div> 
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Teléfono (WhatsApp)</label> 
                                <input type="text" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none" placeholder="Opcional..." /> 
                            </div> 
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Insumos que provee</label>
                                <div className="relative">
                                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input type="text" placeholder="Buscar insumo..." value={supplierItemSearch}
                                        onChange={(e) => { setSupplierItemSearch(e.target.value); setIsSupplierItemSearchOpen(true); }}
                                        onFocus={() => setIsSupplierItemSearchOpen(true)}
                                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-gray-50 border-transparent focus:ring-2 ring-black/5 outline-none font-bold text-sm"
                                    />
                                    {isSupplierItemSearchOpen && supplierItemSearch && (
                                        <div className="absolute z-[110] w-full mt-2 bg-white rounded-xl shadow-2xl max-h-40 overflow-y-auto border border-gray-100 p-2">
                                            {rawOptions.filter(p => p.name.toLowerCase().includes(supplierItemSearch.toLowerCase()) && !supplierForm.provided_items.includes(p.name)).map(p => (
                                                <div key={p.id} onClick={() => {
                                                    setSupplierForm(prev => ({ ...prev, provided_items: [...prev.provided_items, p.name] }));
                                                    setSupplierItemSearch("");
                                                    setIsSupplierItemSearchOpen(false);
                                                }} className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer font-bold text-xs uppercase text-emerald-600">
                                                    + {p.name}
                                                </div>
                                            ))}
                                            <div onClick={() => handleQuickCreateInsumo(supplierItemSearch, 'supplier')} className="p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer flex items-center justify-center gap-2 border border-dashed border-emerald-200 mt-1 transition-all">
                                                <IconPlus size={12} className="text-emerald-600" />
                                                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none">Crear nuevo insumo</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {supplierForm.provided_items.map(item => (
                                        <span key={item} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-2 border border-emerald-100">
                                            {item} <button type="button" onClick={() => setSupplierForm(prev => ({ ...prev, provided_items: prev.provided_items.filter(i => i !== item) }))}><IconX size={10} /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4"> 
                                <button type="button" onClick={() => {setShowSupplierModal(false); setEditingSupplier(null);}} className="flex-1 h-16 rounded-2xl font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest">Cerrar</button> 
                                <button type="submit" className="flex-[2] h-16 rounded-2xl font-black text-white bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95">{editingSupplier ? 'Guardar' : 'Crear'}</button> 
                            </div> 
                        </form> 
                    </motion.div> 
                </div> 
            )}
        </div>
    );
}
