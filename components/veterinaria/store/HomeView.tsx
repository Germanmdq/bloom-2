"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CalendarCheck, ChevronRight, Clock, MapPin, MessageCircle, Pill, Search, ShieldCheck, Store, Truck } from "lucide-react";
import type { Category, Combo, Coupon, Faq, Product, Review, Service } from "@/lib/vet/types";
import { vetPath } from "@/lib/vet/config/integrations";
import { useSettings } from "@/lib/vet/client/store";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";
import { formatMoney } from "@/lib/vet/domain/format";
import { POPULAR_SEARCHES } from "@/lib/vet/domain/search";
import { track } from "@/lib/vet/client/analytics";
import { NamedIcon } from "../ui/icons";
import { ButtonLink, Card, DemoTag, SectionTitle, Stars } from "../ui/primitives";
import { ProductRail } from "./ProductCard";
import { useLiveProducts } from "./hooks";
import { RebuyStrip } from "./RebuyStrip";
import { ComboCard } from "./ComboCard";
import { HoursList } from "./HoursList";

export function HomeView(props: {
  featured: Product[];
  categories: Category[];
  categoryCounts: Record<string, number>;
  services: Service[];
  combos: Combo[];
  coupons: Coupon[];
  reviews: Review[];
  faqs: Faq[];
  comboProducts: Product[];
}) {
  const settings = useSettings();
  const b = settings.business;
  const router = useRouter();
  const [q, setQ] = useState("");
  const featured = useLiveProducts(props.featured);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* HERO */}
      <section className="relative mt-4 overflow-hidden rounded-[32px] bg-gradient-to-br from-vet-primary to-vet-primary-dark px-5 pb-6 pt-7 text-white shadow-[0_24px_60px_-30px_rgba(13,91,95,0.8)] sm:px-10 sm:pb-10 sm:pt-12 lg:mt-6">
        <svg className="pointer-events-none absolute -right-10 -top-10 size-64 text-white/[0.07] sm:size-96" viewBox="0 0 100 100" aria-hidden="true">
          <g fill="currentColor">
            <ellipse cx="50" cy="62" rx="20" ry="17" />
            <ellipse cx="26" cy="41" rx="8" ry="10.5" />
            <ellipse cx="41" cy="28" rx="8" ry="11" />
            <ellipse cx="59" cy="28" rx="8" ry="11" />
            <ellipse cx="74" cy="41" rx="8" ry="10.5" />
          </g>
        </svg>
        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold tracking-wide backdrop-blur">
            Veterinaria · Peluquería canina · Pet shop
          </p>
          <h1 className="mt-4 font-vet-display text-[30px] font-extrabold leading-[1.08] tracking-[-0.01em] sm:text-5xl">
            Todo para tu mascota,
            <br className="hidden sm:block" /> en un solo lugar.
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/85 sm:text-lg">{b.tagline}. Comprá online, reservá turnos y consultanos por WhatsApp.</p>

          <form
            role="search"
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(vetPath(`/buscar?q=${encodeURIComponent(q.trim())}`));
            }}
          >
            <label htmlFor="home-search" className="sr-only">
              ¿Qué estás buscando?
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                id="home-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="¿Qué estás buscando?"
                className="h-14 w-full rounded-2xl border-0 bg-white pl-12 pr-28 text-[16px] text-vet-ink shadow-lg outline-none ring-4 ring-white/0 transition focus:ring-white/30"
              />
              <button type="submit" className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-vet-ink px-4 text-sm font-bold text-white">
                Buscar
              </button>
            </div>
          </form>
          <div className="vet-scroll-x -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {POPULAR_SEARCHES.slice(0, 6).map((s) => (
              <Link key={s} href={vetPath(`/buscar?q=${encodeURIComponent(s)}`)} className="shrink-0 rounded-full bg-white/12 px-3 py-1.5 text-[13px] font-medium text-white ring-1 ring-white/20 transition hover:bg-white/20">
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ACCIONES RÁPIDAS */}
      <section aria-label="Accesos rápidos" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: vetPath("/tienda"), label: "Tienda", sub: "Accesorios y más", icon: Store, tone: "bg-vet-tint text-vet-primary-dark" },
          { href: vetPath("/turnos"), label: "Reservar turno", sub: "Baño, peluquería, consulta", icon: CalendarCheck, tone: "bg-[#fdf0f3] text-vet-accent" },
          { href: vetPath("/tienda/farmacia-veterinaria"), label: "Farmacia", sub: "Con asesoramiento", icon: Pill, tone: "bg-emerald-50 text-emerald-700" },
          { href: waLink(b.whatsapp, WA_MESSAGES.help()), label: "WhatsApp", sub: "Te respondemos", icon: MessageCircle, tone: "bg-green-50 text-[#128C4B]", external: true },
        ].map((a) => {
          const inner = (
            <>
              <span className={`grid size-11 place-items-center rounded-2xl ${a.tone}`}>
                <a.icon className="size-[22px]" />
              </span>
              <span className="mt-3 block text-[15px] font-bold text-vet-ink">{a.label}</span>
              <span className="block text-xs text-neutral-500">{a.sub}</span>
            </>
          );
          const cls = "group rounded-3xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md";
          return a.external ? (
            <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={() => track("whatsapp_click", { context: "home_quick" })}>
              {inner}
            </a>
          ) : (
            <Link key={a.label} href={a.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </section>

      <RebuyStrip />

      {/* SERVICIOS */}
      <section className="mt-10" aria-labelledby="home-services">
        <SectionTitle title="Servicios" subtitle="Reservá online en menos de un minuto" action={<Link href={vetPath("/servicios")} className="inline-flex items-center gap-1 text-sm font-semibold text-vet-primary-dark">Ver todos <ChevronRight className="size-4" /></Link>} />
        <div className="vet-scroll-x -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
          {props.services.map((s) => (
            <Link key={s.id} href={vetPath(`/turnos?servicio=${s.id}`)} className="group w-40 shrink-0 rounded-3xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto">
              <span className="grid size-12 place-items-center rounded-2xl bg-vet-tint text-vet-primary transition group-hover:bg-vet-primary group-hover:text-white">
                <NamedIcon name={s.icon} className="size-6" />
              </span>
              <span className="mt-3 block text-[15px] font-bold leading-tight text-vet-ink">{s.name}</span>
              <span className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                <Clock className="size-3" /> {s.durationMin} min · {s.price != null ? formatMoney(s.price) : "Consultar"}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-vet-primary-dark">
                Reservar <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="mt-10" aria-labelledby="home-categories">
        <SectionTitle title="Comprá por categoría" action={<Link href={vetPath("/tienda")} className="inline-flex items-center gap-1 text-sm font-semibold text-vet-primary-dark">Ver tienda <ChevronRight className="size-4" /></Link>} />
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
          {props.categories.map((c) => (
            <Link key={c.id} href={vetPath(`/tienda/${c.slug}`)} className="group flex flex-col items-center rounded-3xl bg-white p-3 text-center ring-1 ring-black/[0.05] transition hover:-translate-y-0.5 hover:shadow-md hover:ring-vet-primary/20">
              <span className="grid size-12 place-items-center rounded-2xl bg-vet-sand text-vet-ink/80 transition group-hover:bg-vet-tint group-hover:text-vet-primary">
                <NamedIcon name={c.icon} className="size-6" />
              </span>
              <span className="mt-2 line-clamp-2 text-[12.5px] font-semibold leading-tight text-vet-ink">{c.name}</span>
              <span className="mt-0.5 text-[11px] text-neutral-500">{props.categoryCounts[c.id] ?? 0}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* PROMOS / COMBOS */}
      {(props.combos.length > 0 || props.coupons.length > 0) && (
        <section className="mt-10">
          <SectionTitle title="Promociones y combos" subtitle="Ahorrá combinando productos y servicios" action={<Link href={vetPath("/promociones")} className="inline-flex items-center gap-1 text-sm font-semibold text-vet-primary-dark">Ver todas <ChevronRight className="size-4" /></Link>} />
          <div className="vet-scroll-x -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
            {props.coupons.slice(0, 2).map((c) => (
              <div key={c.id} className="relative w-72 shrink-0 overflow-hidden rounded-3xl bg-vet-ink p-5 text-white sm:w-auto">
                {c.demo && <DemoTag className="absolute right-4 top-4" />}
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{c.code ? "Cupón" : "Promo automática"}</p>
                <p className="mt-2 font-vet-display text-xl font-extrabold">{c.title}</p>
                {c.code && <p className="mt-3 inline-block rounded-xl border border-dashed border-white/40 px-3 py-1.5 font-mono text-sm font-bold tracking-wider">{c.code}</p>}
                {c.minPurchase ? <p className="mt-2 text-xs text-white/60">Compra mínima {formatMoney(c.minPurchase)}</p> : null}
              </div>
            ))}
            {props.combos.slice(0, 2).map((c) => (
              <div key={c.id} className="w-72 shrink-0 sm:w-auto">
                <ComboCard combo={c} products={props.comboProducts} services={props.services} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DESTACADOS */}
      {featured.length > 0 && (
        <section className="mt-10">
          <SectionTitle title="Elegidos para vos" subtitle="Una selección de nuestra tienda" action={<Link href={vetPath("/tienda")} className="inline-flex items-center gap-1 text-sm font-semibold text-vet-primary-dark">Ver más <ChevronRight className="size-4" /></Link>} />
          <ProductRail products={featured} categories={props.categories} />
        </section>
      )}

      {/* FARMACIA / CONFIANZA */}
      <section className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="p-5 md:col-span-2">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <h2 className="font-vet-display text-lg font-bold">¿Necesitás un medicamento o antiparasitario?</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">Te asesoramos antes de la compra para que lleves la presentación y la dosis correctas. La salud de tu mascota siempre con un profesional.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href={vetPath("/tienda/farmacia-veterinaria")} variant="secondary" size="sm">
                  Ver farmacia
                </ButtonLink>
                <ButtonLink href={vetPath("/turnos?servicio=consulta")} variant="outline" size="sm">
                  Reservar consulta
                </ButtonLink>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-vet-sand text-vet-warm">
              <Truck className="size-6" />
            </span>
            <div>
              <h2 className="font-vet-display text-lg font-bold">Envío o retiro</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                {settings.shipping.freeShippingFrom ? `Envío gratis superando ${formatMoney(settings.shipping.freeShippingFrom)}. ` : ""}
                Elegí envío a domicilio o retiro en el local al finalizar tu compra.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* RESEÑAS */}
      {props.reviews.length > 0 && (
        <section className="mt-10">
          <SectionTitle title="Lo que dicen nuestros clientes" />
          <div className="vet-scroll-x -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
            {props.reviews.map((r) => (
              <Card key={r.id} className="w-72 shrink-0 p-5 sm:w-auto">
                <div className="flex items-center justify-between">
                  <Stars value={r.rating} />
                  {r.demo && <DemoTag />}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">“{r.text}”</p>
                <p className="mt-3 text-sm font-semibold text-vet-ink">{r.name}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* UBICACIÓN + FAQ */}
      <section className="mt-10 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="font-vet-display text-xl font-extrabold">Visitanos</h2>
          <p className="mt-2 flex items-start gap-2 text-sm text-neutral-700">
            <MapPin className="mt-0.5 size-4 shrink-0 text-vet-primary" />
            {b.address.street ? `${b.address.street}${b.address.city ? `, ${b.address.city}` : ""}` : "Dirección a confirmar — consultanos por WhatsApp."}
          </p>
          <div className="mt-4">
            <HoursList compact />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href={vetPath("/ubicacion")} size="sm">
              Cómo llegar
            </ButtonLink>
            <ButtonLink href={waLink(b.whatsapp, WA_MESSAGES.help())} variant="whatsapp" size="sm" external>
              <MessageCircle className="size-4" /> WhatsApp
            </ButtonLink>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="font-vet-display text-xl font-extrabold">Preguntas frecuentes</h2>
          <div className="mt-3 divide-y divide-black/5">
            {props.faqs.map((f) => (
              <details key={f.id} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-vet-ink">
                  {f.question}
                  <ChevronRight className="size-4 shrink-0 text-neutral-400 transition group-open:rotate-90" />
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{f.answer}</p>
              </details>
            ))}
          </div>
          <Link href={vetPath("/preguntas-frecuentes")} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-vet-primary-dark">
            Ver todas <ChevronRight className="size-4" />
          </Link>
        </Card>
      </section>
    </div>
  );
}
