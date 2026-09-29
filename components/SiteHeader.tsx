"use client";

import type { ReactNode } from "react";
import IconPhoto from "next/image";
import Link from "next/link";
import { IconMapPin, IconPhone, IconShoppingBag } from "@tabler/icons-react";
import { FoodKingMobileNavButton } from "@/components/FoodKingMobileNav";
import { PublicAccountNav } from "@/components/PublicAccountNav";

const HERO_LOGO_SRC = "/images/bloom-logo.png";

/** Misma barra superior que en la home (contacto rápido). */
const CONTACT = {
  address: "Almirante Brown 2005",
  city: "Mar del Plata, Argentina",
  email: "reservas@bloom.com",
  phoneDisplay: "+54 9 223 123-4567",
  phoneHref: "tel:+5492231234567",
  hours: "Lun–Dom · 08:00–22:00",
};

export type SiteHeaderProps = {
  /** IconHome: sombra al hacer scroll. Otras páginas: false o según scroll. */
  scrolled?: boolean;
  onMobileNavOpen: () => void;
  activeNav?: "home" | "menu" | "about" | "reservations" | null;
  /** Menú / QR: color de acento para ítems activos y carrito */
  accentColor?: string;
  /** Reemplaza Pedir ahora + Equipo (p. ej. categorías, mesa en /menu). */
  menuExtras?: ReactNode;
  /** Solo en /menu: botón carrito con badge */
  showCartButton?: boolean;
  cartCount?: number;
  onCartOpen?: () => void;
};

/**
 * Barra verde de contacto + cabecera sticky (logo, nav xl, móvil, cuenta).
 * Toda la posición sticky vive aquí.
 */
export function SiteHeader({
  scrolled = false,
  onMobileNavOpen,
  activeNav = null,
  accentColor = "#7a765a",
  menuExtras,
  showCartButton = false,
  cartCount = 0,
  onCartOpen,
}: SiteHeaderProps) {
  const navMuted = activeNav != null && activeNav !== "home";

  const linkHome =
    activeNav === "home" ? (
      <span className="text-bloom-600">Inicio</span>
    ) : (
      <Link
        href="/"
        className={navMuted ? "hover:opacity-80 transition-opacity" : "hover:text-bloom-600 transition-colors"}
        style={navMuted ? { color: accentColor } : undefined}
      >
        Inicio
      </Link>
    );

  const linkMenu =
    activeNav === "menu" ? (
      <span className="font-bold text-bloom-600" style={{ color: accentColor }}>
        Menú
      </span>
    ) : (
      <Link href="/menu" className="hover:text-bloom-600 transition-colors">
        Menú
      </Link>
    );

  const linkAbout =
    activeNav === "about" ? (
      <span className="text-bloom-600">Nosotros</span>
    ) : (
      <Link href="/about" className="hover:text-bloom-600 transition-colors">
        Nosotros
      </Link>
    );

  const linkRes =
    activeNav === "reservations" ? (
      <span className="text-bloom-600">Reservas</span>
    ) : (
      <Link href="/reservations" className="hover:text-bloom-600 transition-colors">
        Reservas
      </Link>
    );

  return (
    <div className="sticky top-0 z-50">
      <div className="bg-english-800 text-bloom-cream text-[11px] sm:text-sm font-semibold border-b border-english-900/60">
        <div className="container mx-auto px-4 py-2.5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          <div className="flex flex-col gap-1.5 min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1">
            <span className="inline-flex items-start gap-1.5 min-w-0">
              <IconMapPin size={14} className="shrink-0 mt-0.5 text-bloom-gold" />
              <span className="leading-snug">
                {CONTACT.address}, {CONTACT.city}
              </span>
            </span>
            <a
              href={`mailto:${CONTACT.email}`}
              className="hover:underline truncate text-left sm:max-w-none text-bloom-cream/95"
            >
              {CONTACT.email}
            </a>
            <span className="text-bloom-cream/85 sm:text-bloom-cream/90">{CONTACT.hours}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 sm:justify-end shrink-0">
            <a
              href={CONTACT.phoneHref}
              className="inline-flex items-center gap-1.5 font-bold hover:underline hover:text-bloom-gold"
            >
              <IconPhone size={14} className="shrink-0" />
              <span className="whitespace-nowrap">{CONTACT.phoneDisplay}</span>
            </a>
            <Link href="/about" className="hover:underline font-bold hover:text-bloom-gold">
              Contacto
            </Link>
          </div>
        </div>
      </div>

      <header
        className={`transition-all duration-[450ms] border-b border-black/[0.08] ${
          scrolled ? "bg-white/72 shadow-sm" : "bg-white/85"
        }`}
        style={{ backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)" } as React.CSSProperties}
      >
        <div className="mx-auto w-full max-w-[1200px] px-6 flex items-center justify-between gap-4 h-[72px]">
          <Link href="/" className="flex items-center shrink-0 min-w-0">
            <IconPhoto
              src={HERO_LOGO_SRC}
              alt="Bloom Coffee & More"
              width={168}
              height={56}
              className="h-9 sm:h-10 w-auto max-w-[min(168px,42vw)] object-contain object-left"
              priority
            />
          </Link>
          <nav className="hidden xl:flex items-center gap-10 text-[13px] font-medium text-ink-500">
            {linkHome}
            {linkMenu}
            {linkAbout}
            {linkRes}
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <FoodKingMobileNavButton onOpen={onMobileNavOpen} />
            {menuExtras ?? (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/menu"
                  className="hidden sm:inline-flex items-center gap-2 rounded-full bg-ink-800 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-ink-700 transition-colors whitespace-nowrap"
                >
                  Pedí ahora
                </Link>
                <PublicAccountNav />
              </div>
            )}
            {menuExtras != null && showCartButton ? (
              <button
                type="button"
                onClick={onCartOpen}
                className="relative inline-flex items-center justify-center p-2.5 rounded-full text-white font-bold shadow-md hover:opacity-95 transition-opacity"
                style={{ backgroundColor: accentColor }}
                aria-label="Abrir carrito"
              >
                <IconShoppingBag size={20} strokeWidth={2.5} />
                {cartCount > 0 ? (
                  <span
                    className="absolute -top-1 -right-1 text-[10px] font-black min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full border-2 border-white bg-[#c4b896] text-[#1a3028]"
                  >
                    {cartCount}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        </div>
      </header>
    </div>
  );
}
