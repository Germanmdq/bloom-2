"use client";

/** Tipografía: Inter desde `app/layout.tsx` (variable `--font-inter`). Esta página no importa `next/font`; el `<main>` usa `font-sans`. */

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconArrowRight,
  IconBike,
  IconChefHat,
  IconClock,
  IconCoffee,
  IconCookie,
  IconLeaf,
  IconStar,
  IconTruck,
  IconToolsKitchen,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { FoodKingMobileNavPanel } from "@/components/FoodKingMobileNav";
import { SiteHeader } from "@/components/SiteHeader";
import { BloomChat, type BloomChatHandle } from "@/components/Menu/BloomChat";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

/** Video de fondo del hero: colocar el archivo en /public/videos/ (p. ej. hero-bloom.mp4). */
const HERO_VIDEO_SRC = "/videos/hero-bloom.mp4";
/** Logo PNG con tipografía marrón bloom-600 y fondo transparente (ver scripts/process-bloom-logo.mjs). */
const HERO_LOGO_SRC = "/images/bloom-logo.png";
/** Poster del hero hasta que cargue el video (misma ruta que logo o imagen wide dedicada). */
const HERO_VIDEO_POSTER_SRC = HERO_LOGO_SRC;

const U = {
  /** Flat lay marca — sección Sobre Bloom en home */
  sobreBloom: "/images/sobre-bloom-cafe.png",
  delivery: "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=1200&q=85",
};

const CONTACT = {
  address: "Almirante Brown 2005",
  city: "Mar del Plata, Argentina",
  email: "reservas@bloom.com",
  phoneDisplay: "+54 9 223 123-4567",
  phoneHref: "tel:+5492231234567",
  hours: "Lun–Dom · 08:00–22:00",
};

const categoryCards = [
  { title: "Cafetería",  hint: "Cafés y bebidas calientes", href: "/menu?cat=Cafetería",        src: "/images/categories/cafeteria.png" },
  { title: "Comidas",    hint: "Platos del día y más",      href: "/menu?cat=Platos%20Diarios", src: "/images/categories/platos-diarios.png" },
  { title: "Bebidas",    hint: "Bebidas frías",              href: "/menu?cat=Bebidas",          src: "/images/categories/bebidas.png" },
  { title: "Pastelería", hint: "Dulces y panificados",       href: "/menu?cat=Pastelería",       src: "/images/categories/pasteleria.png" },
];

const destacados: { name: string; desc: string; img: string; nameHint: string }[] = [
  {
    name: "Los wraps",
    desc: "Recién armados, frescos y para llevar.",
    img: "/images/categories/wraps.png",
    nameHint: "wrap",
  },
  {
    name: "Las ensaladas",
    desc: "Verdes, completas y con aderezos de la casa.",
    img: "/images/categories/ensaladas.png",
    nameHint: "ensalada",
  },
  {
    name: "Arroz con pollo",
    desc: "Un clásico de la cocina, abundante y casero.",
    img: "/images/products/arroz-con-pollo.png",
    nameHint: "arroz",
  },
  {
    name: "Tostado pan árabe",
    desc: "Crocante, bien dorado, ideal para desayunar o merendar.",
    img: "/images/tostado-arabe-home.png",
    nameHint: "tostado",
  },
];

