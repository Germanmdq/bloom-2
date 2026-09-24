"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  X, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Home, 
  Coffee, 
  User, 
  ArrowLeft, 
  Send,
  Trash2,
  CheckCircle2,
  Phone,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { saveOfflineOrder } from "@/lib/offline/order-queue";
import IntroSlider from "@/components/Menu/IntroSlider";
import PlatoDelDiaSlider from "@/components/Menu/PlatoDelDiaSlider";
import { TakeAwayIcon, SalonIcon } from "@/components/Menu/AnimatedIcons";
import "./menu-pwa.css";

// Formato de moneda argentina
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val);

// Fallback inicial para carga instantánea
const FALLBACK_CATEGORIES = [
  { id: "cat-cafeteria", name: "Cafetería" },
  { id: "cat-pasteleria", name: "Pastelería" },
  { id: "cat-desayunos", name: "Desayunos y Meriendas" },
  { id: "cat-jugos", name: "Jugos y Licuados" },
  { id: "cat-bebidas", name: "Bebidas" },
];

const FALLBACK_PRODUCTS = [
  {
    id: "p-1",
    category_id: "cat-cafeteria",
    name: "Café Doble Espresso",
    description: "Doble carga de café espresso de especialidad, aromático y con cuerpo.",
    price: 3300,
    image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "p-2",
    category_id: "cat-cafeteria",
    name: "Capuchino Italiano",
    description: "Café, leche vaporizada, densa espuma y un toque de cacao puro.",
    price: 3800,
    image_url: "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "p-3",
    category_id: "cat-pasteleria",
    name: "Medialuna de Manteca",
    description: "Tradicional medialuna hojaldrada, suave y con almíbar artesanal.",
    price: 1100,
    image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "p-4",
    category_id: "cat-pasteleria",
    name: "Torta Lemon Pie",
    description: "Masa sablée crocante, curd de limón fresco y merengue italiano dorado.",
    price: 4500,
    image_url: "https://images.unsplash.com/photo-1519869325930-281384150729?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "p-5",
    category_id: "cat-desayunos",
    name: "Tostado Jamón & Queso",
    description: "En pan de campo tostado a la manteca con abundante queso derretido.",
    price: 5500,
    image_url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "p-6",
    category_id: "cat-desayunos",
    name: "Bagel Veggie & Rúcula",
    description: "Vegetales asados de estación, queso crema a las finas hierbas y rúcula.",
    price: 6900,
    image_url: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "p-7",
    category_id: "cat-jugos",
    name: "Limonada con Menta & Jengibre",
    description: "Limones recién exprimidos, menta de huerta y un toque refrescante de jengibre.",
    price: 3200,
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "p-8",
    category_id: "cat-bebidas",
    name: "Exprimido de Naranja Natural",
    description: "100% naranjas seleccionadas, recién exprimidas al momento.",
    price: 3500,
    image_url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?q=80&w=800&auto=format&fit=crop",
  },
];

// Emojis e íconos por nombre de categoría (funciona con cualquier ID de Supabase)
const CATEGORY_EMOJIS: Record<string, React.ReactNode> = {
  "menú del día": "🍛",
  "cafetería": "☕",
  "platos": "🍽️",
  "ofertas": "🏷️",
  "cafetería delivery": "🛵",
  "pastelería": "🧁",
  "desayunos y meriendas": "🥞",
  "jugos y licuados": "🍹",
  "bebidas": "🥤",
  "sandwiches": "🥪",
  "hamburguesas": "🍔",
  "pizzas": "🍕",
  "pastas": "🍝",
  "milanesas": (
    <img
      src="/icons/milanesa.png"
      alt="Milanesa"
      className="w-10 h-10 object-contain drop-shadow-sm inline-block"
    />
  ),
  "ensaladas": "🥗",
  "empanadas": "🥟",
  "tartas individuales": "🥧",
  "panificados": "🥖",
  "postres": "🍰",
  "tortillas": "🫓",
  "promociones": "🏷️",
};

// Categorías que NO deben mostrarse en la grilla de inicio (se manejan aparte)
const HIDDEN_CATEGORIES = ["plato del día", "platos diarios"];

