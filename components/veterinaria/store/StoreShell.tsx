"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarCheck, Heart, House, Instagram, MapPin, MessageCircle, Phone, Search, ShoppingBag, Store, UserRound, X } from "lucide-react";
import { VET_BASE, vetPath, INTEGRATIONS } from "@/lib/vet/config/integrations";
import { useSettings } from "@/lib/vet/client/store";
import { useCart, cartCount } from "@/lib/vet/client/cart";
import { useHydrated } from "@/lib/vet/client/session";
import { waLink, WA_MESSAGES } from "@/lib/vet/domain/whatsapp";
import { track } from "@/lib/vet/client/analytics";
import { cn } from "@/lib/utils";
import { CartReminder } from "./CartReminder";
import { InstallBanner } from "./InstallBanner";
import { Logo } from "./Logo";

const NAV = [
  { href: "", label: "Inicio", icon: House },
  { href: "/tienda", label: "Tienda", icon: Store },
  { href: "/turnos", label: "Turnos", icon: CalendarCheck },
  { href: "/carrito", label: "Carrito", icon: ShoppingBag },
  { href: "/cuenta", label: "Cuenta", icon: UserRound },
];

const DESKTOP_LINKS = [
  { href: "/tienda", label: "Tienda" },
  { href: "/servicios", label: "Servicios" },
  { href: "/turnos", label: "Turnos" },
  { href: "/promociones", label: "Promociones" },
  { href: "/ubicacion", label: "Ubicación" },
];

function isActive(pathname: string, href: string) {
  const full = vetPath(href);
  return href === "" ? pathname === VET_BASE : pathname.startsWith(full);
}