const FadeIn = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function HomePage() {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bloomChatRef = useRef<BloomChatHandle>(null);
  
  /** Promociones Activas desde DB */
  const [promociones, setPromociones] = useState<any[]>([]);

  /** Plato del Día Dinámico desde DB */
  const [platoDelDia, setPlatoDelDia] = useState<any>(null);

  /** Por tarjeta: producto y categoría encontrados para abrir el chat con una sola tarjeta desde la home. */
  const [favoriteCategoryByName, setFavoriteCategoryByName] = useState<
    Record<string, { categoryId: string; displayName: string; productId: string } | null>
  >({});

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const maxWait = window.setTimeout(() => setHeroVideoReady(true), 12000);
    return () => window.clearTimeout(maxWait);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const next: Record<string, { categoryId: string; displayName: string; productId: string } | null> = {};
      for (const d of destacados) {
        const { data } = await supabase
          .from("products")
          .select("id, category_id, categories(name)")
          .eq("active", true)
          .ilike("name", `%${d.nameHint}%`)
          .limit(1)
          .maybeSingle();
        if (!data?.category_id) {
          next[d.name] = null;
          continue;
        }
        const raw = data as { category_id: string; categories?: { name?: string } | { name?: string }[] | null };
        const c = raw.categories;
        const categoryLabel = Array.isArray(c)
          ? typeof c[0]?.name === "string"
            ? c[0].name
            : null
          : typeof c?.name === "string"
            ? c.name
            : null;
        next[d.name] = {
          categoryId: raw.category_id,
          displayName: categoryLabel?.trim() || d.name,
          productId: data.id as string,
        };
      }
      setFavoriteCategoryByName(next);

      // Cargar Promociones
      const { data: promoData } = await supabase
        .from("products")
        .select("*")
        .eq("kind", "promocion")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (promoData) setPromociones(promoData);

      // Cargar Plato del Día desde Ajustes
      const { data: appSettings } = await supabase.from('app_settings').select('plato_del_dia_id').eq('id', 1).maybeSingle();
      if (appSettings?.plato_del_dia_id) {
          const { data: plato } = await supabase.from('products').select('*').eq('id', appSettings.plato_del_dia_id).maybeSingle();
          if (plato) setPlatoDelDia(plato);
      } else {
          // Backup if not found in app_settings, look for kind
          const { data: platoBackup } = await supabase.from('products').select('*').eq('kind', 'plato_del_dia').maybeSingle();
          if (platoBackup) setPlatoDelDia(platoBackup);
      }

    })();
  }, []);

  return (
    <main className="min-h-screen bg-bloom-page text-neutral-900 font-sans selection:bg-bloom-200 selection:text-neutral-900">
      <FoodKingMobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <SiteHeader scrolled={scrolled} onMobileNavOpen={() => setMobileNavOpen(true)} activeNav="home" />

      <section className="relative min-h-[min(90vh,840px)] h-[min(90vh,840px)] w-full overflow-hidden bg-neutral-950">
        <div className="absolute inset-0 bg-neutral-950">
          <video
            className="absolute inset-0 h-full w-full object-cover object-center scale-[1.02] bg-neutral-950"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster={HERO_VIDEO_POSTER_SRC}
            aria-hidden
            onCanPlay={() => setHeroVideoReady(true)}
            onError={() => setHeroVideoReady(true)}
          >
            <source src={HERO_VIDEO_SRC} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-br from-english-950/75 via-black/35 to-transparent sm:from-english-950/65" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
          <div
            className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none"
            aria-hidden
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" aria-hidden />
        </div>

        <AnimatePresence>
          {!heroVideoReady && (
            <motion.div
              key="hero-loader"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="absolute inset-0 z-[25] flex flex-col items-center justify-center gap-6 bg-neutral-950 px-6"
              aria-busy
              aria-label="Cargando"
            >
              <div className="relative h-28 w-full max-w-[300px] sm:h-36">
                <Image
                  src={HERO_LOGO_SRC}
                  alt="Bloom"
                  fill
                  className="object-contain object-center drop-shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                  sizes="300px"
                  priority
                />
              </div>
              <p className="text-bloom-cream font-bold tracking-[0.35em] text-[11px] sm:text-xs uppercase">Bloom</p>
              <div className="h-0.5 w-28 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full w-1/3 rounded-full bg-bloom-cream/70"
                  initial={{ x: "-120%" }}
                  animate={{ x: "320%" }}
                  transition={{ repeat: Infinity, duration: 1.15, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 h-full flex flex-col justify-end mx-auto w-full max-w-[1200px] px-6 pb-16 sm:pb-20 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={heroVideoReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="w-full max-w-[860px] text-white pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          >
            <p className="text-[11px] sm:text-[12px] font-semibold tracking-[0.2em] uppercase mb-5" style={{ color: "#c4b896" }}>
              Bloom · Coffee &amp; More
            </p>
            <h1 className="font-[200] leading-[1.02] tracking-[-0.035em] mb-8 [text-shadow:0_4px_36px_rgba(0,0,0,0.4)]"
              style={{ fontSize: "clamp(3.5rem,8vw,8rem)" }}>
              Mucho más<br />
              <span style={{ color: "#c4b896" }}>que un café.</span>
            </h1>
            <p className="text-white/78 leading-relaxed mb-10 max-w-[540px]" style={{ fontSize: "clamp(17px,1.2vw,21px)" }}>
              Especialidad, pastelería y cocina. Todo en un solo lugar, en Mar del Plata.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 rounded-full bg-white text-black px-8 py-4 text-[15px] font-medium hover:bg-ink-200 transition-colors"
              >
                Ver menú →
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 text-white px-8 py-4 text-[15px] font-medium backdrop-blur-md hover:bg-white/10 transition-colors"
              >
                Conocé más
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 md:py-32" style={{ background: "#1a3028" }}>
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <FadeIn className="text-center max-w-[720px] mx-auto mb-20">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase mb-4" style={{ color: "#c4b896" }}>Programa de lealtad</p>
            <h2 className="font-[200] tracking-[-0.03em] text-white" style={{ fontSize: "clamp(2.5rem,5vw,5rem)", lineHeight: 1.05 }}>
              Sumate al <span style={{ color: "#c4b896" }}>Club Bloom.</span>
            </h2>
            <p className="mt-6 leading-relaxed" style={{ fontSize: 19, color: "rgba(242,240,230,.78)" }}>
              Registrate una vez. Sumá puntos con cada encargo. Sin complicaciones.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {([
              { Icon: IconCoffee,          title: "Café gratis cada 10 encargos", desc: "Cuando llegás a 10 pedidos, el siguiente corre por cuenta de la casa." },
              { Icon: IconStar,            title: "Regalos en fechas especiales",  desc: "En tu cumpleaños y fechas clave tenemos una sorpresa para vos." },
              { Icon: IconCookie,          title: "Descuentos exclusivos",         desc: "Promociones y precios especiales sólo para socios del Club." },
            ] as const).map((card, i) => (
              <FadeIn key={card.title} delay={i * 0.06} className="h-full">
                <div className="flex flex-col gap-5 rounded-3xl p-10 h-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <card.Icon size={28} strokeWidth={1.5} style={{ color: "#c4b896" }} aria-hidden />
                  <h3 className="text-[22px] font-medium tracking-tight text-white leading-snug">{card.title}</h3>
                  <p className="text-[15px] leading-relaxed" style={{ color: "rgba(242,240,230,.75)" }}>{card.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-18 text-center">
            <Link
              href="/registro"
              className="inline-flex items-center justify-center rounded-full px-10 py-[18px] text-[15px] font-semibold transition-colors"
              style={{ background: "#c4b896", color: "#1a3028" }}
            >
              Quiero ser socio →
            </Link>
          </FadeIn>
        </div>
      </section>

      <section className="py-24 md:py-32 bg-white">
        <FadeIn className="text-center max-w-[640px] mx-auto mb-6 px-6">
          <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-bloom-600 mb-3">Nuestra carta</p>
          <h2 className="font-[300] tracking-tight text-ink-800" style={{ fontSize: "clamp(2.5rem,4vw,4.5rem)", lineHeight: 1.05 }}>
            Elegí por <span className="text-bloom-600">categoría.</span>
          </h2>
        </FadeIn>

        {/* Desktop: 4 cards in a static row */}
        <div className="hidden md:flex gap-4 px-8 max-w-7xl mx-auto">
          {categoryCards.map((c, index) => (
            <Card
              key={c.href}
              index={index}
              card={{ src: c.src, title: c.title, category: c.hint, content: null }}
              onClick={() => router.push(c.href)}
              className="flex-1 w-auto md:w-auto md:h-[26rem]"
            />
          ))}
        </div>

        {/* Mobile: scrollable carousel */}
        <div className="md:hidden">
          <Carousel
            items={categoryCards.map((c, index) => (
              <Card
                key={c.href}
                index={index}
                card={{ src: c.src, title: c.title, category: c.hint, content: null }}
                onClick={() => router.push(c.href)}
              />
            ))}
          />
        </div>
      </section>

      {platoDelDia && (
      <section className="py-24 md:py-32 bg-ink-50">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <FadeIn className="text-center max-w-[720px] mx-auto mb-18">
            <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-bloom-600 mb-3">Recomendación</p>
            <h2 className="font-[300] tracking-tight text-ink-800" style={{ fontSize: "clamp(2.5rem,4vw,4.5rem)", lineHeight: 1.05 }}>
              El plato <span className="text-bloom-600">del día.</span>
            </h2>
          </FadeIn>
          <div className="max-w-4xl mx-auto">
            <FadeIn>
              <div className="group bg-white rounded-[2.5rem] p-4 sm:p-6 border border-black/[0.08] overflow-hidden transition-all duration-500 hover:shadow-[0_20px_60px_-16px_rgba(0,0,0,0.15)] flex flex-col md:flex-row items-center gap-8 md:gap-16">
                <div className="relative w-full md:w-1/2 aspect-square md:aspect-[4/5] rounded-[2rem] overflow-hidden bg-gray-50">
                  {platoDelDia.image_url ? (
                    <Image src={platoDelDia.image_url} alt={platoDelDia.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 768px) 100vw, 50vw" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
                  )}
                  <div className="absolute top-6 left-6">
                    <span className="bg-bloom-600 text-white shadow-lg text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full">
                      Destacado de hoy
                    </span>
                  </div>
                </div>
                <div className="p-4 sm:p-0 md:w-1/2 md:pr-12 text-center md:text-left flex flex-col h-full justify-center">
                  <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-ink-800 leading-snug mb-4">{platoDelDia.name}</h3>
                  <p className="text-lg text-ink-500 leading-relaxed mb-8">{platoDelDia.description || "Nuestra recomendación especial preparada hoy con ingredientes frescos."}</p>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <span className="text-4xl font-black text-bloom-600">${platoDelDia.price?.toLocaleString() || "0"}</span>
                    <button
                      type="button"
                      onClick={() => bloomChatRef.current?.openWithCategoryMessage({ categoryId: '', displayName: 'Sugerencias', productIds: [platoDelDia.id], fromHomeFeatured: true })}
                      className="w-full sm:w-auto rounded-full bg-ink-800 text-white text-[15px] font-semibold px-10 py-4 hover:bg-black transition-colors duration-300"
                    >
                      Lo quiero
                    </button>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
          <div className="text-center mt-20">
            <Link href="/menu" className="inline-flex items-center gap-2 text-[14px] font-medium text-ink-500 hover:text-ink-800 transition-colors">
              Ver menú completo <IconArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* SECCIÓN DINÁMICA DE PROMOCIONES */}
      <AnimatePresence>
        {promociones.length > 0 && (
          <section className="py-24 md:py-32 bg-white relative overflow-hidden ring-1 ring-black/[0.04] z-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="mx-auto w-full max-w-[1200px] px-6 relative z-10">
              <FadeIn className="max-w-[720px] mb-16">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-indigo-600">Novedades</p>
                </div>
                <h2 className="font-[300] tracking-tight text-ink-800" style={{ fontSize: "clamp(2.5rem,4vw,4.5rem)", lineHeight: 1.05 }}>
                  Nuestras <span className="text-indigo-600">Promociones.</span>
                </h2>
              </FadeIn>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {promociones.map((promo, i) => (
                  <FadeIn key={promo.id} delay={i * 0.1}>
                    <div className="group h-full flex flex-col bg-white rounded-[2rem] border border-black/[0.06] overflow-hidden transition-all duration-[450ms] hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(79,70,229,0.15)] hover:border-indigo-100">
                      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                        {promo.image_url ? (
                          <Image src={promo.image_url} alt={promo.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="(max-width: 640px) 100vw, 33vw" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                            <IconStar size={40} className="text-indigo-200" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <span className="bg-white/90 backdrop-blur-md text-indigo-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                            Promo Especial
                          </span>
                        </div>
                      </div>
                      <div className="p-8 flex-1 flex flex-col">
                        <h3 className="text-2xl font-bold tracking-tight text-ink-800 leading-snug mb-3">{promo.name}</h3>
                        <p className="text-[15px] text-ink-500 leading-relaxed mb-6 flex-1">{promo.description}</p>
                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-black/[0.04]">
                          <span className="text-2xl font-black text-indigo-600">${promo.price?.toLocaleString()}</span>
                          <button onClick={() => bloomChatRef.current?.openWithCategoryMessage({ categoryId: '', displayName: 'Promociones', productIds: [promo.id], fromHomeFeatured: true })} className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors duration-300">
                            <IconArrowRight size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </section>
        )}
      </AnimatePresence>

      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: IconCoffee, title: "Café de especialidad", body: "Granos seleccionados y preparación consistente en cada taza." },
              { icon: IconChefHat, title: "Cocina y pastelería", body: "Recetas propias y elaboración diaria en la mayoría de nuestras opciones." },
              { icon: IconTruck, title: "Delivery", body: "Pedidos online para que disfrutes Bloom donde estés." },
              { icon: IconLeaf, title: "Ingredientes frescos", body: "Priorizamos calidad y estación en platos y jugos." },
            ].map((f, i) => {
              const FeatureIcon = f.icon;
              return (
              <FadeIn key={f.title} delay={i * 0.06}>
                <div className="text-center px-2">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bloom-gold/25 text-bloom-600 shadow-[0_8px_28px_-4px_rgba(196,184,150,0.55),0_2px_8px_rgba(196,184,150,0.25)] ring-1 ring-bloom-gold/35">
                    <FeatureIcon size={32} strokeWidth={2} className="drop-shadow-[0_2px_4px_rgba(122,118,90,0.2)]" />
                  </div>
                  <h3 className="font-black text-base uppercase tracking-wide text-neutral-900 mb-2 drop-shadow-[0_1px_3px_rgba(61,59,47,0.08)]">
                    {f.title}
                  </h3>
                  <p className="text-neutral-600 text-sm leading-relaxed drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)]">
                    {f.body}
                  </p>
                </div>
              </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#1a1a1a] text-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <FadeIn className="lg:w-1/2 relative w-full max-w-lg mx-auto">
              <div className="relative aspect-square rounded-3xl overflow-hidden shadow-[0_28px_64px_-12px_rgba(0,0,0,0.55),0_12px_36px_-6px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
                <Image
                  src={U.sobreBloom}
                  alt="Vasos Bloom Coffee & More y pastelería sobre mantel verde"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </FadeIn>
            <FadeIn className="lg:w-1/2">
              <p className="text-bloom-gold font-bold uppercase tracking-widest text-sm mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                Sobre Bloom
              </p>
              <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight [text-shadow:0_4px_28px_rgba(0,0,0,0.35),0_2px_10px_rgba(0,0,0,0.25)]">
                Cafetería familiar,{" "}
                <span className="text-bloom-gold [text-shadow:0_4px_24px_rgba(0,0,0,0.4)]">hecha con el corazón</span>
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed mb-5">
                Bloom es una cafetería familiar creada por Bárbara y Agustín como un proyecto lleno de amor, desafío y vocación. Somos un
                espacio cálido y de encuentro, donde ofrecemos cafés clásicos, sabores tradicionales y comidas caseras, elaboradas con
                ingredientes de calidad y ese toque hogareño que te hace sentir como en casa.
              </p>
              <p className="text-neutral-400 text-lg leading-relaxed mb-10">
                Nuestros hijos forman parte de nuestro día a día, y esa esencia familiar se refleja en el ambiente, en el equipo y en la forma
                en que recibimos a cada cliente. En Bloom buscamos que todos se sientan bienvenidos, cómodos y felices de volver.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full bg-bloom-gold px-8 py-3.5 font-black text-neutral-900 text-sm uppercase hover:bg-bloom-gold-dark transition-colors"
              >
                Conocer más
                <IconArrowRight size={18} />
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-bloom-page">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <FadeIn>
            <p className="text-bloom-600 font-bold uppercase tracking-widest text-sm mb-2 drop-shadow-[0_1px_2px_rgba(122,118,90,0.2)]">
              Clientes
            </p>
            <h2 className="text-2xl md:text-4xl font-black text-neutral-900 mb-10 drop-shadow-[0_2px_12px_rgba(61,59,47,0.1)]">
              La experiencia de quienes nos eligen
            </h2>
            <div className="rounded-3xl bg-white border border-bloom-200 shadow-[0_16px_48px_-10px_rgba(61,59,47,0.14),0_6px_20px_rgba(61,59,47,0.08)] p-8 md:p-12">
              <div className="flex justify-center mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <IconStar key={s} className="w-6 h-6 text-bloom-gold fill-bloom-gold" />
                ))}
              </div>
              <p className="text-lg md:text-xl text-neutral-700 leading-relaxed mb-8 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
                &ldquo;Excelente café y las tortas son un viaje de ida. Volvemos siempre que podemos; el servicio es súper atento.&rdquo;
              </p>
              <p className="font-black text-neutral-900 text-lg drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]">
                María · Mar del Plata
              </p>
              <p className="text-neutral-500 text-sm font-semibold">Cliente frecuente</p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-bloom-page">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 relative w-full">
            <div className="relative w-full max-w-lg mx-auto aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_24px_56px_-12px_rgba(61,59,47,0.28),0_8px_24px_rgba(61,59,47,0.12)] ring-1 ring-black/[0.06]">
              <Image src={U.delivery} alt="Delivery Bloom" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            </div>
          </div>
          <FadeIn className="lg:w-1/2 text-center lg:text-left">
            <p className="text-bloom-600 font-bold uppercase tracking-widest text-sm mb-2 drop-shadow-[0_1px_2px_rgba(122,118,90,0.2)]">
              Pedidos online
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-neutral-900 mb-6 drop-shadow-[0_2px_14px_rgba(61,59,47,0.1)]">
              Delivery en la ciudad
            </h2>
            <p className="text-neutral-600 text-lg mb-8 max-w-lg drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)]">
              Hacé tu pedido desde la web y coordinamos el envío. Horarios y zonas según disponibilidad del día.
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-full bg-bloom-600 px-8 py-4 font-black text-white text-sm uppercase hover:bg-bloom-700 transition-colors"
            >
              <IconBike size={20} />
              Pedir ahora
            </Link>
          </FadeIn>
        </div>
      </section>

      <section id="contact" className="py-16 bg-[#1a1a1a] text-white">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <IconClock className="mx-auto mb-4 text-bloom-gold" size={40} />
          <h2 className="text-2xl md:text-4xl font-black mb-4">¿Reservas o consultas?</h2>
          <p className="text-neutral-400 font-semibold mb-2">Escribinos o llamanos</p>
          <a href={CONTACT.phoneHref} className="text-2xl md:text-3xl font-black text-bloom-gold hover:underline block">
            {CONTACT.phoneDisplay}
          </a>
          <p className="text-neutral-500 mt-4">
            <a href={`mailto:${CONTACT.email}`} className="hover:text-bloom-gold">
              {CONTACT.email}
            </a>
            {" · "}
            {CONTACT.address}, {CONTACT.city}
          </p>
          <div className="mt-10">
            <Link
              href="/reservations"
              className="inline-flex items-center gap-2 rounded-full bg-bloom-gold px-10 py-4 font-black text-neutral-900 text-sm uppercase hover:bg-bloom-gold-dark transition-colors"
            >
              Reservar mesa
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-ink-50 border-t border-black/[0.08]">
        <div className="mx-auto w-full max-w-[1200px] px-6 pt-16 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-[1.4fr_repeat(3,1fr)] gap-12 mb-14">
            <div className="col-span-2 md:col-span-1">
              <Image src={HERO_LOGO_SRC} alt="Bloom" width={140} height={46} className="h-9 w-auto object-contain" />
              <p className="mt-4 text-[13px] leading-relaxed max-w-[280px]" style={{ color: "#86868b" }}>
                Cafetería de especialidad y pastelería. Café clásico, comidas caseras y experiencia familiar en Mar del Plata.
              </p>
            </div>
            {([
              { h: "Bloom",     links: [{ label: "Menú", href: "/menu" }, { label: "Club Bloom", href: "/registro" }, { label: "Reservas", href: "/reservations" }] },
              { h: "La casa",   links: [{ label: "Nuestra historia", href: "/about" }, { label: "Contacto", href: "/about" }, { label: "Trabajá con nosotros", href: "/about" }] },
              { h: "Visítanos", links: [{ label: "Almirante Brown 2005", href: "#" }, { label: "Mar del Plata", href: "#" }, { label: "Lun–Dom · 08:00–22:00", href: "#" }] },
            ]).map(col => (
              <div key={col.h}>
                <p className="text-[12px] font-semibold tracking-[0.08em] uppercase mb-4" style={{ color: "#1d1d1f" }}>{col.h}</p>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-[13px] transition-colors hover:text-ink-800" style={{ color: "#86868b" }}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-black/[0.08] flex flex-col sm:flex-row justify-between items-center gap-3 text-[12px]" style={{ color: "#86868b" }}>
            <span>© {new Date().getFullYear()} Bloom · Mar del Plata, Argentina.</span>
            <Link href="/login" className="opacity-40 hover:opacity-70 transition-opacity">Staff</Link>
          </div>
        </div>
      </footer>

      <BloomChat ref={bloomChatRef} />
    </main>
  );
}