// Categorías cuyos productos se muestran en el slider del Plato del Día
const PLATO_DIA_CATEGORIES = ["plato del día", "platos diarios", "menú del día"];

// Slide de muestra cuando todavía no hay plato del día cargado
const PLATO_DIA_PLACEHOLDER = {
  id: "plato-dia-placeholder",
  name: "Menú del día",
  description: "Cada día una receta distinta, recién hecha por nuestra cocina. Consultá el plato de hoy.",
  price: 0,
  image_url: "/images/categories/platos-diarios.png",
};

// El slider de bienvenida se muestra una vez por cada apertura de la app
const INTRO_SEEN_KEY = "bloom_intro_seen";

// Cambiar esta versión cuando cambia la estructura del catálogo. Así no se
// hidratan categorías/productos de una versión anterior desde localStorage.
const MENU_CACHE_VERSION = "v2-four-categories";
const menuCacheKey = (name: string) => `bloom_${MENU_CACHE_VERSION}_${name}`;

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

function MenuContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Parámetros de mesa si el cliente escaneó el QR del salón
  const tableParam = searchParams.get("table");
  const tableId = tableParam ? parseInt(tableParam, 10) : null;
  const zona = searchParams.get("zona");
  const num = searchParams.get("num");
  const sector = searchParams.get("sector");
  const tableLabel = tableId
    ? zona === "barra"
      ? `Barra ${num ?? tableId}`
      : sector
      ? `Mesa ${num ?? tableId} · ${sector}`
      : `Mesa ${num ?? tableId}`
    : null;

  // Montaje en cliente (evita hydration mismatch)
  const [mounted, setMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    setMounted(true);
    try {
      if (!sessionStorage.getItem(INTRO_SEEN_KEY)) setShowIntro(true);
    } catch {
      setShowIntro(true);
    }
  }, []);

  const finishIntro = () => {
    setShowIntro(false);
    try { sessionStorage.setItem(INTRO_SEEN_KEY, "1"); } catch {}
  };

  // Pestaña activa: 'inicio' | 'menu'
  const [activeTab, setActiveTab] = useState<"inicio" | "menu">("inicio");

  // Estados de datos
  const [categories, setCategories] = useState<any[]>(FALLBACK_CATEGORIES);
  const [products, setProducts] = useState<any[]>(FALLBACK_PRODUCTS);
  const [whatsappNumber, setWhatsappNumber] = useState("5492231234567");

  // Filtros y búsqueda
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Producto seleccionado para el modal de detalle
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);

  // Carrito
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Modalidad del pedido: 'mesa' | 'delivery' | 'retiro'
  const [orderModality, setOrderModality] = useState<"mesa" | "delivery" | "retiro">(
    "mesa"
  );
  const [selectedTableNum, setSelectedTableNum] = useState<string>(
    tableId ? String(tableId) : ""
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (tableId) {
      setOrderModality("mesa");
      setSelectedTableNum(String(tableId));
    }
  }, [tableId]);

  // Plato del Día (configurable desde el dashboard)
  const [platoDia, setPlatoDia] = useState<any | null>(null);

  // Carga de datos con soporte Offline-First (localStorage + Supabase)
  useEffect(() => {
    // 1. Hidratación instantánea desde caché local (0ms, funciona sin conexión)
    try {
      const cachedCats = localStorage.getItem(menuCacheKey("categories"));
      const cachedProds = localStorage.getItem(menuCacheKey("products"));
      const cachedPlato = localStorage.getItem(menuCacheKey("plato_dia"));
      if (cachedCats) setCategories(JSON.parse(cachedCats));
      if (cachedProds) setProducts(JSON.parse(cachedProds));
      if (cachedPlato) setPlatoDia(JSON.parse(cachedPlato));
    } catch (e) {
      console.warn("[Menu] Error leyendo caché local:", e);
    }

    // 2. Carga en red para mantener datos al día
    async function loadData() {
      try {
        const [{ data: cats }, { data: prods }, { data: settings }] = await Promise.all([
          supabase.from("categories").select("id, name, sort_order").order("sort_order", { ascending: true }),
          supabase.from("products").select("id, name, description, price, image_url, category_id, active").eq("active", true),
          supabase.from("app_settings").select("whatsapp, plato_del_dia_id, plato_dia_price").eq("id", 1).maybeSingle(),
        ]);

        if (cats && cats.length > 0) {
          setCategories(cats);
          try { localStorage.setItem(menuCacheKey("categories"), JSON.stringify(cats)); } catch {}
        }
        if (prods && prods.length > 0) {
          setProducts(prods);
          try { localStorage.setItem(menuCacheKey("products"), JSON.stringify(prods)); } catch {}

          // Buscar el Plato del Día configurado en el dashboard
          if (settings?.plato_del_dia_id) {
            const found = prods.find((p: any) => p.id === settings.plato_del_dia_id);
            if (found) {
              const fullPlato = {
                ...found,
                price: settings.plato_dia_price || found.price,
              };
              setPlatoDia(fullPlato);
              try { localStorage.setItem(menuCacheKey("plato_dia"), JSON.stringify(fullPlato)); } catch {}
            }
          }
        }
        if (settings?.whatsapp) {
          setWhatsappNumber(settings.whatsapp);
        }
      } catch (err) {
        console.warn("[Menu] Modo sin conexión / usando catálogo guardado:", err);
      }
    }
    loadData();
  }, [supabase]);

  // Filtrado reactivo de productos
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === "all" ||
        p.category_id === selectedCategory ||
        p.category_name?.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);

      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Slides del Plato del Día: el configurado en el dashboard primero, luego
  // los productos de las categorías de platos diarios.
  const platoDiaSlides = useMemo(() => {
    const catIds = new Set(
      categories
        .filter((c) => PLATO_DIA_CATEGORIES.includes(c.name?.toLowerCase()))
        .map((c) => c.id)
    );
    const daily = products.filter((p) => catIds.has(p.category_id));
    const slides = platoDia ? [platoDia, ...daily.filter((p) => p.id !== platoDia.id)] : daily;
    return slides.length > 0 ? slides.slice(0, 8) : [PLATO_DIA_PLACEHOLDER];
  }, [categories, products, platoDia]);

  const startOrder = (modality: "retiro" | "mesa") => {
    setOrderModality(modality);
    setSelectedCategory("all");
    setActiveTab("menu");
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success(modality === "retiro" ? "Pedido para llevar 🛍️" : "Pedido en el salón ☕");
  };

  // Carrito helpers
  const cartTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart]
  );
  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );

  const handleOpenProduct = (p: any) => {
    setSelectedProduct(p);
    setModalQuantity(1);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === selectedProduct.id);
      if (existing) {
        return prev.map((item) =>
          item.id === selectedProduct.id
            ? { ...item, quantity: item.quantity + modalQuantity }
            : item
        );
      }
      return [
        ...prev,
        {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: Number(selectedProduct.price) || 0,
          quantity: modalQuantity,
          image_url: selectedProduct.image_url,
        },
      ];
    });

    toast.success(`Agregado al pedido (${modalQuantity})`, {
      description: selectedProduct.name,
    });
    setSelectedProduct(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const next = item.quantity + delta;
            return next > 0 ? { ...item, quantity: next } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleConfirmOrder = async () => {
    if (cart.length === 0 || isSending) return;

    if (orderModality === "delivery") {
      if (!deliveryAddress.trim()) {
        toast.error("Por favor ingresá la dirección de entrega.");
        return;
      }
      if (!customerPhone.trim()) {
        toast.error("Por favor ingresá tu teléfono o WhatsApp de contacto.");
        return;
      }
      if (!customerName.trim()) {
        toast.error("Por favor ingresá tu nombre.");
        return;
      }
    } else if (orderModality === "mesa") {
      if (!selectedTableNum.trim()) {
        toast.error("Por favor ingresá tu número de mesa.");
        return;
      }
      const parsedTable = parseInt(selectedTableNum, 10);
      if (isNaN(parsedTable) || parsedTable < 1 || parsedTable > 40) {
        toast.error("Por favor ingresá un número de mesa válido (1 al 40).");
        return;
      }
      if (!customerName.trim()) {
        toast.error("Por favor ingresá tu nombre.");
        return;
      }
    } else if (orderModality === "retiro") {
      if (!customerName.trim()) {
        toast.error("Por favor ingresá tu nombre para retirar en el local.");
        return;
      }
    }

    setIsSending(true);

    const numericTable = orderModality === "mesa" ? (parseInt(selectedTableNum, 10) || 1) : null;
    const computedCustomerName = customerName.trim() || (numericTable ? `Mesa ${numericTable}` : "Cliente Web");

    const orderPayload = {
      table_id: numericTable,
      delivery_type: orderModality === "mesa" ? "salon" : (orderModality === "delivery" ? "delivery" : "takeaway"),
      delivery_info: orderModality === "delivery" ? deliveryAddress.trim() : null,
      customer_name: computedCustomerName,
      customer_phone: customerPhone.trim() || null,
      notes: orderNotes.trim() || null,
      items: cart.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      total: cartTotal,
    };

    // 1. Si no hay conexión a internet, guardar de inmediato en la cola offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveOfflineOrder(orderPayload);
      setOrderSuccess(true);
      setCart([]);
      setCustomerName("");
      setDeliveryAddress("");
      setCustomerPhone("");
      setOrderNotes("");
      toast.warning("¡Pedido guardado sin conexión! 📶", {
        description: "Se enviará automáticamente en cuanto recuperes señal.",
        duration: 5000,
      });
      setTimeout(() => {
        setOrderSuccess(false);
        setIsCartOpen(false);
      }, 3500);
      setIsSending(false);
      return;
    }

    // 2. Si hay conexión, intentar enviar al servidor
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "No se pudo crear el pedido");
      }

      setOrderSuccess(true);
      setCart([]);
      setCustomerName("");
      setDeliveryAddress("");
      setCustomerPhone("");
      setOrderNotes("");
      toast.success(
        orderModality === "mesa"
          ? `¡Pedido enviado para Mesa ${numericTable}! 🎉`
          : orderModality === "delivery"
          ? "¡Pedido para Delivery registrado! 🛵"
          : "¡Pedido para Retiro registrado! 🏃"
      );
      setTimeout(() => {
        setOrderSuccess(false);
        setIsCartOpen(false);
      }, 3000);
    } catch (err: any) {
      // Si la llamada falló por pérdida repentina de red, resguardar en cola offline
      saveOfflineOrder(orderPayload);
      setOrderSuccess(true);
      setCart([]);
      setCustomerName("");
      setDeliveryAddress("");
      setCustomerPhone("");
      setOrderNotes("");
      toast.warning("Fallo de red: Pedido guardado localmente 📶", {
        description: "Se enviará automáticamente al local en cuanto se restablezca la conexión.",
        duration: 5000,
      });
      setTimeout(() => {
        setOrderSuccess(false);
        setIsCartOpen(false);
      }, 3500);
    } finally {
      setIsSending(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f5ef]" suppressHydrationWarning>
        <div className="w-10 h-10 border-4 border-[#c4b896] border-t-[#1a3028] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="app-shell" suppressHydrationWarning>
      <AnimatePresence>
        {showIntro && <IntroSlider onFinish={finishIntro} />}
      </AnimatePresence>

      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-40 bg-[#fffdf8]/90 backdrop-blur-md border-b border-[#c4b896]/20 px-4 py-3 sm:px-8">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("inicio");
                setSelectedCategory("all");
                setSearchQuery("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2.5 cursor-pointer text-left no-underline"
            >
              <div className="w-9 h-9 rounded-xl bg-[#1a3028] flex items-center justify-center text-[#f5e8ca] shadow-sm">
                <Coffee size={19} />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-[#1a3028] block leading-none">
                  BLOOM
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#7a765a] block leading-tight">
                  Café &amp; POS
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {tableLabel && (
              <span className="bg-[#1a3028] text-[#f5e8ca] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                {tableLabel}
              </span>
            )}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-xl bg-white border border-[#c4b896]/30 text-[#1a3028] shadow-sm hover:bg-[#f2f0e6] transition-colors"
              aria-label="Abrir carrito de compras"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#1a3028] text-[#f5e8ca] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="page-content max-w-[1180px] mx-auto pt-2">
        {/* ============================================
            TAB: INICIO — Tarjetas de categorías + Info del local
        ============================================ */}
        {activeTab === "inicio" && (
          <>
            {/* ========== TAKE AWAY / SALÓN ========== */}
            <div className="px-4 md:px-0 mb-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => startOrder("retiro")}
                className="flex flex-col items-center justify-center gap-2 py-6 rounded-[22px] bg-[#1a3028] text-[#f5e8ca] shadow-md active:scale-[0.97] transition-transform"
              >
                <TakeAwayIcon size={48} />
                <span className="text-base font-extrabold tracking-wide">TAKE AWAY</span>
                <span className="text-[11px] text-[#a8c9b8] font-semibold">Para llevar</span>
              </button>
              <button
                type="button"
                onClick={() => startOrder("mesa")}
                className="flex flex-col items-center justify-center gap-2 py-6 rounded-[22px] bg-[#c4b896] text-[#1a3028] shadow-md active:scale-[0.97] transition-transform"
              >
                <SalonIcon size={48} />
                <span className="text-base font-extrabold tracking-wide">SALÓN</span>
                <span className="text-[11px] text-[#1a3028]/70 font-semibold">Comer en el local</span>
              </button>
            </div>

            {/* ========== PLATO DEL DÍA (slider a todo el ancho) ========== */}
            <div className="px-4 md:px-0 mb-3">
              <h2 className="text-xl font-extrabold text-[#1a3028] tracking-tight">
                🍽️ Plato del Día
              </h2>
              <p className="text-xs text-[#7a765a] mt-0.5">
                Nuestra recomendación especial de hoy
              </p>
            </div>
            <div className="px-4 md:px-0 mb-6">
              <PlatoDelDiaSlider
                items={platoDiaSlides}
                onSelect={(item) => {
                  if (item.id !== PLATO_DIA_PLACEHOLDER.id) return handleOpenProduct(item);
                  setActiveTab("menu");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>

            {/* ========== CATEGORÍAS CON EMOJIS ========== */}
            <div className="px-4 md:px-0 mb-3">
              <h3 className="text-base font-extrabold text-[#1a3028] tracking-tight">
                Nuestras Categorías
              </h3>
            </div>
            <section className="category-grid mb-6" aria-label="Categorías">
              {categories
                .filter((cat) => !HIDDEN_CATEGORIES.includes(cat.name.toLowerCase()))
                .map((cat) => {
                const emoji = CATEGORY_EMOJIS[cat.name.toLowerCase()] || "🍴";
                const productCount = products.filter((p) => p.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setActiveTab("menu");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="category-card-emoji"
                  >
                    <span className="text-4xl h-10 flex items-center justify-center mb-2">{emoji}</span>
                    <h3 className="font-bold text-sm text-[#1a3028] leading-tight">{cat.name}</h3>
                    <small className="text-[11px] text-[#7a765a] font-medium mt-1 block">
                      {productCount} {productCount === 1 ? "producto" : "productos"}
                    </small>
                  </button>
                );
              })}
            </section>

            {/* CTA FINAL */}
            <div className="px-4 md:px-0 mb-8">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("menu");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#1a3028] text-[#f5e8ca] text-sm font-bold px-6 py-4 rounded-2xl shadow-lg hover:bg-[#243d32] transition-colors active:scale-[0.98]"
              >
                <Coffee size={18} />
                Ver Menú Completo
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ============================================
            TAB: MENÚ — Categorías + Búsqueda + Productos
        ============================================ */}
        {activeTab === "menu" && (
          <>
            {/* BUSCADOR */}
            <section className="search-box" aria-label="Buscador de productos">
              <Search size={18} className="text-[#a39a7f] shrink-0" />
              <input
                type="text"
                placeholder="Buscar café, tostados, medialunas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[#a39a7f] hover:text-[#1a3028] p-1"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </section>

            {/* FILTROS HORIZONTALES DE CATEGORÍAS */}
            <nav className="filter-scroll" aria-label="Categorías de productos">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`filter-chip ${selectedCategory === "all" ? "active" : ""}`}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`filter-chip ${selectedCategory === cat.id ? "active" : ""}`}
                >
                  {cat.name}
                </button>
              ))}
            </nav>

            {/* GRILLA DE PRODUCTOS */}
            <section className="products-grid" aria-label="Catálogo de productos">
              {filteredProducts.map((p) => {
                const catObj = categories.find((c) => c.id === p.category_id);
                const catName = catObj?.name || "Café & Delicias";
                const imageUrl =
                  p.image_url ||
                  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop";

                return (
                  <article
                    key={p.id}
                    onClick={() => handleOpenProduct(p)}
                    className="product-card"
                  >
                    <div className="product-image">
                      <Image
                        src={imageUrl}
                        alt={p.name}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="product-info">
                      <small>{catName}</small>
                      <h3>{p.name}</h3>
                      {p.description && <p>{p.description}</p>}
                      <span className="product-price">{formatCurrency(p.price)}</span>
                    </div>
                  </article>
                );
              })}
            </section>

            {filteredProducts.length === 0 && (
              <div className="text-center py-16 px-4">
                <p className="text-[#7a765a] font-medium text-sm">
                  No encontramos productos que coincidan con tu búsqueda.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="mt-3 text-xs font-bold text-[#1a3028] underline underline-offset-4"
                >
                  Ver todos los productos
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL: PRODUCTO ABIERTO */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="relative w-full max-w-lg bg-[#ffffff] rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col z-[160] pb-6 sm:pb-4"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/40 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/60 transition-colors"
                aria-label="Cerrar detalle"
              >
                <X size={20} />
              </button>

              <div className="overflow-y-auto product-detail">
                <div className="product-detail-image">
                  <Image
                    src={
                      selectedProduct.image_url ||
                      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop"
                    }
                    alt={selectedProduct.name}
                    width={600}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="product-detail-content">
                  <small>
                    {categories.find((c) => c.id === selectedProduct.category_id)?.name ||
                      "Bloom Selección"}
                  </small>
                  <h1>{selectedProduct.name}</h1>
                  {selectedProduct.description && (
                    <p>{selectedProduct.description}</p>
                  )}
                  <span className="product-detail-price">
                    {formatCurrency(selectedProduct.price * modalQuantity)}
                  </span>

                  {/* Selector de cantidad */}
                  <div className="flex items-center gap-4 mt-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7a765a]">
                      Cantidad:
                    </span>
                    <div className="flex items-center gap-3 bg-[#f2f0e6] px-3 py-1.5 rounded-full border border-[#c4b896]/30">
                      <button
                        onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                        disabled={modalQuantity <= 1}
                        className="p-1 rounded-full text-[#1a3028] disabled:opacity-30"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold text-sm min-w-[20px] text-center text-[#1a3028]">
                        {modalQuantity}
                      </span>
                      <button
                        onClick={() => setModalQuantity((q) => q + 1)}
                        className="p-1 rounded-full text-[#1a3028]"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    className="primary-action"
                  >
                    <ShoppingBag size={20} />
                    <span>
                      Agregar al pedido · {formatCurrency(selectedProduct.price * modalQuantity)}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWER / MODAL DEL CARRITO */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[150] flex justify-end sm:justify-center sm:items-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="relative w-full max-w-md bg-[#fffdf8] h-full sm:h-auto sm:max-h-[88vh] rounded-t-[28px] sm:rounded-[28px] sm:border sm:border-[#c4b896]/30 shadow-2xl flex flex-col z-[160] overflow-hidden"
            >
              <div className="p-5 border-b border-[#c4b896]/25 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={22} className="text-[#1a3028]" />
                  <h2 className="font-extrabold text-lg text-[#1a3028]">Tu Pedido</h2>
                  {tableLabel && (
                    <span className="text-[10px] bg-[#1a3028] text-[#f5e8ca] font-bold px-2.5 py-0.5 rounded-full">
                      {tableLabel}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600"
                  aria-label="Cerrar pedido"
                >
                  <X size={20} />
                </button>
              </div>

              {orderSuccess ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <CheckCircle2 size={64} className="text-[#10b981] mb-4 animate-bounce" />
                  <h3 className="font-extrabold text-2xl text-[#1a3028] mb-2">¡Pedido Confirmado!</h3>
                  <p className="text-sm text-[#5f5c46] max-w-xs leading-relaxed">
                    {orderModality === 'mesa' 
                      ? `Tu pedido fue recibido con éxito para la Mesa ${selectedTableNum || 1}. En breve te lo alcanzamos a tu mesa.`
                      : orderModality === 'delivery'
                      ? `Tu pedido fue recibido con éxito. ¡Ya lo estamos preparando para el envío!`
                      : `Tu pedido fue recibido con éxito. Te avisaremos cuando esté listo en el mostrador.`}
                  </p>
                </div>
              ) : cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#f2f0e6] flex items-center justify-center text-[#7a765a] mb-4">
                    <ShoppingBag size={28} />
                  </div>
                  <h3 className="font-bold text-base text-[#1a3028] mb-1">El pedido está vacío</h3>
                  <p className="text-xs text-[#7a765a] max-w-xs mb-6">
                    Explora nuestra carta y selecciona lo que más te guste para disfrutar.
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="text-xs font-bold bg-[#1a3028] text-[#f5e8ca] px-5 py-2.5 rounded-full shadow-md hover:bg-[#243d32] transition-colors"
                  >
                    Ver Menú
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-3.5 rounded-2xl border border-[#c4b896]/25 flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-[#1a3028] truncate">{item.name}</h4>
                          <span className="text-xs font-semibold text-[#7a765a]">
                            {formatCurrency(item.price)} c/u
                          </span>
                        </div>

                        <div className="flex items-center gap-2 bg-[#f2f0e6] px-2 py-1 rounded-full">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 text-[#1a3028] hover:text-black"
                            aria-label="Restar 1"
                          >
                            {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                          </button>
                          <span className="font-bold text-xs min-w-[16px] text-center text-[#1a3028]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 text-[#1a3028] hover:text-black"
                            aria-label="Sumar 1"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <span className="font-extrabold text-sm text-[#1a3028] min-w-[65px] text-right">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}

                    {/* Selector de Modalidad — 2 opciones grandes (DENTRO del scroll para que siempre sea visible) */}
                    <div className="mt-4 pt-4 border-t border-[#c4b896]/30 space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs font-black tracking-wider uppercase text-[#1a3028] block">
                          ¿Cómo querés tu pedido? *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Comer en el local */}
                          <button
                            type="button"
                            onClick={() => setOrderModality("mesa")}
                            className={`relative flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl border-2 transition-all font-black text-sm ${
                              orderModality === "mesa"
                                ? "border-[#1a3028] bg-[#1a3028] text-[#f5e8ca] shadow-lg scale-[1.01]"
                                : "border-[#c4b896]/50 bg-white text-[#7a765a] hover:border-[#1a3028]/40"
                            }`}
                          >
                            <span className="text-2xl">🍽️</span>
                            <span className="text-center leading-tight">Comer en<br/>el local</span>
                            {orderModality === "mesa" && (
                              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#f5e8ca]" />
                            )}
                          </button>

                          {/* Retirar */}
                          <button
                            type="button"
                            onClick={() => setOrderModality("retiro")}
                            className={`relative flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl border-2 transition-all font-black text-sm ${
                              orderModality === "retiro"
                                ? "border-[#1a3028] bg-[#1a3028] text-[#f5e8ca] shadow-lg scale-[1.01]"
                                : "border-[#c4b896]/50 bg-white text-[#7a765a] hover:border-[#1a3028]/40"
                            }`}
                          >
                            <span className="text-2xl">🏃</span>
                            <span className="text-center leading-tight">Retirar<br/>del local</span>
                            {orderModality === "retiro" && (
                              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#f5e8ca]" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Campos según la modalidad */}
                      {orderModality === "mesa" && (
                        <div className="space-y-2 bg-[#fdfbf7] p-3 rounded-2xl border border-[#c4b896]/30">
                          <p className="text-[10px] font-bold text-[#7a765a] uppercase tracking-wider">Datos para la mesa</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-[#7a765a] uppercase tracking-wider block mb-1">
                                N° de Mesa *
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={1}
                                  max={40}
                                  value={selectedTableNum}
                                  onChange={(e) => setSelectedTableNum(e.target.value)}
                                  placeholder="Ej: 3"
                                  className="w-full text-xs font-extrabold px-3 py-2.5 rounded-xl border border-[#c4b896]/40 bg-white outline-none focus:border-[#1a3028] focus:ring-1 focus:ring-[#1a3028]"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#7a765a]">
                                  1-40
                                </span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-[#7a765a] uppercase tracking-wider block mb-1">
                                Tu Nombre *
                              </label>
                              <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Ej: Sofía"
                                className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#c4b896]/40 bg-white outline-none focus:border-[#1a3028]"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {orderModality === "retiro" && (
                        <div className="space-y-2 bg-[#fdfbf7] p-3 rounded-2xl border border-[#c4b896]/30">
                          <p className="text-[10px] font-bold text-[#7a765a] uppercase tracking-wider">Datos para retirar</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-[#7a765a] uppercase tracking-wider block mb-1">
                                Tu Nombre *
                              </label>
                              <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Ej: Juan"
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#c4b896]/40 bg-white outline-none focus:border-[#1a3028]"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-[#7a765a] uppercase tracking-wider block mb-1 flex items-center gap-1">
                                <Phone size={11} className="text-gray-500" /> Teléfono
                              </label>
                              <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="223 555-1234"
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#c4b896]/40 bg-white outline-none focus:border-[#1a3028]"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Aclaraciones / Notas adicionales */}
                      <div>
                        <input
                          type="text"
                          placeholder="Aclaraciones (ej: sin hielo, edulcorante)"
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#c4b896]/30 bg-[#f9f8f3] outline-none focus:border-[#1a3028]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FOOTER DEL CARRITO: Solo Subtotal, Total y Botón */}
                  <div className="p-4 sm:p-5 bg-white border-t border-[#c4b896]/25 space-y-2.5">
                    <div className="flex items-center justify-between text-sm font-semibold text-[#5f5c46]">
                      <span>Subtotal</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-lg font-black text-[#1a3028] pt-1.5 border-t border-dashed border-[#c4b896]/30">
                      <span>Total</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>

                    <button
                      onClick={handleConfirmOrder}
                      disabled={isSending}
                      className="primary-action !mt-2.5 shadow-lg"
                    >
                      {isSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Enviando pedido...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          <span>Confirmar Pedido · {formatCurrency(cartTotal)}</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* DOCK INFERIOR (PWA FLOATING DOCK) */}
      <div 
        className={`bottom-dock-wrap transition-opacity duration-200 ${isCartOpen || selectedProduct ? "opacity-0 pointer-events-none" : "opacity-100"}`} 
        role="navigation" 
        aria-label="Navegación principal"
      >
        <nav className="bottom-dock">
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("inicio");
              setSelectedCategory("all");
              setSearchQuery("");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`dock-item ${activeTab === "inicio" ? "active" : ""}`}
          >
            <Home size={22} />
            <span>Inicio</span>
          </Link>

          <Link
            href="/menu"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("menu");
              setSelectedCategory("all");
              setSearchQuery("");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`dock-item ${activeTab === "menu" ? "active" : ""}`}
          >
            <Coffee size={22} />
            <span>Menú</span>
          </Link>

          <button
            type="button"
            className="dock-item"
            onClick={() => setIsCartOpen(true)}
            aria-label="Ver mi pedido"
          >
            <div className="relative inline-flex items-center justify-center">
              <ShoppingBag size={22} />
              {cartCount > 0 && <span className="dock-badge">{cartCount}</span>}
            </div>
            <span>Pedido</span>
          </button>

          <Link href="/cuenta" className="dock-item">
            <User size={22} />
            <span>{tableLabel ? "Mesa" : "Cuenta"}</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f7f5ef]">
          <div className="w-10 h-10 border-4 border-[#c4b896] border-t-[#1a3028] rounded-full animate-spin" />
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
