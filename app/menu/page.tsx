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
  Trash2,
  CheckCircle2,
  Phone,
  ChevronLeft,
  BellRing,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { saveOfflineOrder } from "@/lib/offline/order-queue";
import IntroSlider from "@/components/Menu/IntroSlider";
import { TakeAwayIcon, SalonIcon } from "@/components/Menu/AnimatedIcons";
import { buildCatalog, toMenuItem, type MenuItem } from "@/lib/menu/catalog";
import OptionSheet, { type SheetLine } from "@/components/Menu/OptionSheet";
import "./menu-pwa.css";

// Formato de moneda argentina
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val);

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop";

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

// Íconos de las tarjetas de categorías del menú
const CATEGORY_ICONS: Record<string, string> = {
  "café para llevar": "☕",
  "té, capuchino y submarino": "🫖",
  "facturas": "🥐",
  "jugos exprimidos": "🍊",
  "licuados": "🥤",
  "tostados": "🥪",
  "yogur": "🥣",
  "tostadas": "🍞",
  "menú del día": "🍽️",
  "cafetería": "☕",
  "minutas": "🍔",
  "opciones saludables": "🥗",
  "pastas y platos diarios": "🍝",
  "bebidas y postres": "🍮",
  "promociones": "🏷️",
  "desayunos y meriendas": "🍳",
  "panificados": "🥖",
  "jugos y licuados": "🍹",
};

type CoffeePersonality = "intenso" | "suave" | "equilibrado";

const COFFEE_GAME_QUESTIONS: Array<{
  question: string;
  answers: Array<{ label: string; type: CoffeePersonality }>;
}> = [
  { question: "¿Cómo empezás el día?", answers: [{ label: "Con toda la energía", type: "intenso" }, { label: "De a poquito y sin apuro", type: "suave" }, { label: "Con calma, pero enfocado", type: "equilibrado" }] },
  { question: "Elegí tu rincón ideal", answers: [{ label: "Una mesa junto a la barra", type: "intenso" }, { label: "Un sillón cómodo", type: "suave" }, { label: "Una mesa al sol", type: "equilibrado" }] },
  { question: "¿Qué plan te representa más?", answers: [{ label: "Salir y hacer mil cosas", type: "intenso" }, { label: "Una charla larga", type: "suave" }, { label: "Un paseo tranquilo", type: "equilibrado" }] },
  { question: "Cuando elegís un sabor, preferís…", answers: [{ label: "Que sea bien marcado", type: "intenso" }, { label: "Algo suave y cremoso", type: "suave" }, { label: "El punto justo", type: "equilibrado" }] },
  { question: "Tu momento Bloom ideal es…", answers: [{ label: "Una pausa rápida que despierta", type: "intenso" }, { label: "Quedarme a disfrutar sin reloj", type: "suave" }, { label: "Compartir algo rico", type: "equilibrado" }] },
];

const COFFEE_GAME_RESULTS: Record<CoffeePersonality, { emoji: string; title: string; description: string }> = {
  intenso: { emoji: "☕", title: "Sos un Espresso Intenso", description: "Directo, decidido y con energía para encarar el día." },
  suave: { emoji: "🥛", title: "Sos un Latte Suave", description: "Cálido, tranquilo y de disfrutar cada momento sin apuro." },
  equilibrado: { emoji: "🤎", title: "Sos un Capuchino Equilibrado", description: "Tenés el balance justo: energía, calma y ganas de compartir." },
};

// El slider de bienvenida se muestra una vez por cada apertura de la app
const INTRO_SEEN_KEY = "bloom_intro_seen";

// Cambiar esta versión cuando cambia la estructura del catálogo. Así no se
// hidratan categorías/productos de una versión anterior desde localStorage.
const MENU_CACHE_VERSION = "v2-four-categories";
const menuCacheKey = (name: string) => `bloom_${MENU_CACHE_VERSION}_${name}`;

interface CartItem {
  key: string; // producto + variante elegida
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
  const [latestNotification, setLatestNotification] = useState<any | null>(null);