export function StoreShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? VET_BASE;
  const router = useRouter();
  const settings = useSettings();
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(lines) : 0;
  const [q, setQ] = useState("");
  const [demoHidden, setDemoHidden] = useState(true);
  const b = settings.business;

  useEffect(() => {
    try {
      setDemoHidden(sessionStorage.getItem("vdp:demo-hidden") === "1");
    } catch {
      setDemoHidden(false);
    }
  }, []);

  const hideCheckoutChrome = pathname.startsWith(vetPath("/checkout"));
  // En producto y asistente hay acciones fijas abajo: el botón flotante se oculta en celulares.
  const fabDesktopOnly = pathname.startsWith(vetPath("/producto/")) || pathname.startsWith(vetPath("/asistente"));

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Saltar al contenido
      </a>

      {INTEGRATIONS.dataSource === "demo" && !demoHidden && (
        <div className="relative bg-vet-ink px-10 py-2 text-center text-[12px] leading-snug text-white/90">
          <strong className="font-semibold text-white">Versión de prueba.</strong> Catálogo y precios reales del Excel; pedidos, clientes y reseñas son de ejemplo.
          <button
            type="button"
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-white/10"
            aria-label="Ocultar aviso"
            onClick={() => {
              setDemoHidden(true);
              try {
                sessionStorage.setItem("vdp:demo-hidden", "1");
              } catch {}
            }}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-vet-surface/85 backdrop-blur-xl supports-[backdrop-filter]:bg-vet-surface/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-[72px]">
          <Link href={VET_BASE} className="shrink-0 rounded-xl" aria-label={`${b.name} — inicio`}>
            <Logo />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Principal">
            {DESKTOP_LINKS.map((l) => (
              <Link
                key={l.href}
                href={vetPath(l.href)}
                className={cn("rounded-xl px-3 py-2 text-sm font-semibold transition", isActive(pathname, l.href) ? "bg-vet-tint text-vet-primary-dark" : "text-vet-ink/75 hover:bg-black/5 hover:text-vet-ink")}
                aria-current={isActive(pathname, l.href) ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <form
            role="search"
            className="ml-auto hidden max-w-sm flex-1 md:block"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(vetPath(`/buscar?q=${encodeURIComponent(q.trim())}`));
            }}
          >
            <label htmlFor="vet-header-search" className="sr-only">
              Buscar productos
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                id="vet-header-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar: pretal, antipulgas, buzo…"
                className="h-11 w-full rounded-2xl border border-black/[0.08] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-vet-primary focus:ring-4 focus:ring-vet-primary/15"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <Link href={vetPath("/buscar")} className="grid size-11 place-items-center rounded-2xl text-vet-ink hover:bg-black/5 md:hidden" aria-label="Buscar">
              <Search className="size-5" />
            </Link>
            <Link href={vetPath("/favoritos")} className="grid size-11 place-items-center rounded-2xl text-vet-ink hover:bg-black/5" aria-label="Mis favoritos">
              <Heart className="size-5" />
            </Link>
            <Link href={vetPath("/cuenta")} className="hidden size-11 place-items-center rounded-2xl text-vet-ink hover:bg-black/5 lg:grid" aria-label="Mi cuenta">
              <UserRound className="size-5" />
            </Link>
            <Link href={vetPath("/carrito")} className="relative hidden size-11 place-items-center rounded-2xl bg-vet-primary text-white shadow-sm hover:bg-vet-primary-dark lg:grid" aria-label={`Carrito, ${count} productos`}>
              <ShoppingBag className="size-5" />
              {count > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-vet-accent px-1 text-[11px] font-bold text-white ring-2 ring-vet-surface">{count}</span>}
            </Link>
          </div>
        </div>
      </header>

      <main id="contenido" className="flex-1 pb-28 lg:pb-12">
        {children}
      </main>

      <CartReminder />
      <InstallBanner />

      {/* WhatsApp flotante (no tapa la barra inferior). */}
      {!hideCheckoutChrome && b.whatsapp && (
        <a
          href={waLink(b.whatsapp, WA_MESSAGES.help())}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("whatsapp_click", { context: "fab" })}
          className={cn("fixed bottom-[88px] right-4 z-40 size-14 place-items-center", fabDesktopOnly ? "hidden lg:grid" : "grid", " rounded-full bg-[#128C4B] text-white shadow-lg shadow-green-900/25 transition hover:scale-105 lg:bottom-6 lg:right-6")}
          aria-label="Escribinos por WhatsApp"
        >
          <MessageCircle className="size-6" />
        </a>
      )}

      <footer className="border-t border-black/[0.06] bg-white/60 pb-28 lg:pb-0">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-600">{b.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {b.whatsapp && (
                <a href={waLink(b.whatsapp, WA_MESSAGES.help())} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold shadow-sm ring-1 ring-black/5 hover:ring-vet-primary/30">
                  <Phone className="size-4 text-[#128C4B]" /> {b.phone}
                </a>
              )}
              {b.instagram && (
                <a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold shadow-sm ring-1 ring-black/5 hover:ring-vet-primary/30">
                  <Instagram className="size-4 text-vet-accent" /> @{b.instagram}
                </a>
              )}
            </div>
          </div>
          <nav aria-label="Tienda">
            <h2 className="text-sm font-bold text-vet-ink">Tienda</h2>
            <ul className="mt-3 space-y-2 text-sm text-neutral-600">
              <li><Link className="hover:text-vet-primary" href={vetPath("/tienda")}>Todos los productos</Link></li>
              <li><Link className="hover:text-vet-primary" href={vetPath("/promociones")}>Promociones y combos</Link></li>
              <li><Link className="hover:text-vet-primary" href={vetPath("/favoritos")}>Mis favoritos</Link></li>
              <li><Link className="hover:text-vet-primary" href={vetPath("/cuenta")}>Mi cuenta y pedidos</Link></li>
            </ul>
          </nav>
          <nav aria-label="Atención">
            <h2 className="text-sm font-bold text-vet-ink">Atención</h2>
            <ul className="mt-3 space-y-2 text-sm text-neutral-600">
              <li><Link className="hover:text-vet-primary" href={vetPath("/servicios")}>Servicios</Link></li>
              <li><Link className="hover:text-vet-primary" href={vetPath("/turnos")}>Reservar turno</Link></li>
              <li><Link className="hover:text-vet-primary" href={vetPath("/ubicacion")}><MapPin className="mr-1 inline size-3.5" />Ubicación y horarios</Link></li>
              <li><Link className="hover:text-vet-primary" href={vetPath("/preguntas-frecuentes")}>Preguntas frecuentes</Link></li>
              <li><Link className="hover:text-vet-primary" href={vetPath("/asistente")}>Asistente</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-black/[0.05] px-4 py-4 text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} {b.name} · {b.tagline}
        </div>
      </footer>

      {/* Barra inferior móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.06] bg-white/92 backdrop-blur-xl vet-safe-bottom lg:hidden" aria-label="Navegación inferior">
        <ul className="mx-auto grid h-[68px] max-w-md grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={label}>
                <Link href={vetPath(href)} className="relative flex h-full flex-col items-center justify-center gap-0.5" aria-current={active ? "page" : undefined}>
                  <span className={cn("grid h-8 w-14 place-items-center rounded-full transition", active ? "bg-vet-tint text-vet-primary-dark" : "text-neutral-500")}>
                    <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                  </span>
                  <span className={cn("text-[11px] font-semibold", active ? "text-vet-primary-dark" : "text-neutral-500")}>{label}</span>
                  {label === "Carrito" && count > 0 && <span className="absolute right-[18%] top-2 grid min-w-5 place-items-center rounded-full bg-vet-accent px-1 text-[10px] font-bold text-white ring-2 ring-white">{count}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
