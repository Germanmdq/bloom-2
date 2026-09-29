"use client";

import { useState, useEffect } from "react";
import { IconDeviceFloppy, IconBuildingStore, IconAdjustments, IconDatabase, IconPrinter, IconShield, IconDownload, IconLayoutGrid, IconKeyboard, IconStar, IconCheck, IconSpeakerphone, IconPlus, IconTrash, IconEdit, IconX } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ComparisonType } from "@/components/dashboard/SalesComparisonPanel";
import { createClient } from "@/lib/supabase/client";
import IconPhoto from "next/image";


export default function SettingsPage() {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);

    const [mesas, setMesas] = useState(10);
    const [barra, setBarra] = useState(3);
    const [f1Action, setF1Action] = useState<ComparisonType>('yesterday');
    const [f2Action, setF2Action] = useState<ComparisonType>('last_week');

    // Ofertas del Día States
    const [dailyOffers, setDailyOffers] = useState<any[]>([
        { id: null, name: '', price: '' },
        { id: null, name: '', price: '' },
        { id: null, name: '', price: '' }
    ]);
    const [isSavingOffers, setIsSavingOffers] = useState(false);

    const [platoDiaProducts, setPlatoDiaProducts] = useState<any[]>([]);
    const [selectedPlatoDia, setSelectedPlatoDia] = useState<string | null>(null);
    const [platoDiaPrice, setPlatoDiaPrice] = useState<string>("");
    const [savingPlatoDia, setSavingPlatoDia] = useState(false);
    
    // Promociones States
    const [promotions, setPromotions] = useState<any[]>([]);
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [promoForm, setPromoForm] = useState({ id: '', name: '', description: '', price: '', image_url: '' });
    const [isSavingPromo, setIsSavingPromo] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from("app_settings")
                    .select("id, mesas, barra, whatsapp, plato_del_dia_id, plato_dia_price")
                    .eq("id", 1)
                    .single();

                if (data) {
                    setMesas(data.mesas);
                    setBarra(data.barra);
                    if (data.plato_del_dia_id) setSelectedPlatoDia(data.plato_del_dia_id);
                    if (data.plato_dia_price) setPlatoDiaPrice(String(data.plato_dia_price));
                }
            } catch (err: any) {
                console.error('[IconSettings] Error en loadSettings:', err.message);
            }

            const savedF1 = localStorage.getItem('bloom_f1_action') as ComparisonType | null;
            const savedF2 = localStorage.getItem('bloom_f2_action') as ComparisonType | null;
            if (savedF1) setF1Action(savedF1);
            if (savedF2) setF2Action(savedF2);

            // Load Platos Diarios products
            const { data: catData } = await supabase
                .from('categories')
                .select('id')
                .ilike('name', '%plato%diario%')
                .single();
            if (catData) {
                const { data: prods } = await supabase
                    .from('products')
                    .select('id, name, image_url, kind')
                    .eq('category_id', catData.id)
                    .eq('active', true)
                    .order('name');
                if (prods) {
                    setPlatoDiaProducts(prods);
                    const featured = prods.find((p: any) => p.kind === 'plato_del_dia');
                    if (featured) setSelectedPlatoDia(featured.id);
                }
            }

            // Load Ofertas del Día (Desde la nueva tabla dedicada)
            const { data: offersData } = await supabase
                .from('daily_promotions')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (offersData && offersData.length > 0) {
                const newOffers = [{ id: null, name: '', price: '' }, { id: null, name: '', price: '' }, { id: null, name: '', price: '' }];
                offersData.slice(0, 3).forEach((off, idx) => {
                    newOffers[idx] = { id: off.id, name: off.name, price: off.price || '' };
                });
                setDailyOffers(newOffers);
            }

            // Load Promociones
            const { data: promoData } = await supabase
                .from('products')
                .select('*')
                .eq('kind', 'promocion')
                .order('created_at', { ascending: false });
            if (promoData) setPromotions(promoData);

            setIsLoading(false);
        };
        loadSettings();
    }, []);

    // Handle Escape key to close modals
    useEffect(() => {
        const handleCloseAll = () => {
            setShowPromoModal(false);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleCloseAll();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('bloom-close-all', handleCloseAll);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('bloom-close-all', handleCloseAll);
        };
    }, []);

    const handleSaveOffers = async () => {
        setIsSavingOffers(true);
        try {
            for (const offer of dailyOffers) {
                if (!offer.name && !offer.id) continue;

                const payload = {
                    name: offer.name || '',
                    price: Number(offer.price) || 0,
                    active: !!offer.name
                };

                if (offer.id) {
                    await supabase.from('daily_promotions').update(payload).eq('id', offer.id);
                } else if (offer.name) {
                    await supabase.from('daily_promotions').insert([payload]);
                }
            }
            
            // Recargar desde la nueva tabla
            const { data: offersData } = await supabase
                .from('daily_promotions')
                .select('*')
                .order('created_at', { ascending: true });
            
            if (offersData) {
                const refreshed = [{ id: null, name: '', price: '' }, { id: null, name: '', price: '' }, { id: null, name: '', price: '' }];
                offersData.slice(0, 3).forEach((off, idx) => {
                    refreshed[idx] = { id: off.id, name: off.name, price: off.price || '' };
                });
                setDailyOffers(refreshed);
            }
            alert("¡Ofertas guardadas en la base de datos de promociones!");
        } catch (e: any) {
            alert("Error: " + e.message + ". ¿Creaste la tabla daily_promotions?");
        }
        setIsSavingOffers(false);
    };

    const handleDeleteOffer = async (id: string, idx: number) => {
        if (!id) {
            const newOffers = [...dailyOffers];
            newOffers[idx] = { id: null, name: '', price: '' };
            setDailyOffers(newOffers);
            return;
        }

        if (confirm("¿Seguro que quieres eliminar esta oferta?")) {
            const { error } = await supabase.from('daily_promotions').delete().eq('id', id);
            if (error) alert(error.message);
            else {
                const newOffers = [...dailyOffers];
                newOffers[idx] = { id: null, name: '', price: '' };
                setDailyOffers(newOffers);
            }
        }
    };

    const handleSavePlatoDia = async (productId: string) => {
        setSavingPlatoDia(true);
        setSelectedPlatoDia(productId);
        const price = parseFloat(platoDiaPrice) || 0;
        const { error } = await supabase
            .from('app_settings')
            .update({ plato_del_dia_id: productId, plato_dia_price: price, updated_at: new Date().toISOString() })
            .eq('id', 1);
        if (error) {
            await supabase.from('products').update({ kind: 'plato_del_dia' }).eq('id', productId);
            console.error('app_settings error:', error.message);
        }
        setSavingPlatoDia(false);
    };

    const handleSavePlatoDiaPrice = async () => {
        const price = parseFloat(platoDiaPrice) || 0;
        await supabase
            .from('app_settings')
            .update({ plato_dia_price: price, updated_at: new Date().toISOString() })
            .eq('id', 1);
    };

    const handleSavePromo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingPromo(true);
        const payload = {
            name: promoForm.name,
            description: promoForm.description,
            price: Number(promoForm.price),
            image_url: promoForm.image_url,
            kind: 'promocion',
            category: 'General',
            current_stock: 0,
            active: true
        };

        try {
            if (promoForm.id) {
                await supabase.from('products').update(payload).eq('id', promoForm.id);
            } else {
                await supabase.from('products').insert([payload]);
            }
            
            const { data } = await supabase.from('products').select('*').eq('kind', 'promocion').order('created_at', { ascending: false });
            if (data) setPromotions(data);
            
            setShowPromoModal(false);
            setPromoForm({ id: '', name: '', description: '', price: '', image_url: '' });
        } catch (err: any) {
            alert("Error guardando promoción: " + err.message);
        } finally {
            setIsSavingPromo(false);
        }
    };

    const handleDeletePromo = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(confirm("¿Seguro que quieres eliminar esta promoción?")) {
            await supabase.from('products').delete().eq('id', id);
            setPromotions(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        const { error } = await supabase
            .from("app_settings")
            .upsert({
                id: 1,
                mesas,
                barra,
                updated_at: new Date().toISOString(),
            });

        setIsLoading(false);
        if (error) {
            alert("Error al guardar: " + error.message);
        } else {
            alert("Ajustes guardados correctamente.");
        }

        // IconDeviceFloppy F-key actions to localStorage
        localStorage.setItem('bloom_f1_action', f1Action);
        localStorage.setItem('bloom_f2_action', f2Action);
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-1">Ajustes</h1>
                    <p className="text-gray-500 font-medium text-sm">Configurá tu sistema POS.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-black text-[#FFD60A] px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 self-start sm:self-auto"
                >
                    {isLoading ? "Guardando..." : <><IconDeviceFloppy size={18} /> Guardar</>}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">



                {/* SALON CONFIG */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700">
                            <IconLayoutGrid size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Distribución del Salón</h2>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">Se usa para generar los QR de cada mesa</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 max-w-sm">
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2">Mesas del salón</label>
                            <input
                                type="number"
                                min={1}
                                max={200}
                                value={mesas}
                                onChange={e => setMesas(Math.max(1, Math.min(200, Number(e.target.value))))}
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 text-xl font-black outline-none focus:ring-2 ring-[#FFD60A]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-amber-500 mb-2">Lugares de barra</label>
                            <input
                                type="number"
                                min={0}
                                max={50}
                                value={barra}
                                onChange={e => setBarra(Math.max(0, Math.min(50, Number(e.target.value))))}
                                className="w-full h-12 px-4 rounded-xl bg-amber-50 text-xl font-black outline-none focus:ring-2 ring-bloom-400"
                            />
                        </div>
                    </div>
                </section>

                {/* KEYBOARD SHORTCUTS */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFD60A]/20 flex items-center justify-center text-black">
                            <IconKeyboard size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Atajos de Teclado</h2>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">
                                Configurá qué comparativa de ventas muestra cada tecla de función
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2">
                                F1 — Comparativa
                            </label>
                            <select
                                value={f1Action}
                                onChange={(e) => setF1Action(e.target.value as ComparisonType)}
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 ring-[#FFD60A]"
                            >
                                <option value="yesterday">Día Anterior</option>
                                <option value="last_week">Mismo Día — Semana Anterior</option>
                                <option value="last_month">Mismo Día — Mes Anterior</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2">
                                F2 — Comparativa
                            </label>
                            <select
                                value={f2Action}
                                onChange={(e) => setF2Action(e.target.value as ComparisonType)}
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 ring-[#FFD60A]"
                            >
                                <option value="yesterday">Día Anterior</option>
                                <option value="last_week">Mismo Día — Semana Anterior</option>
                                <option value="last_month">Mismo Día — Mes Anterior</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium mt-4">
                        Presioná F1 o F2 en cualquier pantalla del dashboard (fuera del POS) para ver la comparativa configurada.
                    </p>
                </section>

                {/* PLATO DEL DÍA */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-bloom-50 flex items-center justify-center text-bloom-600">
                            <IconStar size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Plato del Día</h2>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">El plato seleccionado se destacará en el menú público</p>
                        </div>
                        {savingPlatoDia && <span className="ml-auto text-xs text-gray-400 animate-pulse">Guardando...</span>}
                    </div>

                    {/* Precio combo con bebida */}
                    <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                        <div className="flex-1">
                            <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-1">Precio Menú del Día (con bebida)</p>
                            <p className="text-[11px] text-amber-600 font-medium">Precio combo que aparece en el POS cuando el mozo lo agrega</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-amber-700">$</span>
                            <input
                                type="number"
                                value={platoDiaPrice}
                                onChange={e => setPlatoDiaPrice(e.target.value)}
                                onBlur={handleSavePlatoDiaPrice}
                                placeholder="14500"
                                className="w-28 h-10 px-3 rounded-xl bg-white border border-amber-200 font-black text-sm outline-none focus:ring-2 ring-amber-400/30 text-right"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {platoDiaProducts.map(product => {
                            const isSelected = selectedPlatoDia === product.id;
                            return (
                                <button
                                    key={product.id}
                                    onClick={() => handleSavePlatoDia(product.id)}
                                    className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-200 flex flex-col text-left ${
                                        isSelected ? 'border-bloom-600 shadow-lg shadow-bloom-100' : 'border-gray-100 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="relative h-28 bg-gray-100 w-full">
                                        {product.image_url ? (
                                            <IconPhoto src={product.image_url} alt={product.name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                                        )}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-bloom-600/20 flex items-center justify-center">
                                                <div className="bg-bloom-600 rounded-full p-1">
                                                    <IconCheck size={16} className="text-white" strokeWidth={3} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className={`text-xs font-black leading-tight ${isSelected ? 'text-bloom-600' : 'text-gray-700'}`}>
                                            {product.name}
                                        </p>
                                        {isSelected && (
                                            <span className="inline-block mt-1 text-[10px] font-black uppercase bg-bloom-100 text-bloom-600 px-2 py-0.5 rounded-full">
                                                ⭐ Plato del día
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* OFERTAS DEL DÍA */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <IconSpeakerphone size={24} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-gray-900">Ofertas del Día</h2>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">Aparecerán resaltadas arriba de todo en el menú del cliente (solo texto)</p>
                        </div>
                        <button 
                            onClick={handleSaveOffers} 
                            disabled={isSavingOffers}
                            className="bg-amber-500 text-white rounded-xl px-6 py-2 text-sm font-black hover:bg-amber-600 transition-all disabled:opacity-50"
                        >
                            {isSavingOffers ? "Guardando..." : "Actualizar Ofertas"}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {dailyOffers.map((offer, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Título de la Oferta {idx + 1}</label>
                                    <input 
                                        type="text" 
                                        value={offer.name} 
                                        onChange={(e) => {
                                            const newOffers = [...dailyOffers];
                                            newOffers[idx].name = e.target.value;
                                            setDailyOffers(newOffers);
                                        }}
                                        placeholder="Ej: Promo Café + Tostado"
                                        className="w-full h-12 px-4 rounded-xl bg-white border-transparent focus:ring-2 ring-amber-500 font-bold outline-none placeholder:text-gray-200"
                                    />
                                </div>
                                <div className="w-full sm:w-32">
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Precio ($)</label>
                                    <input 
                                        type="number" 
                                        value={offer.price} 
                                        onChange={(e) => {
                                            const newOffers = [...dailyOffers];
                                            newOffers[idx].price = e.target.value;
                                            setDailyOffers(newOffers);
                                        }}
                                        placeholder="0"
                                        className="w-full h-12 px-4 rounded-xl bg-white border-transparent focus:ring-2 ring-amber-500 font-bold outline-none placeholder:text-gray-200"
                                    />
                                </div>
                                <div className="flex items-end pb-1">
                                    <button 
                                        onClick={() => handleDeleteOffer(offer.id, idx)}
                                        className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                                        title="Eliminar oferta"
                                    >
                                        <IconTrash size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* PROMOCIONES */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <IconSpeakerphone size={24} />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-gray-900">Promociones Activas</h2>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">Se mostrarán destacadas en la pantalla principal de la web</p>
                        </div>
                        <button onClick={() => { setPromoForm({ id: '', name: '', description: '', price: '', image_url: '' }); setShowPromoModal(true); }} className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                            <IconPlus size={16} /> Nueva Promo
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {promotions.map(promo => (
                            <div key={promo.id} className="relative rounded-2xl border border-gray-100 overflow-hidden flex group hover:border-indigo-200 transition-colors">
                                <div className="w-1/3 relative bg-gray-50 min-h-[100px]">
                                    {promo.image_url ? (
                                        <IconPhoto src={promo.image_url} alt={promo.name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl">📸</div>
                                    )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col justify-center">
                                    <h3 className="font-black text-gray-900 mb-1">{promo.name}</h3>
                                    <p className="text-[11px] font-medium text-gray-500 leading-tight mb-2 line-clamp-2">{promo.description}</p>
                                    <span className="font-black text-indigo-600">${promo.price?.toLocaleString()}</span>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); setPromoForm({ id: promo.id, name: promo.name, description: promo.description, price: promo.price || '', image_url: promo.image_url || '' }); setShowPromoModal(true); }} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-gray-600 hover:text-black">
                                        <IconEdit size={14} />
                                    </button>
                                    <button onClick={(e) => handleDeletePromo(promo.id, e)} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <IconTrash size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {promotions.length === 0 && (
                            <div className="col-span-2 text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                                <p className="text-sm font-bold text-gray-400">No hay promociones activas.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* DEVICE & DATA */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                            <IconDatabase size={24} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900">Datos & Dispositivos</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => {
                                const currentPrinter = localStorage.getItem('bloom_printer_ip') || '';
                                const newPrinter = prompt("Ingresa la IP o Nombre de la Impresora de Red (simulada):", currentPrinter);
                                if (newPrinter !== null) {
                                    localStorage.setItem('bloom_printer_ip', newPrinter);
                                    alert(`Impresora configurada a: ${newPrinter}`);
                                    // Trigger browser print as test
                                    window.print();
                                }
                            }}
                            className="h-24 rounded-2xl bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center gap-2 group transition-all"
                        >
                            <IconPrinter className="text-gray-400 group-hover:text-black transition-colors" />
                            <span className="text-xs font-black uppercase text-gray-400 group-hover:text-black">Configurar Impresora</span>
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const { createClient } = await import("@/lib/supabase/client");
                                    const supabase = createClient();

                                    const { data: sales, error } = await supabase
                                        .from('orders')
                                        .select('*')
                                        .order('created_at', { ascending: false });

                                    if (error) throw error;

                                    if (!sales || sales.length === 0) {
                                        alert("No hay ventas para exportar.");
                                        return;
                                    }

                                    // Generate CSV
                                    const headers = ["ID", "Fecha", "Total", "Estado", "Mesa"];
                                    const rows = sales.map(sale => [
                                        sale.id,
                                        new Date(sale.created_at).toLocaleString(),
                                        sale.total,
                                        sale.status,
                                        sale.table_id || '-'
                                    ]);

                                    const csvContent = "data:text/csv;charset=utf-8,"
                                        + [headers, ...rows].map(e => e.join(",")).join("\n");

                                    const encodedUri = encodeURI(csvContent);
                                    const link = document.createElement("a");
                                    link.setAttribute("href", encodedUri);
                                    link.setAttribute("download", `ventas_bloom_${new Date().toISOString().slice(0, 10)}.csv`);
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);

                                } catch (error: any) {
                                    alert("Error al exportar: " + error.message);
                                }
                            }}
                            className="h-24 rounded-2xl bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center gap-2 group transition-all"
                        >
                            <IconDownload className="text-gray-400 group-hover:text-black transition-colors" />
                            <span className="text-xs font-black uppercase text-gray-400 group-hover:text-black">Exportar Ventas CSV</span>
                        </button>
                        <button
                            onClick={() => {
                                if (confirm("ADVERTENCIA: ¿Estás seguro de que quieres resetear la configuración local del dispositivo? Se cerrará la sesión.")) {
                                    localStorage.clear();
                                    sessionStorage.clear();
                                    // Clear cookies manually if needed or let supabase handle signout
                                    document.cookie.split(";").forEach((c) => {
                                        document.cookie = c
                                            .replace(/^ +/, "")
                                            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                                    });
                                    window.location.href = "/";
                                }
                            }}
                            className="h-24 rounded-2xl bg-red-50 hover:bg-red-100 flex flex-col items-center justify-center gap-2 group transition-all"
                        >
                            <IconShield className="text-red-300 group-hover:text-red-500 transition-colors" />
                            <span className="text-xs font-black uppercase text-red-300 group-hover:text-red-500">Resetear Sistema</span>
                        </button>
                    </div>
                </section>

            </div>

            {/* PROMOCION MODAL */}
            <AnimatePresence>
                {showPromoModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPromoModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-lg z-10 border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black text-gray-900">{promoForm.id ? "Editar" : "Crear"} Promoción</h2>
                                <button onClick={() => setShowPromoModal(false)} className="text-gray-400 hover:text-black"><IconX size={24} /></button>
                            </div>
                            <form onSubmit={handleSavePromo} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Título</label>
                                    <input type="text" required value={promoForm.name} onChange={e => setPromoForm({...promoForm, name: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-indigo-500 font-bold outline-none" placeholder="Ej: Super Desayuno" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Descripción</label>
                                    <textarea rows={3} required value={promoForm.description} onChange={e => setPromoForm({...promoForm, description: e.target.value})} className="w-full p-4 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-indigo-500 font-bold outline-none resize-none" placeholder="Ingresa los detalles de lo que incluye..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">Precio ($)</label>
                                        <input type="number" required value={promoForm.price} onChange={e => setPromoForm({...promoForm, price: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-indigo-500 font-bold outline-none" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1">URL Imagen (Opcional)</label>
                                        <input type="text" value={promoForm.image_url} onChange={e => setPromoForm({...promoForm, image_url: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-indigo-500 font-bold outline-none text-sm placeholder:text-gray-300" placeholder="https://ejemplo.com/foto.jpg" />
                                    </div>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setShowPromoModal(false)} className="flex-1 h-12 rounded-xl font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">Cancelar</button>
                                    <button type="submit" disabled={isSavingPromo} className="flex-1 h-12 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                                        {isSavingPromo ? "Guardando..." : "Guardar Promo"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
