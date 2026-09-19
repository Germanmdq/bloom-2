"use client"; 

import { useState, useEffect, Suspense, useCallback, useRef, useMemo } from "react";
import IconPhoto from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { IconShoppingBag, IconChevronLeft, IconPlus, IconMinus, IconCreditCard, IconX } from "@tabler/icons-react";
import { SiteFooter } from "@/components/SiteFooter";
import { toast } from "sonner";
import { FoodKingMobileNavPanel } from "@/components/FoodKingMobileNav";
import { PublicAccountNav } from "@/components/PublicAccountNav";
import { SiteHeader } from "@/components/SiteHeader";
import { BloomChat, type BloomChatHandle } from "@/components/Menu/BloomChat";
import { WEB_ORDER_TABLE_DELIVERY, WEB_ORDER_TABLE_RETIRO } from "@/lib/orders/web-virtual-tables";
import type { BloomChatCartLine } from "@/lib/bloom-chat-types";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

const PEDIDOS_YA_BLOOM_URL =
    "https://www.pedidosya.com.ar/restaurantes/mar-del-plata/bloom-mar-del-plata-5c1357e3-e095-476e-9eee-eeda4620b75e-menu";

/** Marca Bloom — naranja / acento cálido / crema */
/** Paleta Bloom — oliva (logo) + crema + verde inglés (local) */
const fk = {
    primary: "#7a765a",
    primaryHover: "#5f5c46",
    accent: "#c4b896",
    /** Verde inglés — color del salón (fachada / acentos) */
    english: "#2d4a3e",
    englishDeep: "#1a3028",
    cream: "#f2f0e6",
    page: "#f7f5ef",
    dark: "#2c2a24",
} as const;

/** Menos datos por fila que select('*') — acelera la carga del menú. */
const MENU_PRODUCT_SELECT =
    "id, name, description, price, image_url, category_id, active, options, kind";

// --- HELPERS ---
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

function categoryLabel(c: { name: string }) {
    return c.name.replace(/^\p{Extended_Pictographic}\s*/u, "").trim() || c.name;
}

/** Primera imagen de producto activo por categoría (nombre ascendente), para fallback de tarjeta. */
function buildFirstProductImageByCategory(
    products: Array<{ category_id?: string | null; image_url?: string | null; name: string }>
) {
    const map = new Map<string, string>();
    const sorted = [...products]
        .filter((p) => p.category_id && p.image_url?.trim())
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
    for (const p of sorted) {
        const cid = String(p.category_id);
        if (!map.has(cid)) map.set(cid, p.image_url!.trim());
    }
    return map;
}

function categoryCardImageUrl(
    c: { id: string; image_url?: string | null },
    firstByCat: Map<string, string>
): string | null {
    const direct = c.image_url?.trim();
    if (direct) return direct;
    return firstByCat.get(c.id) ?? null;
}