  // Filtros y búsqueda
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Producto seleccionado para el modal de detalle
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);

  // Carrito
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showCoffeeGame, setShowCoffeeGame] = useState(false);
  const [coffeeGameStep, setCoffeeGameStep] = useState(0);
  const [coffeeGameScores, setCoffeeGameScores] = useState<Record<CoffeePersonality, number>>({ intenso: 0, suave: 0, equilibrado: 0 });
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

  useEffect(() => {
    let cancelled = false;
    const loadNotification = async () => {
      const { data } = await supabase.from("menu_notifications")
        .select("id, title, body").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data || cancelled) return;
      setLatestNotification(data);
      if ("Notification" in window && Notification.permission === "granted" && localStorage.getItem("bloom_last_notification") !== data.id) {
        new Notification(data.title, { body: data.body });
        localStorage.setItem("bloom_last_notification", data.id);
      }
    };
    loadNotification();
    const timer = window.setInterval(loadNotification, 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [supabase]);

  const enableNotifications = async () => {
    if (!("Notification" in window)) return toast.error("Este navegador no permite avisos.");
    const permission = await Notification.requestPermission();
    permission === "granted"
      ? toast.success("Avisos de Bloom activados.")
      : toast.message("Podés activar los avisos desde el navegador cuando quieras.");
  };

  // Modalidad del menú: Take Away (retiro/delivery) o Salón
  const menuModality = orderModality === "mesa" ? "salon" : "takeaway";

  // Catálogo de la modalidad: combos en Promos y productos con variantes agrupados
  const catalog = useMemo(
    () => buildCatalog(categories, products, menuModality),
    [categories, products, menuModality]
  );

  // Productos a mostrar: los de la categoría abierta, o los que coinciden con la búsqueda
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      return catalog.items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.variants.some((v) => v.label.toLowerCase().includes(q)) ||
          p.options.some((o) => o.choices.some((c) => c.toLowerCase().includes(q)))
      );
    }
    return catalog.items.filter((p) => catalog.categoryItemIds[selectedCategory]?.includes(p.id));
  }, [catalog, selectedCategory, searchQuery]);

  const openCategory = catalog.displayCategories.find((c) => c.id === selectedCategory);

  const startOrder = (modality: "retiro" | "delivery" | "mesa") => {
    setOrderModality(modality);
    setSelectedCategory("all");
    setActiveTab("menu");
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success(modality === "mesa" ? "Pedido en el salón ☕" : modality === "delivery" ? "Pedido para delivery 🛵" : "Pedido para retirar 🛍️");
  };

  const startCoffeeGame = () => {
    setCoffeeGameStep(0);
    setCoffeeGameScores({ intenso: 0, suave: 0, equilibrado: 0 });
    setShowCoffeeGame(true);
  };

  const answerCoffeeGame = (type: CoffeePersonality) => {
    setCoffeeGameScores((scores) => ({ ...scores, [type]: scores[type] + 1 }));
    setCoffeeGameStep((step) => step + 1);
  };

  const returnToWaiting = () => {
    setShowCoffeeGame(false);
    setCoffeeGameStep(0);
    setCoffeeGameScores({ intenso: 0, suave: 0, equilibrado: 0 });
  };

  const coffeeGameResult = (Object.keys(coffeeGameScores) as CoffeePersonality[])
    .reduce((best, type) => coffeeGameScores[type] > coffeeGameScores[best] ? type : best, "equilibrado" as CoffeePersonality);

  // Carrito helpers
  const cartTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart]
  );
  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );

  const handleOpenProduct = (item: MenuItem) => setSelectedProduct(item);

  const handleAddToCart = (line: SheetLine, quantity: number) => {
    const key = `${line.id}::${line.name}`;
    setCart((prev) => {
      if (prev.some((item) => item.key === key)) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { key, ...line, quantity }];
    });

    toast.success(`Agregado al pedido (${quantity})`, {
      description: line.name,
    });
    setSelectedProduct(null);
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.key === key) {
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
    } finally {
      setIsSending(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f5ef]" suppressHydrationWarning>
        <div className="w-10 h-10 border-4 border-[#c4b896] border-t-[#777b5b] rounded-full animate-spin" />
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
              <div className="w-9 h-9 rounded-xl bg-[#777b5b] flex items-center justify-center text-[#f5e8ca] shadow-sm">
                <Coffee size={19} />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-[#4b4e38] block leading-none">
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
              <span className="bg-[#777b5b] text-[#f5e8ca] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                {tableLabel}
              </span>
            )}
            <button type="button" onClick={enableNotifications} title="Recibir novedades" aria-label="Recibir novedades" className="relative p-2 rounded-xl bg-white border border-[#c4b896]/30 text-[#4b4e38] shadow-sm hover:bg-[#f2f0e6] transition-colors">
              <BellRing size={19} />
              {latestNotification && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white" />}
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-xl bg-white border border-[#c4b896]/30 text-[#4b4e38] shadow-sm hover:bg-[#f2f0e6] transition-colors"
              aria-label="Abrir carrito de compras"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#777b5b] text-[#f5e8ca] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
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
                className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-[22px] bg-[#777b5b] text-[#f5e8ca] shadow-md active:scale-[0.97] transition-transform"
              >
                <TakeAwayIcon size={44} />
                <span className="text-base font-extrabold tracking-wide">TAKE AWAY</span>
                <span className="text-[11px] text-[#ebe8d6] font-semibold">Para llevar</span>
              </button>
              <button
                type="button"
                onClick={() => startOrder("mesa")}
                className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-[22px] bg-[#c4b896] text-[#4b4e38] shadow-md active:scale-[0.97] transition-transform"
              >
                <SalonIcon size={44} />
                <span className="text-base font-extrabold tracking-wide">SALÓN</span>
                <span className="text-[11px] text-[#4b4e38]/70 font-semibold">Comer en el local</span>
              </button>
            </div>

            <div className="px-4 md:px-0 mb-6">
              <div className="home-feature-video rounded-[24px] overflow-hidden bg-[#777b5b] shadow-md">
                <video className="w-full h-full object-cover" src="/videos/yogurt-pouring.mp4" autoPlay muted loop playsInline aria-label="Preparación de yogurt Bloom" />
              </div>
            </div>

            {latestNotification && (
              <div className="px-4 md:px-0 mb-5">
                <button type="button" onClick={enableNotifications} className="w-full text-left flex gap-3 items-center rounded-2xl border border-[#c4b896]/40 bg-[#fffaf0] px-4 py-3 shadow-sm">
                  <BellRing size={20} className="text-amber-600 shrink-0" />
                  <span><strong className="block text-xs text-[#4b4e38]">{latestNotification.title}</strong><span className="text-[11px] text-[#6b6756]">{latestNotification.body}</span></span>
                </button>
              </div>
            )}

            {/* ========== PLATO DEL DÍA (el elegido en el panel de administración) ========== */}
            {platoDia && (
              <>
                <div className="px-4 md:px-0 mb-3">
                  <h2 className="text-xl font-extrabold text-[#4b4e38] tracking-tight">
                    🍽️ Plato del Día
                  </h2>
                  <p className="text-xs text-[#7a765a] mt-0.5">
                    Nuestra recomendación especial de hoy
                  </p>
                </div>
                <div className="px-4 md:px-0 mb-8">
                  <article
                    onClick={() => handleOpenProduct(toMenuItem(platoDia))}
                    className="w-full bg-white rounded-[22px] border border-[#c4b896]/25 overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <div className="w-full h-[190px] sm:h-[255px] relative bg-[#edeae0] overflow-hidden">
                      <img
                        src={platoDia.image_url || FALLBACK_PRODUCT_IMAGE}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                        }}
                      />
                      <span className="absolute top-3 left-3 bg-[#777b5b] text-[#f5e8ca] text-[11px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full shadow">
                        ⭐ Plato del día
                      </span>
                    </div>
                    <div className="p-4 pb-5">
                      <h3 className="font-extrabold text-lg text-[#4b4e38] leading-snug">{platoDia.name}</h3>
                      {platoDia.description && (
                        <p className="text-[13px] text-[#6b6756] mt-1.5 leading-relaxed line-clamp-2">
                          {platoDia.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#c4b896]/20">
                        <span className="font-extrabold text-xl text-[#4b4e38]">
                          {formatCurrency(platoDia.price)}
                        </span>
                        <span className="bg-[#777b5b] text-[#f5e8ca] text-xs font-bold px-4 py-2 rounded-full shadow-sm">
                          Ver detalle →
                        </span>
                      </div>
                    </div>
                  </article>
                </div>
              </>
            )}
          </>
        )}

        {/* ============================================
            TAB: MENÚ — Categorías + Búsqueda + Productos
        ============================================ */}
        {activeTab === "menu" && (
          <>
            {/* MODALIDAD ELEGIDA */}
            <div className="flex items-center justify-between px-[18px] md:px-0 pt-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#4b4e38]">
                {menuModality === "salon" ? "🍽️ Salón" : "🛍️ Take Away"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("inicio");
                  setSelectedCategory("all");
                  setSearchQuery("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-1 text-xs font-bold text-[#777b5b] underline underline-offset-4"
              >
                <ChevronLeft size={15} /> Volver
              </button>
            </div>

            {/* BUSCADOR */}
            <section className="search-box" aria-label="Buscador de productos">
              <Search size={18} className="text-[#a39a7f] shrink-0" />
              <input
                type="text"
                placeholder={menuModality === "salon" ? "Buscar en Salón…" : "Buscar en Take Away…"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[#a39a7f] hover:text-[#4b4e38] p-1"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </section>

            {/* CATEGORÍAS DE LA MODALIDAD (tarjetas) */}
            {!searchQuery.trim() && !openCategory && (
              <section className="menu-category-grid" aria-label="Categorías">
                {catalog.displayCategories.map((cat, index) => {
                  const catItems = catalog.items.filter((it) => catalog.categoryItemIds[cat.id]?.includes(it.id));
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="menu-category-card"
                    >
                      <span
                        className="menu-category-emoji"
                        style={{ animationDelay: `${index * 90}ms` }}
                        aria-hidden="true"
                      >
                        {CATEGORY_ICONS[cat.name.toLowerCase()] ?? "🍴"}
                      </span>
                      <span className="font-extrabold text-base text-[#4b4e38] mt-1">{cat.name}</span>
                      <span className="text-[12px] text-[#7a765a] leading-snug line-clamp-2">
                        {catItems.map((it) => it.name).join(" · ")}
                      </span>
                    </button>
                  );
                })}
              </section>
            )}

            {/* PRODUCTOS DE LA CATEGORÍA ABIERTA O DE LA BÚSQUEDA */}
            {(searchQuery.trim() || openCategory) && (
              <>
                {!searchQuery.trim() && openCategory && (
                  <div className="flex items-center gap-3 px-[18px] md:px-0 mb-4">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("all")}
                      className="flex items-center gap-1 text-xs font-bold bg-white border border-[#c4b896]/40 text-[#4b4e38] px-3.5 py-2 rounded-full shadow-sm"
                    >
                      <ChevronLeft size={15} /> Categorías
                    </button>
                    <h2 className="font-extrabold text-xl text-[#4b4e38] truncate">{openCategory.name}</h2>
                  </div>
                )}

                <section className="products-grid" aria-label="Productos">
                  {filteredProducts.map((p) => {
                    const catName =
                      catalog.displayCategories.find((c) => c.id === p.category_id)?.name ?? "";
                    const hasChoices =
                      p.variants.length > 1 || p.options.length > 0 || !!p.pick || !!p.repeat;
                    return (
                      <article
                        key={p.id}
                        onClick={() => handleOpenProduct(p)}
                        className="product-card"
                      >
                        <div className="product-image">
                          <Image
                            src={p.image_url || FALLBACK_PRODUCT_IMAGE}
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
                          <span className="product-price">
                            {p.variants.length > 1 ? `Desde ${formatCurrency(p.price)}` : formatCurrency(p.price)}
                          </span>
                          {hasChoices && (
                            <span className="block mt-1 text-[11px] font-bold text-[#777b5b]">
                              Elegir opciones ›
                            </span>
                          )}
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
                      className="mt-3 text-xs font-bold text-[#4b4e38] underline underline-offset-4"
                    >
                      Ver categorías
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* HOJA INFERIOR: VARIANTES Y OPCIONES DEL PRODUCTO */}
      <AnimatePresence>
        {selectedProduct && (
          <OptionSheet
            key={selectedProduct.id}
            item={selectedProduct}
            categoryName={
              catalog.displayCategories.find((c) => c.id === selectedProduct.category_id)?.name
            }
            onClose={() => setSelectedProduct(null)}
            onAdd={handleAddToCart}
          />
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
                  <ShoppingBag size={22} className="text-[#4b4e38]" />
                  <h2 className="font-extrabold text-lg text-[#4b4e38]">Tu Pedido</h2>
                  {tableLabel && (
                    <span className="text-[10px] bg-[#777b5b] text-[#f5e8ca] font-bold px-2.5 py-0.5 rounded-full">
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
                  {showCoffeeGame ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={coffeeGameStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="w-full max-w-sm"
                      >
                        {coffeeGameStep < COFFEE_GAME_QUESTIONS.length ? (
                          <>
                            <div className="flex items-center justify-between mb-5">
                              <button type="button" onClick={returnToWaiting} className="text-xs font-bold text-[#777b5b]">← Volver a la espera</button>
                              <span className="text-xs font-black text-[#7a765a]">{coffeeGameStep + 1} / {COFFEE_GAME_QUESTIONS.length}</span>
                            </div>
                            <Coffee size={46} className="mx-auto text-[#777b5b] mb-4" />
                            <h3 className="font-extrabold text-2xl text-[#4b4e38] mb-6">{COFFEE_GAME_QUESTIONS[coffeeGameStep].question}</h3>
                            <div className="space-y-3">
                              {COFFEE_GAME_QUESTIONS[coffeeGameStep].answers.map((answer) => (
                                <button key={answer.label} type="button" onClick={() => answerCoffeeGame(answer.type)} className="w-full rounded-2xl border border-[#c4b896]/45 bg-white px-4 py-4 text-left text-sm font-bold text-[#4b4e38] shadow-sm transition active:scale-[0.98] hover:border-[#777b5b]">
                                  {answer.label}
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-5xl block mb-4">{COFFEE_GAME_RESULTS[coffeeGameResult].emoji}</span>
                            <p className="text-xs font-black uppercase tracking-wider text-[#777b5b] mb-2">Tu resultado</p>
                            <h3 className="font-extrabold text-2xl text-[#4b4e38] mb-3">{COFFEE_GAME_RESULTS[coffeeGameResult].title}</h3>
                            <p className="text-sm text-[#5f5c46] leading-relaxed mb-7">{COFFEE_GAME_RESULTS[coffeeGameResult].description}</p>
                            <button type="button" onClick={returnToWaiting} className="w-full rounded-2xl bg-[#777b5b] px-5 py-3.5 text-sm font-black text-[#f5e8ca] shadow-md">Volver a la espera</button>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <>
                      <CheckCircle2 size={64} className="text-[#10b981] mb-4 animate-bounce" />
                      <h3 className="font-extrabold text-2xl text-[#4b4e38] mb-2">¡Pedido Confirmado!</h3>
                      <div className="mb-4 rounded-full bg-[#777b5b] text-[#f5e8ca] px-4 py-2 text-xs font-black shadow-sm">
                        {orderModality === "mesa" ? `🍽️ Para consumir en el local · Mesa ${selectedTableNum || 1}` : orderModality === "retiro" ? "🏃 Para retirar en el local" : "🛵 Envío a domicilio"}
                      </div>
                      <p className="text-sm text-[#5f5c46] max-w-xs leading-relaxed">
                        {orderModality === "mesa" ? `Tu pedido fue recibido con éxito para la Mesa ${selectedTableNum || 1}. En breve te lo alcanzamos a tu mesa.` : orderModality === "delivery" ? "Tu pedido fue recibido con éxito. ¡Ya lo estamos preparando para el envío!" : "Tu pedido fue recibido con éxito. Te avisaremos cuando esté listo en el mostrador."}
                      </p>
                      <button type="button" onClick={startCoffeeGame} className="mt-6 w-full max-w-sm rounded-2xl border border-[#c4b896]/45 bg-[#f2f0e6] px-5 py-4 text-left shadow-sm transition active:scale-[0.98]">
                        <span className="block text-lg mb-1">☕</span>
                        <span className="block font-extrabold text-[#4b4e38]">¿Qué tipo de café sos?</span>
                        <span className="block text-xs text-[#7a765a] mt-1">Jugá mientras preparamos tu pedido</span>
                      </button>
                    </>
                  )}
                </div>
              ) : cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#f2f0e6] flex items-center justify-center text-[#7a765a] mb-4">
                    <ShoppingBag size={28} />
                  </div>
                  <h3 className="font-bold text-base text-[#4b4e38] mb-1">El pedido está vacío</h3>
                  <p className="text-xs text-[#7a765a] max-w-xs mb-6">
                    Explora nuestra carta y selecciona lo que más te guste para disfrutar.
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="text-xs font-bold bg-[#777b5b] text-[#f5e8ca] px-5 py-2.5 rounded-full shadow-md hover:bg-[#63674a] transition-colors"
                  >
                    Ver Menú
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.key}
                        className="bg-white p-3.5 rounded-2xl border border-[#c4b896]/25 flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-[#4b4e38] truncate">{item.name}</h4>
                          <span className="text-xs font-semibold text-[#7a765a]">
                            {formatCurrency(item.price)} c/u
                          </span>
                        </div>

                        <div className="flex items-center gap-2 bg-[#f2f0e6] px-2 py-1 rounded-full">
                          <button
                            onClick={() => updateQuantity(item.key, -1)}
                            className="p-1 text-[#4b4e38] hover:text-black"
                            aria-label="Restar 1"
                          >
                            {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                          </button>
                          <span className="min-w-[28px] px-2 py-0.5 rounded-full bg-white border border-[#c4b896]/35 font-bold text-sm text-center text-[#4b4e38]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.key, 1)}
                            className="p-1 text-[#4b4e38] hover:text-black"
                            aria-label="Sumar 1"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <span className="font-extrabold text-sm text-[#4b4e38] min-w-[65px] text-right">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}

                    {/* Selector de Modalidad — 2 opciones grandes (DENTRO del scroll para que siempre sea visible) */}
                    <div className="mt-4 pt-4 border-t border-[#c4b896]/30 space-y-3">
                      {orderModality !== "mesa" && <div className="space-y-2">
                        <label className="text-xs font-black tracking-wider uppercase text-[#4b4e38] block">
                          ¿Cómo querés tu pedido? *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setOrderModality("delivery")} className={`relative flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 rounded-2xl border-2 transition-all font-black text-xs ${orderModality === "delivery" ? "border-[#777b5b] bg-[#777b5b] text-[#f5e8ca] shadow-lg scale-[1.01]" : "border-[#c4b896]/50 bg-white text-[#7a765a] hover:border-[#777b5b]/40"}`}>
                            <span className="text-2xl">🛵</span><span className="text-center leading-tight">Delivery</span>
                            {orderModality === "delivery" && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#f5e8ca]" />}
                          </button>

                          {/* Retirar */}
                          <button
                            type="button"
                            onClick={() => setOrderModality("retiro")}
                            className={`relative flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl border-2 transition-all font-black text-sm ${
                              orderModality === "retiro"
                                ? "border-[#777b5b] bg-[#777b5b] text-[#f5e8ca] shadow-lg scale-[1.01]"
                                : "border-[#c4b896]/50 bg-white text-[#7a765a] hover:border-[#777b5b]/40"
                            }`}
                          >
                            <span className="text-2xl">🏃</span>
                            <span className="text-center leading-tight">Retirar<br/>del local</span>
                            {orderModality === "retiro" && (
                              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#f5e8ca]" />
                            )}
                          </button>
                        </div>
                      </div>}

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
                                  className="w-full text-xs font-extrabold px-3 py-2.5 rounded-xl border border-[#c4b896]/40 bg-white outline-none focus:border-[#777b5b] focus:ring-1 focus:ring-[#777b5b]"
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
                                className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#c4b896]/40 bg-white outline-none focus:border-[#777b5b]"
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
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#c4b896]/40 bg-white outline-none focus:border-[#777b5b]"
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
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#c4b896]/40 bg-white outline-none focus:border-[#777b5b]"
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
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#c4b896]/30 bg-[#f9f8f3] outline-none focus:border-[#777b5b]"
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
                    <div className="flex items-center justify-between text-lg font-black text-[#4b4e38] pt-1.5 border-t border-dashed border-[#c4b896]/30">
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
          <div className="w-10 h-10 border-4 border-[#c4b896] border-t-[#777b5b] rounded-full animate-spin" />
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
