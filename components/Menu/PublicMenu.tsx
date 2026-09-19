"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { MenuProductCard } from "./MenuProductCard";
import { IconX, IconSend, IconMapPin, IconUser, IconChevronRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

type CartItem = {
    product: any;
    quantity: number;
};

export function PublicMenu({ categories, products }: { categories: any[], products: any[] }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [address, setAddress] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [currentPromoIndex, setCurrentPromoIndex] = useState(0);

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = useCallback((productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    }, []);

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.product.id === productId) {
                    const newQty = item.quantity + delta;
                    return newQty > 0 ? { ...item, quantity: newQty } : item;
                }
                return item;
            });
        });
    };

    const total = useMemo(() => {
        return cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
    }, [cart]);

    useEffect(() => {
        const w = window as Window & {
            __bloomPublicMenu?: { removeFromCart: (productId: string) => void };
        };
        w.__bloomPublicMenu = { removeFromCart };
        return () => {
            delete w.__bloomPublicMenu;
        };
    }, [removeFromCart]);

    // Auto-Slider para Promociones
    useEffect(() => {
        let promoProducts = products.filter((p: any) => 
            p.name.toLowerCase().includes('promo') || 
            p.name.toLowerCase().includes('oferta')
        );
        
        if (promoProducts.length === 0 && products.length > 0) {
            promoProducts = [...products].slice(0, 3);
        }

        if (promoProducts.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentPromoIndex(prev => (prev + 1) % promoProducts.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [products]);

    const handleCheckout = () => {
        if (!address) {
            alert("Por favor ingresa tu dirección para el delivery.");
            return;
        }

        const storedPhone = localStorage.getItem("bloom_whatsapp_number");
        const PHONE_NUMBER = storedPhone || "5492231234567";

        if (!storedPhone) {
            // Optional: Warn user they are using the default number
            console.warn("Using default WhatsApp number. Configure in IconSettings.");
        }

        let message = `Hola BLOOM! Quiero hacer un pedido: \n\n`;
        cart.forEach(item => {
            message += `▪️ ${item.quantity}x ${item.product.name} ($${item.product.price * item.quantity})\n`;
        });

        message += `\n💰 *Total: $${total.toLocaleString('es-AR')}*\n`;
        message += `📍 *Dirección:* ${address}\n`;
        if (customerName) message += `👤 *Nombre:* ${customerName}\n`;

        const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="pb-32 px-4">
            {/* SECCIÓN: OFERTA DEL DÍA (Misma estética Apple Pro) */}
            {(() => {
                let promoProducts = products.filter((p: any) => 
                    p.name.toLowerCase().includes('promo') || 
                    p.name.toLowerCase().includes('oferta')
                );
                
                if (promoProducts.length === 0 && products.length > 0) {
                    promoProducts = [...products].slice(0, 3);
                }

                if (promoProducts.length === 0) return null;

                return (
                    <div className="mb-10 mt-6 relative group overflow-hidden bg-[#3E2723] rounded-[2.5rem] p-8 text-white shadow-2xl transition-all border border-white/10">
                        {/* Glow effect matching Bloom brand tones (Cafe/Earthy) */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#E8A387]/10 rounded-full blur-[80px]" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex flex-col gap-1 text-center md:text-left">
                                <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] text-[#E8A387] border border-white/5 mx-auto md:mx-0 w-fit">
                                    Destacado de hoy
                                </span>
                                <h4 className="text-3xl font-black tracking-tighter leading-tight mt-2">Oferta del día</h4>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                    Promociones exclusivas por tiempo limitado
                                </p>
                            </div>

                            <div className="w-full md:w-auto overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {promoProducts.map((p: any, idx: number) => idx === currentPromoIndex && (
                                        <motion.button
                                            key={p.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            onClick={() => addToCart(p)}
                                            className="w-full md:w-64 bg-white text-[#3E2723] rounded-3xl p-5 shadow-xl flex flex-col items-start gap-1 active:scale-95 transition-all group"
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{p.name}</span>
                                            <div className="flex items-baseline gap-2 w-full">
                                                <span className="text-2xl font-black tracking-tighter">${p.price.toLocaleString('es-AR')}</span>
                                                <span className="text-[10px] font-black bg-[#E8A387]/20 text-[#C17154] px-2 py-0.5 rounded-full ml-auto">PEDIR AHORA</span>
                                            </div>
                                        </motion.button>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {categories?.map((category: any) => {
                const catProducts = products?.filter((p: any) => p.category_id === category.id);
                if (!catProducts || catProducts.length === 0) return null;

                return (
                    <div key={category.id} className="mb-8">
                        <h2 className="text-2xl font-black uppercase tracking-widest text-[#6B4E3D] border-b-2 border-[#E8A387]/30 pb-4 mb-4">
                            {category.name}
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {catProducts.map((product: any) => (
                                <div key={product.id} onClick={() => addToCart(product)} className="cursor-pointer active:scale-[0.98] transition-transform">
                                    <MenuProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Floating Cart Button */}
            <AnimatePresence>
                {cart.length > 0 && !isCartOpen && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-0 right-0 px-6 z-40 flex justify-center"
                    >
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="bg-[#25D366] text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 w-full max-w-sm hover:scale-105 transition-transform"
                        >
                            <div className="bg-white text-[#25D366] w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                {cart.reduce((acc, i) => acc + i.quantity, 0)}
                            </div>
                            <div className="flex-1 text-left">
                                <span className="text-xs font-bold uppercase tracking-widest block opacity-80">Tu Pedido</span>
                                <span className="font-black text-lg">${total.toLocaleString('es-AR')}</span>
                            </div>
                            <span className="font-bold uppercase tracking-widest text-sm flex items-center gap-1">Ver <IconChevronRight size={16} /></span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Modal/Drawer */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCartOpen(false)}
                            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="fixed bottom-0 left-0 right-0 bg-[#FDFBF7] z-[70] rounded-t-[2rem] max-h-[90vh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-2xl font-black text-[#6B4E3D] font-serif">Tu Pedido</h3>
                                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                                    <IconX size={20} className="text-gray-600" />
                                </button>
                            </div>

                            {/* Items */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {cart.length === 0 ? (
                                    <p className="text-center text-gray-400 py-10">Tu carrito está vacío.</p>
                                ) : (
                                    cart.map((item) => (
                                        <div key={item.product.id} className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-[#3E2723]">{item.product.name}</h4>
                                                <p className="text-sm font-bold text-[#C17154]">${item.product.price.toLocaleString('es-AR')}</p>
                                            </div>
                                            <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1">
                                                <button onClick={() => updateQuantity(item.product.id, -1)} className="w-8 h-8 flex items-center justify-center font-bold text-gray-500 hover:text-black">-</button>
                                                <span className="font-bold text-gray-900 w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.product.id, 1)} className="w-8 h-8 flex items-center justify-center font-bold text-gray-500 hover:text-black">+</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer / Checkout */}
                            <div className="p-8 bg-white border-t border-gray-100 pb-12">
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 mb-2">
                                            <IconUser size={14} /> Tu Nombre
                                        </label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Ej: Juan Perez"
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-[#3E2723] outline-none focus:ring-2 ring-[#25D366]"
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 mb-2">
                                            <IconMapPin size={14} /> Dirección de Entrega *
                                        </label>
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Ej: Av. Libertador 1234"
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-[#3E2723] outline-none focus:ring-2 ring-[#25D366]"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total a Pagar</span>
                                    <span className="text-3xl font-black text-[#6B4E3D]">${total.toLocaleString('es-AR')}</span>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0}
                                    className="w-full bg-[#25D366] text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <IconSend size={20} /> Enviar Pedido por WhatsApp
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