// --- MAIN COMPONENT ---
function PublicMenuPage() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const tableParam = searchParams.get("table");
    const tableId = tableParam ? parseInt(tableParam) : null;
    const zona = searchParams.get("zona"); // "barra" | "mesa" | null
    const num = searchParams.get("num");   // display number
    const sector = searchParams.get("sector"); // "Abajo" | "Deck" | "Arriba" | null
    const isBarTable = zona === "barra";
    const tableLabel = tableId !== null
        ? isBarTable
            ? `Barra ${num ?? tableId}`
            : sector
                ? `Mesa ${num ?? tableId} · ${sector}`
                : `Mesa ${num ?? tableId}`
        : null;
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [dailyPromos, setDailyPromos] = useState<any[]>([]);
    /** Número WhatsApp del local (app_settings); usado por checkout WA y Bloom chat */
    const [whatsappNumber, setWhatsappNumber] = useState("5491112345678");
    const [loading, setLoading] = useState(true);


    const bloomChatRef = useRef<BloomChatHandle>(null);

    // Cart & Checkout State
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [orderSent, setOrderSent] = useState(false);

    // Checkout form state — 'items' | 'form'
    const [cartStep, setCartStep] = useState<'items' | 'form'>('items');
    const showCheckoutForm = cartStep === 'form';
    const [checkoutInfo, setCheckoutInfo] = useState({
        name: "",
        phone: "",
        address: "",
        type: "delivery" as "delivery" | "retiro",
    });
    const [checkoutErrors, setCheckoutErrors] = useState<Record<string, string>>({});

    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [currentPromoIndex, setCurrentPromoIndex] = useState(0);

    // Cuenta corriente
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userBalance, setUserBalance] = useState(0);
    const [debtPayMode, setDebtPayMode] = useState<'none' | 'total' | 'partial'>('none');
    const [debtPartialAmount, setDebtPartialAmount] = useState('');

    // FETCH DATA — deps fijas [] (evita warning “dependency array changed size” con HMR/hidratación)
    useEffect(() => {
        const fetchMenu = async () => {
            const [{ data: cats }, { data: prods }, { data: settings }, { data: popularLines }, { data: promosData }] = await Promise.all([
                supabase.from("categories").select("id, name, sort_order, icon, image_url").order("sort_order", { ascending: true }),
                supabase.from("products").select(MENU_PRODUCT_SELECT).eq("active", true),
                supabase.from("app_settings").select("whatsapp, plato_del_dia_id").eq("id", 1).single(),
                supabase.from("order_lines").select("product_id, quantity").order("created_at", { ascending: false }).limit(500),
                supabase.from("daily_promotions").select("*").eq("active", true).order("created_at", { ascending: true })
            ]);

            if (promosData) setDailyPromos(promosData.filter(p => p.name));
            if (cats && prods) {
                // Calcular popularidad si hay líneas de pedido
                const popularityMap: Record<string, number> = {};
                if (popularLines) {
                    popularLines.forEach((line: any) => {
                        const product = prods.find(p => p.id === line.product_id);
                        if (product && product.category_id) {
                            popularityMap[product.category_id] = (popularityMap[product.category_id] || 0) + (line.quantity || 1);
                        }
                    });
                }

                const seen = new Set();
                const unique = cats.filter((c: any) => {
                    const key = c.name.toLowerCase().trim();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                // Ordenar: prioridad fija para categorías clave, luego por popularidad
                const priorityOrder = (name: string): number => {
                    const n = name.toLowerCase().trim();
                    if (n.includes('plato')) return 0; // "Platos Diarios" / "Plato del Día"
                    if (n.includes('promoci') || n.includes('oferta')) return 1;
                    if (n.includes('desayuno') || n.includes('merienda')) return 2;
                    return 99;
                };
                unique.sort((a, b) => {
                    const prioA = priorityOrder(a.name);
                    const prioB = priorityOrder(b.name);
                    if (prioA !== prioB) return prioA - prioB;
                    const popA = popularityMap[a.id] || 0;
                    const popB = popularityMap[b.id] || 0;
                    if (popB !== popA) return popB - popA;
                    return (a.sort_order || 0) - (b.sort_order || 0);
                });

                setCategories(unique);
            }
            if (prods) setProducts(prods);
            if (settings?.whatsapp) setWhatsappNumber(settings.whatsapp);
            if (settings?.plato_del_dia_id && prods) {
                const featured = prods.find((p: any) => p.id === settings.plato_del_dia_id);
                if (featured) {
                    prods.forEach((p: any) => { p.kind = p.id === settings.plato_del_dia_id ? 'plato_del_dia' : (p.kind === 'plato_del_dia' ? 'menu' : p.kind); });
                }
            }
            setLoading(false);
        };
        fetchMenu();
    }, []);

    // Auto-Slider para Promociones
    useEffect(() => {
        if (dailyPromos.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentPromoIndex(prev => (prev + 1) % dailyPromos.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [dailyPromos]);

    useEffect(() => {
        const loadUserSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUser(session.user);
                const meta = session.user.user_metadata ?? {};
                // Pre-fill checkout form from saved profile
                setCheckoutInfo(prev => ({
                    ...prev,
                    name: meta.full_name || prev.name,
                    phone: meta.phone || prev.phone,
                    address: meta.default_address || prev.address,
                }));
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('balance, full_name, phone, default_address')
                    .eq('id', session.user.id)
                    .single();
                if (profile) {
                    if (profile.balance > 0) setUserBalance(Number(profile.balance));
                    // Override with DB profile if richer
                    setCheckoutInfo(prev => ({
                        ...prev,
                        name: profile.full_name || prev.name,
                        phone: profile.phone || prev.phone,
                        address: profile.default_address || prev.address,
                    }));
                }
            }
        };
        loadUserSession();
    }, []);

    const platoDiaProduct = products.find(p => p.kind === 'plato_del_dia');

    const firstProductImageByCategory = useMemo(
        () => buildFirstProductImageByCategory(products),
        [products]
    );

    const openChatWithCategory = useCallback((categoryId: string, displayName: string) => {
        bloomChatRef.current?.openWithCategoryMessage({ categoryId, displayName });
    }, []);

    const updateQuantity = (cartItemId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.cartItemId === cartItemId) return { ...item, quantity: Math.max(0, item.quantity + delta) };
            return item;
        }).filter(item => item.quantity > 0));
    };

    // CHECKOUT HANDLERS
    const validateCheckoutForm = () => {
        const errors: Record<string, string> = {};
        if (!checkoutInfo.name.trim()) errors.name = 'Ingresá tu nombre';
        if (!checkoutInfo.phone.trim()) errors.phone = 'Ingresá tu teléfono';
        if (checkoutInfo.type === "delivery" && !checkoutInfo.address.trim()) errors.address = "Ingresá la dirección de entrega";
        setCheckoutErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Función central para guardar un pedido web
    const saveWebOrder = async (itemsToOrder: any[], ci: typeof checkoutInfo) => {
        const total = itemsToOrder.reduce((acc, i) => acc + i.price * (i.quantity ?? 1), 0);
        const items = itemsToOrder.map(i => ({
            name: i.name, quantity: i.quantity ?? 1, price: i.price,
            variants: i.variants || [], observations: i.observations || '',
        }));

        const deliveryInfo = ci.type === "delivery" ? `Delivery a: ${ci.address}` : "Retiro en local";

        const { data: { session } } = await supabase.auth.getSession();
        const row: Record<string, unknown> = {
            table_id: ci.type === "delivery" ? WEB_ORDER_TABLE_DELIVERY : WEB_ORDER_TABLE_RETIRO,
            customer_name: ci.name, customer_phone: ci.phone,
            delivery_type: ci.type, delivery_info: deliveryInfo,
            items, total, status: 'PENDING', order_type: 'WEB',
            paid: false,
        };
        if (session?.user?.id) {
            row.customer_id = session.user.id;
        }

        const { error } = await supabase.from('orders').insert(row);
        if (error) console.error('Error guardando pedido:', error.message, error.details);
        // Guardamos el checkoutInfo para mostrarlo en la confirmación
        setCheckoutInfo(ci);
        setOrderSent(true);
        setIsCartOpen(false);
        setCart([]);
        setCartStep('items');
    };

    const handleMercadoPagoCheckout = async () => {
        if (!tableId && !showCheckoutForm) { setCartStep('form'); return; }
        if (!tableId && !validateCheckoutForm()) return;

        if (debtPayMode === 'partial') {
            const amt = parseFloat(debtPartialAmount);
            if (!amt || amt < 1) { toast.error('Ingresá un monto válido para abonar'); return; }
            if (amt > userBalance) { toast.error('El monto no puede superar la deuda'); return; }
        }

        setIsPaying(true);
        try {
            if (debtPayMode !== 'none' && userBalance > 0) {
                const amtToPay = debtPayMode === 'total' ? userBalance : parseFloat(debtPartialAmount);
                const res = await fetch('/api/payments/pay-debt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: amtToPay,
                        method: 'CASH',
                        notes: debtPayMode === 'total' ? 'Pago total al confirmar pedido' : 'Pago parcial al confirmar pedido',
                    }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Error al procesar el pago de la deuda');
                }
                const remaining = userBalance - amtToPay;
                setUserBalance(remaining > 0 ? remaining : 0);
                setDebtPayMode('none');
                setDebtPartialAmount('');
                toast.success(`Deuda abonada: ${formatCurrency(amtToPay)}`);
            }
            await saveWebOrder(cart, checkoutInfo);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al confirmar el pedido, intentá de nuevo");
        } finally {
            setIsPaying(false);
        }
    };

    /** Abre WhatsApp con el pedido. Si pasás `lines`, usa ese carrito (p. ej. asistente Bloom); si no, el estado `cart`. */
    const handleWhatsAppCheckout = useCallback(
        (overrideCart?: BloomChatCartLine[]) => {
            const c = overrideCart ?? cart;
            if (c.length === 0) return;
            const itemsList = c.map((i) => {
                const vars = i.variants?.length ? ` [${i.variants.map((v: { name: string }) => v.name).join(", ")}]` : "";
                const obs = i.observations ? ` _(${i.observations})_` : "";
                return `• ${i.quantity}x ${i.name}${vars}${obs} (${formatCurrency(i.price * i.quantity)})`;
            }).join("%0A");

            const cartTotal = c.reduce((acc, item) => acc + item.price * item.quantity, 0);
            const mesaInfo = tableLabel ? `📍 *${tableLabel}*%0A%0A` : "";
            const text = `Hola Bloom! 👋 Quiero pedir:%0A%0A${mesaInfo}${itemsList}%0A%0A*Total: ${formatCurrency(cartTotal)}*`;
            window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
        },
        [cart, tableLabel, whatsappNumber]
    );

    useEffect(() => {
        const w = window as Window & {
            __bloomMenuCheckout?: {
                whatsappNumber: string;
                handleWhatsAppCheckout: () => void;
                handleWhatsAppCheckoutWithCart: (lines: BloomChatCartLine[]) => void;
            };
        };
        w.__bloomMenuCheckout = {
            whatsappNumber,
            handleWhatsAppCheckout: () => handleWhatsAppCheckout(),
            handleWhatsAppCheckoutWithCart: (lines: BloomChatCartLine[]) => handleWhatsAppCheckout(lines),
        };
        return () => {
            delete w.__bloomMenuCheckout;
        };
    }, [whatsappNumber, handleWhatsAppCheckout]);

    // TABLE SELF-ORDER: send directly to kitchen and update table items
    const handleTableCheckout = async () => {
        if (cart.length === 0 || !tableId) return;
        setIsPaying(true);
        try {
            const items = cart.map(i => ({
                name: i.name,
                quantity: i.quantity,
                price: i.price,
                variants: i.variants || [],
                observations: i.observations || '',
            }));
            const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

            // Use server-side API route — more reliable than direct Supabase client
            const res = await fetch('/api/table-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableId, items, total }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                toast.error(data.error || 'Error al enviar el pedido');
                setIsPaying(false);
                return;
            }

            setOrderSent(true);
            setIsCartOpen(false);
            setCart([]);
        } catch (error) {
            console.error('[handleTableCheckout]', error);
            toast.error('Error de red. Verificá tu conexión e intentá de nuevo.');
        } finally {
            setIsPaying(false);
        }
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: fk.page }}>
                <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: `${fk.accent}`, borderTopColor: fk.primary }} />
                <p className="font-black text-sm uppercase tracking-[0.2em]" style={{ color: fk.primary }}>
                    Cargando menú…
                </p>
            </div>
        );
    }

    if (orderSent) return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: fk.page }}>
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border-2 border-bloom-200 space-y-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-4xl">✅</span>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">¡Pedido confirmado!</h1>
                    {checkoutInfo.name && (
                        <p className="text-gray-500 mt-1">Gracias, <strong>{checkoutInfo.name}</strong></p>
                    )}
                </div>

                {tableLabel ? (
                    <div className="bg-gray-50 rounded-2xl py-3 px-5">
                        <p className="text-sm text-gray-400">Mesa</p>
                        <p className="text-xl font-black text-gray-900">{tableLabel}</p>
                        <p className="text-sm text-gray-400 mt-1">En breve el mozo se acerca.</p>
                    </div>
                ) : checkoutInfo.type === "delivery" ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl py-3 px-5 text-left">
                        <p className="text-xs font-black text-blue-500 uppercase tracking-wide mb-1">🛵 Delivery</p>
                        <p className="text-sm font-bold text-gray-800">{checkoutInfo.address}</p>
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-2xl py-3 px-5">
                        <p className="text-sm font-bold text-gray-700">🏃 Retiro en local</p>
                        <p className="text-xs text-gray-400 mt-0.5">Te avisamos cuando esté listo</p>
                    </div>
                )}

                <p className="text-xs text-gray-400 pt-2">
                    Nos ponemos en contacto a la brevedad.
                </p>
                <button
                    onClick={() => {
                        setOrderSent(false);
                        setCheckoutInfo({ name: "", phone: "", address: "", type: "delivery" });
                    }}
                    className="w-full py-3.5 text-white font-black rounded-2xl transition-colors text-sm shadow-lg hover:opacity-95"
                    style={{ backgroundColor: fk.primary }}
                >
                    Hacer otro pedido
                </button>
            </div>
        </div>
    );

    // --- RENDER ---
    return (
        <main className="min-h-screen text-neutral-900 font-sans pb-32 selection:bg-bloom-200/60 selection:text-neutral-900" style={{ backgroundColor: fk.page }}>

            <FoodKingMobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

            <SiteHeader
                scrolled={false}
                onMobileNavOpen={() => setMobileNavOpen(true)}
                activeNav="menu"
                accentColor={fk.primary}
                showCartButton
                cartCount={cartCount}
                onCartOpen={() => setIsCartOpen(true)}
                menuExtras={
                    <>
                        <Link
                            href="#menu-categories"
                            className="xl:hidden inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-black text-white shadow-md active:scale-[0.98] whitespace-nowrap"
                            style={{ backgroundColor: fk.primary }}
                        >
                            <IconShoppingBag size={15} className="shrink-0" strokeWidth={2.5} />
                            Categorías
                        </Link>
                        {tableLabel ? (
                            <span
                                className="text-white text-xs sm:text-sm font-black px-3 py-1.5 rounded-full whitespace-nowrap"
                                style={{ backgroundColor: fk.dark }}
                            >
                                {tableLabel}
                            </span>
                        ) : null}
                        <PublicAccountNav />
                    </>
                }
            />

            <div id="menu-categories" className="w-full py-8 scroll-mt-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 mb-4">
                    {/* SECCIÓN: OFERTA DEL DÍA (Apple Pro Style) */}
                    {(() => {
                        const promoProducts = dailyPromos;

                        if (promoProducts.length === 0) return null;

                        return (
                            <div 
                                className="mb-10 relative group overflow-hidden bg-[#2d4a3e] rounded-[2.5rem] p-8 md:p-12 text-white transition-all border border-white/5 active:scale-[0.99]"
                                style={{
                                    boxShadow: '0 25px 80px -15px rgba(0,0,0,0.6), 0 10px 40px -10px rgba(0,0,0,0.4)',
                                }}
                            >
                                {/* Glow Effect adapted for English Green */}
                                <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#E8A387]/20 rounded-full blur-[100px]" />
                                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-[80px]" />
                                
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="flex flex-col gap-2 text-center md:text-left">
                                        <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                                            <span className="bg-white/10 backdrop-blur-xl px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white/80 border border-white/5">
                                                ★ Recomendado Bloom
                                            </span>
                                        </div>
                                        <h4 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Oferta del día</h4>
                                        <p className="text-white/40 text-xs md:text-sm font-bold uppercase tracking-widest leading-relaxed max-w-xs">
                                            Selección exclusiva de nuestra cocina para hoy
                                        </p>
                                    </div>

                                    <div className="w-full md:w-[350px] h-32 relative">
                                        <AnimatePresence mode="popLayout">
                                            {promoProducts.map((p: any, idx: number) => idx === currentPromoIndex && (
                                                <motion.button
                                                    key={p.id}
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.98 }}
                                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                                    onClick={() => {
                                                        const randomId = p.id || `promo-${Date.now()}`;
                                                        setCart(prev => [...prev, { 
                                                            id: randomId, 
                                                            name: p.name, 
                                                            price: Number(p.price) || 0,
                                                            description: 'Oferta Especial del Día', 
                                                            cartItemId: `${randomId}-${Date.now()}`, 
                                                            quantity: 1 
                                                        }]);
                                                        toast.success(`Agregado: ${p.name}`);
                                                    }}
                                                    className="absolute inset-0 w-full bg-white text-black rounded-[2rem] p-6 shadow-2xl flex flex-col justify-center gap-3 active:scale-95 transition-all group border border-white/20"
                                                >
                                                    <div className="w-full border-b border-gray-100 pb-2 flex justify-between items-center">
                                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-black">{p.name}</span>
                                                        <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="text-4xl font-black tracking-tighter text-black">${Number(p.price).toLocaleString()}</span>
                                                        <span className="text-[10px] font-black text-white bg-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-2">
                                                            Poner <IconPlus size={14} strokeWidth={3} />
                                                        </span>
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <p className="font-bold uppercase tracking-[0.15em] text-[10px] mb-1" style={{ color: fk.primary }}>
                        Lo más pedido
                    </p>
                    <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 tracking-tighter">Nuestros Favoritos</h2>
                </div>

                <Carousel 
                    items={[
                        ...(platoDiaProduct ? [
                            <Card
                                key="plato-dia"
                                index={0}
                                card={{
                                    src: platoDiaProduct.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2048&auto=format&fit=crop",
                                    title: "Plato del Día",
                                    category: "Recomendado",
                                    content: null
                                }}
                                onClick={() =>
                                    bloomChatRef.current?.openWithCategoryMessage({
                                        displayName: "Plato del Día",
                                        productIds: [platoDiaProduct.id],
                                    })
                                }
                            />
                        ] : []),
                        ...categories.slice(0, Math.ceil(categories.length / 2)).map((c, index) => {
                            const label = categoryLabel(c);
                            const cardUrl = categoryCardImageUrl(c, firstProductImageByCategory);
                            return (
                                <Card
                                    key={c.id}
                                    index={index + (platoDiaProduct ? 1 : 0)}
                                    card={{
                                        src: cardUrl || "https://images.unsplash.com/photo-1511984804822-e16ba72f5848?q=80&w=2048&auto=format&fit=crop",
                                        title: label,
                                        category: "Categoría",
                                        content: null
                                    }}
                                    onClick={() => openChatWithCategory(c.id, label)}
                                />
                            );
                        })
                    ]}
                />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 mt-12 mb-4">
                    <p className="font-bold uppercase tracking-[0.15em] text-[10px] mb-1" style={{ color: fk.primary }}>
                        Más para vos
                    </p>
                    <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 tracking-tighter">Explorá el Menú</h2>
                </div>

                <Carousel 
                    items={categories.slice(Math.ceil(categories.length / 2)).map((c, index) => {
                        const label = categoryLabel(c);
                        const cardUrl = categoryCardImageUrl(c, firstProductImageByCategory);
                        return (
                            <Card
                                key={c.id}
                                index={index}
                                card={{
                                    src: cardUrl || "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?q=80&w=3556&auto=format&fit=crop",
                                    title: label,
                                    category: "Categoría",
                                    content: null
                                }}
                                onClick={() => openChatWithCategory(c.id, label)}
                            />
                        );
                    })}
                />
            </div>

            {/* CART & CHECKOUT UI */}
            <AnimatePresence>
                {/* Floating Bottom Bar (Mobile) */}
                {cartCount > 0 && !isCartOpen && (
                    <motion.div key="mobile-cart-bar" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="w-full text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between font-black border-2 border-white/20"
                            style={{ backgroundColor: fk.dark }}
                        >
                            <div className="flex items-center gap-3">
                                <span className="bg-white/20 px-2.5 py-1 rounded-lg text-sm">{cartCount}</span>
                                <span>Ver Pedido</span>
                            </div>
                            <span>{formatCurrency(cartTotal)}</span>
                        </button>
                    </motion.div>
                )}

                {/* Desktop Floating Button */}
                {cartCount > 0 && !isCartOpen && (
                    <motion.div key="desktop-cart-btn" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="hidden md:block fixed bottom-8 right-8 z-50">
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform relative border-2 border-white/30"
                            style={{ backgroundColor: fk.primary }}
                        >
                            <IconShoppingBag size={24} />
                            <span
                                className="absolute -top-1 -right-1 text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white"
                                style={{ backgroundColor: fk.accent, color: fk.dark }}
                            >
                                {cartCount}
                            </span>
                        </button>
                    </motion.div>
                )}

                {/* Cart Modal / Drawer */}
                {isCartOpen && (
                    <>
                        <motion.div key="cart-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsCartOpen(false); setCartStep('items'); }} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
                        <motion.div
                            key="cart-drawer"
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-bloom-page z-[60] shadow-2xl flex flex-col font-sans border-l border-bloom-200"
                        >
                            <div className="shrink-0 z-10 flex items-center justify-between border-b border-bloom-200 bg-white p-5 shadow-sm">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-0.5" style={{ color: fk.primary }}>
                                        Carrito
                                    </p>
                                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Tu pedido</h2>
                                    {tableLabel && (
                                        <p className="text-sm font-bold text-gray-500 mt-0.5">{tableLabel}</p>
                                    )}
                                </div>
                                {showCheckoutForm && (
                                    <button
                                        onClick={() => setCartStep('items')}
                                        className="flex items-center gap-1 text-sm font-bold text-gray-400 hover:text-gray-700 transition-colors"
                                    >
                                        <IconChevronLeft size={16} /> Volver
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                {/* Delivery / retiro — pedidos web; PedidosYa va en el pie fijo del carrito */}
                                {!tableId && (
                                    <div className="space-y-3 rounded-2xl border border-bloom-200 bg-white/80 p-4 shadow-sm">
                                        <p className="font-black text-gray-900 text-base">¿Cómo recibís el pedido?</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {([
                                                { id: "delivery" as const, label: "🛵 Delivery" },
                                                { id: "retiro" as const, label: "🏃 Retiro en local" },
                                            ]).map((t) => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setCheckoutInfo((p) => ({ ...p, type: t.id }))}
                                                    className={`py-2.5 rounded-xl font-bold text-xs transition-all ${checkoutInfo.type === t.id ? "text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                                                    style={checkoutInfo.type === t.id ? { backgroundColor: fk.primary } : undefined}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Vista carrito ítems */}
                                {!showCheckoutForm && (
                                    <>
                                        {cart.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60 py-16">
                                                <IconShoppingBag size={64} className="mb-4" />
                                                <p className="font-medium text-lg">Tu carrito está vacío</p>
                                            </div>
                                        ) : (
                                            cart.map(item => (
                                                <div key={item.cartItemId} className="flex gap-4 group">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className="font-bold text-gray-900 text-lg leading-none">{item.name}</h4>
                                                            <span className="font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                                                        </div>
                                                        {item.variants && item.variants.length > 0 && (
                                                            <p className="text-gray-500 text-xs leading-relaxed">
                                                                {item.variants.map((v: any) => v.name).join(', ')}
                                                            </p>
                                                        )}
                                                        {item.observations && (
                                                            <p className="text-bloom-600 text-xs italic mt-0.5 leading-relaxed">
                                                                📝 {item.observations}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                                                <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1 hover:bg-white rounded-md transition-colors shadow-sm"><IconMinus size={14} /></button>
                                                                <span className="font-bold w-6 text-center text-sm">{item.quantity}</span>
                                                                <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1 hover:bg-white rounded-md transition-colors shadow-sm"><IconPlus size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </>
                                )}

                                {/* Datos de contacto (paso confirmar) */}
                                {!tableId && showCheckoutForm && (
                                    <div className="space-y-3">
                                        <p className="font-black text-gray-900 text-base">Tus datos</p>

                                        {/* Nombre + Teléfono siempre visibles */}
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Nombre completo *"
                                                value={checkoutInfo.name}
                                                onChange={e => setCheckoutInfo(p => ({ ...p, name: e.target.value }))}
                                                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${checkoutErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-bloom-400'}`}
                                            />
                                            {checkoutErrors.name && <p className="text-red-500 text-xs mt-1">{checkoutErrors.name}</p>}
                                        </div>
                                        <div>
                                            <input
                                                type="tel"
                                                placeholder="Teléfono / WhatsApp *"
                                                value={checkoutInfo.phone}
                                                onChange={e => setCheckoutInfo(p => ({ ...p, phone: e.target.value }))}
                                                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${checkoutErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-bloom-400'}`}
                                            />
                                            {checkoutErrors.phone && <p className="text-red-500 text-xs mt-1">{checkoutErrors.phone}</p>}
                                        </div>

                                        {/* Dirección (solo delivery) */}
                                        {checkoutInfo.type === 'delivery' && (
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Dirección de entrega *"
                                                    value={checkoutInfo.address}
                                                    onChange={e => setCheckoutInfo(p => ({ ...p, address: e.target.value }))}
                                                    className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${checkoutErrors.address ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-bloom-400'}`}
                                                />
                                                {checkoutErrors.address && <p className="text-red-500 text-xs mt-1">{checkoutErrors.address}</p>}
                                            </div>
                                        )}

                                    </div>
                                )}
                            </div>

                            {/* Footer fijo — PedidosYa + total + botones */}
                            <div className="shrink-0 p-5 bg-white border-t border-gray-100 space-y-3">
                                {!tableId && (
                                    <a
                                        href={PEDIDOS_YA_BLOOM_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 px-3 text-center text-xs font-black leading-snug text-white shadow-md transition-opacity hover:opacity-95 sm:text-sm"
                                        style={{ backgroundColor: fk.primary }}
                                    >
                                        A más de 250 m — pedí en PedidosYa
                                    </a>
                                )}

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Total</span>
                                    <span className="text-3xl font-black text-gray-900 tracking-tighter">{formatCurrency(cartTotal)}</span>
                                </div>

                                {/* Cuenta corriente — solo si el usuario tiene saldo pendiente */}
                                {!tableId && currentUser && userBalance > 0 && (
                                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-black text-red-900">Cuenta Corriente</p>
                                            <span className="text-sm font-black text-red-600">{formatCurrency(userBalance)}</span>
                                        </div>
                                        <p className="text-xs text-red-700">Tenés un saldo pendiente. ¿Querés abonarlo ahora?</p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDebtPayMode(p => p === 'total' ? 'none' : 'total')}
                                                className={`flex-1 py-2 rounded-xl text-xs font-black transition-colors ${debtPayMode === 'total' ? 'bg-red-600 text-white' : 'bg-white border border-red-200 text-red-700 hover:bg-red-50'}`}
                                            >
                                                Pagar total
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setDebtPayMode(p => p === 'partial' ? 'none' : 'partial'); setDebtPartialAmount(''); }}
                                                className={`flex-1 py-2 rounded-xl text-xs font-black transition-colors ${debtPayMode === 'partial' ? 'bg-red-600 text-white' : 'bg-white border border-red-200 text-red-700 hover:bg-red-50'}`}
                                            >
                                                Pagar parcial
                                            </button>
                                        </div>
                                        {debtPayMode === 'partial' && (
                                            <input
                                                type="number"
                                                placeholder="Monto a abonar..."
                                                value={debtPartialAmount}
                                                onChange={e => setDebtPartialAmount(e.target.value)}
                                                min="1"
                                                max={userBalance}
                                                className="w-full px-3 py-2 rounded-xl border border-red-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 placeholder:text-red-300"
                                            />
                                        )}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {/* Prompt login — solo si no hay sesión */}
                                    {!tableId && !currentUser && (
                                        <div className="bg-neutral-50 rounded-2xl p-4 border border-black/5 flex flex-col items-center gap-3">
                                          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest text-center leading-tight">
                                            Identificate para continuar con tu encargo
                                          </p>
                                          <div className="flex gap-4 w-full">
                                            <Link
                                                href="/auth"
                                                onClick={() => setIsCartOpen(false)}
                                                className="flex-1 text-center text-xs font-black text-neutral-900 bg-white border border-black/10 py-2.5 rounded-xl shadow-sm hover:bg-neutral-50 transition-colors"
                                            >
                                                Iniciar sesión
                                            </Link>
                                            <Link
                                                href="/registro"
                                                onClick={() => setIsCartOpen(false)}
                                                className="flex-1 text-center text-xs font-black text-white bg-neutral-900 py-2.5 rounded-xl shadow-md hover:bg-neutral-800 transition-colors"
                                            >
                                                Registrarse
                                            </Link>
                                          </div>
                                        </div>
                                    )}

                                    {tableId ? (
                                        /* Mesa: botón directo */
                                        <button
                                            onClick={handleTableCheckout}
                                            disabled={!cart.length || isPaying}
                                            className="w-full text-white py-4 rounded-xl font-black text-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
                                            style={{ backgroundColor: fk.primary }}
                                        >
                                            {isPaying ? 'Enviando...' : '✓ Cerrar Pedido'}
                                        </button>
                                    ) : showCheckoutForm ? (
                                        /* Ya en el form: botón confirmar */
                                        <button
                                            onClick={handleMercadoPagoCheckout}
                                            disabled={!cart.length || isPaying}
                                            className="w-full text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
                                            style={{ backgroundColor: fk.primary }}
                                        >
                                            {isPaying ? 'Procesando...' : <><IconCreditCard size={20} /> Confirmar y Pagar</>}
                                        </button>
                                    ) : (
                                        /* Estado inicial: dos botones */
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => setCartStep('form')}
                                                disabled={!cart.length}
                                                className="w-full text-white py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg hover:opacity-95"
                                                style={{ backgroundColor: fk.primary }}
                                            >
                                                <IconCreditCard size={20} /> Pedir o Pagar
                                            </button>
                                            <button
                                                onClick={() => { setIsCartOpen(false); setCartStep('items'); }}
                                                className="w-full py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-base"
                                            >
                                                + Seguir pidiendo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <BloomChat ref={bloomChatRef} />
            <SiteFooter />
        </main>
    );
}

// ─── TABLA QR — experiencia móvil para clientes sentados ─────────────────────

type TableSection = {
    id: string;
    label: string;
    emoji: string;
    accent?: string;
    products: any[];
};

function ProductRow({ p, onAdd, inCart, isCombo }: { p: any; onAdd: () => void; inCart: number; isCombo?: boolean }) {
    return (
        <div className="flex items-center gap-3 py-3 px-4 border-b border-gray-50 last:border-0 active:bg-gray-50 transition-colors">
            {p.image_url && (
                <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-[15px] leading-snug">{p.name}</p>
                {p.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{p.description}</p>}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-sm font-black text-[#2d4a3e]">{formatCurrency(Number(p.price))}</p>
                    {isCombo && <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">· bebida + guarnición incluidas</span>}
                </div>
            </div>
            <button
                onClick={onAdd}
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black active:scale-90 transition-all shadow-sm relative bg-[#2d4a3e]"
            >
                <IconPlus size={18} className="text-white" />
                {inCart > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-black text-[10px] font-black rounded-full flex items-center justify-center">
                        {inCart}
                    </span>
                )}
            </button>
        </div>
    );
}

const DRINK_GROUPS: Record<string, string[]> = {
    'Línea Coca-Cola': ['Coca-Cola', 'Coca Zero', 'Sprite', 'Sprite Zero', 'Schweppes Pomelo'],
    'Línea Aquarius':  ['Aquarius Pera', 'Aquarius Manzana', 'Aquarius Pomelo', 'Aquarius Uva'],
    'Aguas':           ['Agua con Gas', 'Agua sin Gas'],
};
const GARNISHES = ['Puré de Papas', 'Papas Fritas', 'Mixto', 'Ensalada'];

type ConfigStep = 'drink-group' | 'drink-detail' | 'garnish' | 'notes';

function TableMenuPage({ tableId, tableLabel }: { tableId: number; tableLabel: string }) {
    const supabase = createClient();
    const [sections, setSections] = useState<TableSection[]>([]);
    const [openSections, setOpenSections] = useState<Set<string>>(new Set());
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [orderSent, setOrderSent] = useState(false);
    const [loading, setLoading] = useState(true);

    // Configurador de combo (Plato del Día)
    const [configuringProduct, setConfiguringProduct] = useState<any | null>(null);
    const [configStep, setConfigStep] = useState<ConfigStep>('drink-group');
    const [selectedDrinkGroup, setSelectedDrinkGroup] = useState('');
    const [selectedDrink, setSelectedDrink] = useState('');
    const [selectedGarnish, setSelectedGarnish] = useState('');
    const [configNotes, setConfigNotes] = useState('');

    useEffect(() => {
        Promise.all([
            supabase.from("categories").select("id, name, sort_order").order("sort_order", { ascending: true }),
            supabase.from("products").select("id, name, description, price, image_url, category_id, active").eq("active", true),
            supabase.from("app_settings").select("plato_del_dia_id, plato_dia_price").eq("id", 1).single(),
            supabase.from("daily_promotions").select("*").eq("active", true).order("created_at", { ascending: true }),
        ]).then(([{ data: cats }, { data: prods }, { data: settings }, { data: promos }]) => {
            if (!cats || !prods) { setLoading(false); return; }

            const seen = new Set<string>();
            const uniqueCats = cats.filter((c: any) => {
                const k = c.name.toLowerCase().trim();
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
            });

            const built: TableSection[] = [];
            const usedCatIds = new Set<string>();

            const isPlato = (p: any, cName: string) => {
                const cn = (cName || "").toLowerCase();
                const pn = (p.name || "").toLowerCase();
                return cn.includes("plato") || cn.includes("menú") || cn.includes("especial") || cn.includes("oferta") ||
                       pn.includes("plato") || pn.includes("menú") || pn.includes("especial") || pn.includes("oferta");
            };

            // 1 — Plato del Día
            const platoDiaId = settings?.plato_del_dia_id;
            const platoDiaPrice = settings?.plato_dia_price ? Number(settings.plato_dia_price) : null;
            if (platoDiaId) {
                const platoProd = prods.find((p: any) => p.id === platoDiaId);
                if (platoProd) {
                    const p = { ...platoProd, _isCombo: true };
                    if (platoDiaPrice) p.price = platoDiaPrice;
                    built.push({ id: "__plato_dia__", label: "Plato del Día", emoji: "⭐", accent: "text-amber-600", products: [p] });
                }
            }

            // 2 — Promoción del Día
            if (promos && promos.length > 0) {
                const promoProds = promos.filter((pr: any) => pr.name)
                    .map((pr: any) => ({ id: pr.id, name: pr.name, price: Number(pr.price) || 0, description: pr.description || '', image_url: pr.image_url || null, _isCombo: true }));
                if (promoProds.length > 0)
                    built.push({ id: "__promos__", label: "Promoción del Día", emoji: "🔥", accent: "text-orange-500", products: promoProds });
            }

            // helper para agregar categoría por palabra clave
            const pushCat = (keyword: string, emoji: string) => {
                const cat = uniqueCats.find((c: any) => c.name.toLowerCase().includes(keyword) && !usedCatIds.has(c.id));
                if (!cat) return;
                const catProds = prods.filter((p: any) => p.category_id === cat.id).map((p: any) => ({
                    ...p,
                    _isCombo: p._isCombo || isPlato(p, cat.name)
                }));
                if (catProds.length === 0) return;
                usedCatIds.add(cat.id);
                built.push({ id: cat.id, label: cat.name, emoji, products: catProds });
            };

            // 3 — Desayunos
            pushCat("desayuno", "🥐");
            // 4 — Cafetería
            pushCat("cafetería", "☕"); pushCat("cafeteria", "☕"); pushCat("café", "☕"); pushCat("cafe", "☕");
            // Platos Diarios
            pushCat("plato", "🍽️"); pushCat("menú", "🍽️"); pushCat("menu", "🍽️");

            // 5 — Resto de categorías en su orden
            for (const c of uniqueCats) {
                if (usedCatIds.has(c.id)) continue;
                const catProds = prods.filter((p: any) => p.category_id === c.id).map((p: any) => ({
                    ...p,
                    _isCombo: p._isCombo || isPlato(p, c.name)
                }));
                if (catProds.length === 0) continue;
                built.push({ id: c.id, label: c.name, emoji: "", products: catProds });
            }

            setSections(built);
            if (built.length > 0) setOpenSections(new Set(built.slice(0, 2).map(s => s.id)));
            setLoading(false);
        });
    }, []);

    const cartTotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
    const cartQtyFor = (id: string) => cart.find(i => i.id === id)?.quantity ?? 0;

    const pushToCart = (items: any[]) => {
        setCart(prev => {
            let next = [...prev];
            for (const item of items) {
                const idx = next.findIndex(i => i.id === item.id);
                if (idx >= 0) next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
                else next.push({ ...item, quantity: 1 });
            }
            return next;
        });
    };

    const openConfigurator = (product: any) => {
        setConfiguringProduct(product);
        setConfigStep('drink-group');
        setSelectedDrinkGroup('');
        setSelectedDrink('');
        setSelectedGarnish('');
        setConfigNotes('');
    };

    const finishCombo = () => {
        if (!configuringProduct) return;
        const items: any[] = [{ id: configuringProduct.id, name: configuringProduct.name, price: configuringProduct.price, notes: configNotes }];
        if (selectedGarnish && selectedGarnish !== 'Sin guarnición')
            items.push({ id: `g-${Date.now()}`, name: `Guarnición: ${selectedGarnish}`, price: 0 });
        if (selectedDrink && selectedDrink !== 'Sin bebida')
            items.push({ id: `d-${Date.now()}`, name: `Bebida: ${selectedDrink}`, price: 0 });
        pushToCart(items);
        toast.success('Plato del Día agregado', { duration: 1400 });
        setConfiguringProduct(null);
    };

    const addToCart = (product: any) => {
        if (product._isCombo) { openConfigurator(product); return; }
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { ...product, quantity: 1 }];
        });
        toast.success(`${product.name} agregado`, { duration: 1200 });
    };

    const updateQty = (id: string, delta: number) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
    };

    const toggleSection = (id: string) => {
        setOpenSections(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSend = async () => {
        if (!cart.length) return;
        setIsPaying(true);
        try {
            const res = await fetch('/api/table-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableId,
                    items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, variants: [], observations: '' })),
                    total: cartTotal,
                }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error || 'Error al enviar'); return; }
            setOrderSent(true);
            setIsCartOpen(false);
            setCart([]);
        } catch {
            toast.error('Error de red. Intentá de nuevo.');
        } finally {
            setIsPaying(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f7f5ef]">
            <div className="w-10 h-10 border-4 border-[#c4b896] border-t-[#7a765a] rounded-full animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-[#7a765a]">Cargando menú…</p>
        </div>
    );

    if (orderSent) return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#f7f5ef]">
            <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-xl space-y-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto text-5xl">✅</div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900">¡Gracias por tu pedido!</h1>
                    <p className="text-gray-400 mt-2 text-base">Ya lo recibimos, enseguida te lo llevamos.</p>
                </div>
                <button onClick={() => setOrderSent(false)} className="w-full py-4 bg-[#2d4a3e] text-white font-black rounded-2xl text-lg">
                    Seguir eligiendo
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f7f5ef]">
            {/* Header fijo */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <img src="/logo.png" alt="Bloom" className="h-8 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 leading-none">Bloom Café</p>
                        <p className="text-sm font-black text-gray-900 leading-tight">{tableLabel}</p>
                    </div>
                </div>
                {cartCount > 0 ? (
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="flex items-center gap-2 bg-[#2d4a3e] text-white text-sm font-black px-4 py-2.5 rounded-2xl active:scale-95 transition-transform"
                    >
                        <IconShoppingBag size={15} />
                        <span>{cartCount}</span>
                        <span className="opacity-60">·</span>
                        <span>{formatCurrency(cartTotal)}</span>
                    </button>
                ) : (
                    <p className="text-xs text-gray-400 font-medium">Elegí lo que querés</p>
                )}
            </div>

            {/* Lista de secciones accordion */}
            <div className="pb-32">
                {sections.map((section) => {
                    const isOpen = openSections.has(section.id);
                    const isSpecial = section.id === "__plato_dia__" || section.id === "__promos__";

                    return (
                        <div key={section.id} className="border-b border-gray-100">
                            {/* Fila de categoría — tappable */}
                            <button
                                onClick={() => toggleSection(section.id)}
                                className={`w-full flex items-center justify-between px-4 py-4 text-left active:bg-gray-50 transition-colors ${isSpecial ? "bg-white" : "bg-white"}`}
                            >
                                <div className="flex items-center gap-3">
                                    {section.emoji && <span className="text-2xl leading-none">{section.emoji}</span>}
                                    <div>
                                        <p className={`font-black text-[16px] leading-tight ${section.accent ?? "text-gray-900"}`}>
                                            {section.label}
                                        </p>
                                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                                            {section.products.length} {section.products.length === 1 ? "opción" : "opciones"}
                                        </p>
                                    </div>
                                </div>
                                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                    <IconChevronLeft size={20} className="text-gray-400 -rotate-90" />
                                </motion.div>
                            </button>

                            {/* Productos expandidos */}
                            <AnimatePresence initial={false}>
                                {isOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                        className="overflow-hidden bg-white"
                                    >
                                        <div className="ml-4 border-l-2 border-gray-100">
                                            {section.products.map((p: any) => (
                                                <ProductRow
                                                    key={p.id}
                                                    p={p}
                                                    inCart={cartQtyFor(p.id)}
                                                    onAdd={() => addToCart(p)}
                                                    isCombo={!!p._isCombo}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Botón flotante carrito */}
            <AnimatePresence>
                {cartCount > 0 && !isCartOpen && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                        className="fixed bottom-6 left-4 right-4 z-40"
                    >
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="w-full bg-[#2d4a3e] text-white py-4 rounded-2xl font-black text-base shadow-2xl flex items-center justify-between px-5 active:scale-[0.98] transition-transform"
                        >
                            <span className="bg-white/20 text-white text-sm font-black w-8 h-8 rounded-full flex items-center justify-center">{cartCount}</span>
                            <span className="text-lg">Ver pedido</span>
                            <span className="font-black">{formatCurrency(cartTotal)}</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart bottom sheet */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsCartOpen(false)}
                            className="fixed inset-0 bg-black/50 z-50"
                        />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 320, damping: 32 }}
                            className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col"
                        >
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 bg-gray-200 rounded-full" />
                            </div>

                            <div className="flex items-center justify-between px-5 pb-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Tu pedido</p>
                                    <p className="text-xl font-black text-gray-900">{tableLabel}</p>
                                </div>
                                <button onClick={() => setIsCartOpen(false)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                                    <IconX size={18} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 divide-y divide-gray-50">
                                {cart.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 py-3.5">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 text-[15px] leading-snug">{item.name}</p>
                                            <p className="text-sm text-[#2d4a3e] font-black mt-0.5">{formatCurrency(item.price * item.quantity)}</p>
                                        </div>
                                        <div className="flex items-center gap-1 bg-gray-100 rounded-2xl px-1 py-1">
                                            <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-gray-500 active:scale-90">
                                                <IconMinus size={14} />
                                            </button>
                                            <span className="w-6 text-center font-black text-sm">{item.quantity}</span>
                                            <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-gray-500 active:scale-90">
                                                <IconPlus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="px-5 pt-4 pb-8 border-t border-gray-100 space-y-3 bg-white">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Total</span>
                                    <span className="text-2xl font-black text-gray-900">{formatCurrency(cartTotal)}</span>
                                </div>
                                <button
                                    onClick={handleSend}
                                    disabled={isPaying}
                                    className="w-full bg-[#2d4a3e] text-white py-4 rounded-2xl font-black text-lg shadow-lg disabled:opacity-50 active:scale-[0.98] transition-transform"
                                >
                                    {isPaying ? "Enviando…" : "Enviar pedido a cocina"}
                                </button>
                                <p className="text-center text-xs text-gray-400">El mozo trae todo a tu mesa · no necesitás pagar ahora</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Configurador Plato del Día ── */}
            <AnimatePresence>
                {configuringProduct && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setConfiguringProduct(null)} className="fixed inset-0 bg-black/50 z-[70]" />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 320, damping: 32 }}
                            className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col"
                        >
                            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
                            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-amber-500">Plato del Día</p>
                                    <p className="text-lg font-black text-gray-900">{configuringProduct.name}</p>
                                    <p className="text-sm font-black text-[#2d4a3e]">{formatCurrency(configuringProduct.price)} · bebida + guarnición incluidas</p>
                                </div>
                                <button onClick={() => setConfiguringProduct(null)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                                    <IconX size={18} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 py-5">
                                <AnimatePresence mode="wait">
                                    {configStep === 'drink-group' && (
                                        <motion.div key="dg" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                                            <p className="font-black text-gray-900 text-base">🥤 ¿Qué bebida querés?</p>
                                            <div className="space-y-2">
                                                {Object.keys(DRINK_GROUPS).map(g => (
                                                    <button key={g} onClick={() => { setSelectedDrinkGroup(g); setConfigStep('drink-detail'); }}
                                                        className="w-full text-left px-4 py-4 rounded-2xl bg-gray-50 active:bg-gray-100 font-bold text-gray-800 flex items-center justify-between">
                                                        {g} <IconChevronLeft size={16} className="rotate-180 text-gray-400" />
                                                    </button>
                                                ))}
                                                <button onClick={() => { setSelectedDrink('Sin bebida'); setConfigStep('garnish'); }}
                                                    className="w-full text-left px-4 py-4 rounded-2xl bg-gray-100 font-bold text-gray-400">
                                                    Sin bebida
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                    {configStep === 'drink-detail' && (
                                        <motion.div key="dd" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                                            <p className="font-black text-gray-900 text-base">🥤 {selectedDrinkGroup}</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(DRINK_GROUPS[selectedDrinkGroup] ?? []).map(d => (
                                                    <button key={d} onClick={() => { setSelectedDrink(d); setConfigStep('garnish'); }}
                                                        className="px-3 py-4 rounded-2xl bg-gray-50 active:bg-[#2d4a3e] active:text-white font-bold text-gray-800 text-sm text-left transition-colors">
                                                        {d}
                                                    </button>
                                                ))}
                                            </div>
                                            <button onClick={() => setConfigStep('drink-group')} className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">← Volver</button>
                                        </motion.div>
                                    )}
                                    {configStep === 'garnish' && (
                                        <motion.div key="gr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                                            <p className="font-black text-gray-900 text-base">🥗 ¿Qué guarnición?</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {GARNISHES.map(g => (
                                                    <button key={g} onClick={() => { setSelectedGarnish(g); setConfigStep('notes'); }}
                                                        className="px-3 py-4 rounded-2xl bg-gray-50 active:bg-[#2d4a3e] active:text-white font-bold text-gray-800 text-sm text-left transition-colors">
                                                        {g}
                                                    </button>
                                                ))}
                                                <button onClick={() => { setSelectedGarnish('Sin guarnición'); setConfigStep('notes'); }}
                                                    className="px-3 py-4 rounded-2xl bg-gray-100 font-bold text-gray-400 text-sm text-left">
                                                    Sin guarnición
                                                </button>
                                            </div>
                                            <button onClick={() => setConfigStep('drink-group')} className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">← Volver</button>
                                        </motion.div>
                                    )}
                                    {configStep === 'notes' && (
                                        <motion.div key="nt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                                            <p className="font-black text-gray-900 text-base">📝 Aclaraciones {selectedGarnish === 'Ensalada' && <span className="text-amber-600">(¿Qué sabor de ensalada?)</span>}</p>
                                            <div className="bg-gray-50 rounded-2xl p-3 text-sm text-gray-500">
                                                <p>🥤 Bebida: <strong className="text-gray-800">{selectedDrink || '—'}</strong></p>
                                                <p>🥗 Guarnición: <strong className="text-gray-800">{selectedGarnish || '—'}</strong></p>
                                            </div>
                                            <textarea
                                                value={configNotes}
                                                onChange={e => setConfigNotes(e.target.value)}
                                                placeholder={selectedGarnish === 'Ensalada' ? 'Especificá el sabor de la ensalada...' : 'Ej: sin sal, carne bien cocida... (opcional)'}
                                                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-[#2d4a3e] outline-none font-medium text-sm min-h-[90px] resize-none"
                                            />
                                            <div className="flex gap-2 pt-1">
                                                <button onClick={() => setConfigStep('garnish')} className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-black text-sm">← Volver</button>
                                                <button onClick={finishCombo} className="flex-[2] py-4 rounded-2xl bg-[#2d4a3e] text-white font-black text-sm shadow-lg active:scale-[0.98]">
                                                    Agregar al pedido
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── ROUTER — decide qué página mostrar según si hay tableId ─────────────────

function MenuRouter() {
    const searchParams = useSearchParams();
    const tableParam = searchParams.get("table");
    const tableId = tableParam ? parseInt(tableParam) : null;
    const zona = searchParams.get("zona");
    const num = searchParams.get("num");
    const sector = searchParams.get("sector");
    const isBarTable = zona === "barra";

    if (tableId && Number.isFinite(tableId)) {
        const label = isBarTable
            ? `Barra ${num ?? tableId}`
            : sector
                ? `Mesa ${num ?? tableId} · ${sector}`
                : `Mesa ${num ?? tableId}`;
        return <TableMenuPage tableId={tableId} tableLabel={label} />;
    }

    return <PublicMenuPage />;
}

export default function MenuPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: fk.page }}>
                    <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: fk.accent, borderTopColor: fk.primary }} />
                    <p className="font-black text-sm uppercase tracking-[0.2em]" style={{ color: fk.primary }}>
                        Menú
                    </p>
                </div>
            }
        >
            <MenuRouter />
        </Suspense>
    );
}
