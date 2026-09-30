"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ClipboardList,
  Cog,
  ExternalLink,
  Gift,
  House,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessageSquareText,
  Package,
  PawPrint,
  ShieldCheck,
  Stethoscope,
  Tags,
  Truck,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { adminPath, VET_BASE, INTEGRATIONS } from "@/lib/vet/config/integrations";
import { can, ROLE_LABEL, type Permission } from "@/lib/vet/domain/permissions";
import { useSession, useStaffRole } from "@/lib/vet/client/session";
import { useCollection, useSettings } from "@/lib/vet/client/store";
import { Button, Sheet } from "../ui/primitives";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  perm: Permission;
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Día a día",
    items: [
      { href: "", label: "Inicio", icon: House, perm: "dashboard.view" },
      { href: "/pedidos", label: "Pedidos", icon: ClipboardList, perm: "orders.manage" },
      { href: "/turnos", label: "Turnos", icon: CalendarDays, perm: "appointments.manage" },
      { href: "/clientes", label: "Clientes", icon: UsersRound, perm: "customers.view" },
      { href: "/mascotas", label: "Mascotas", icon: PawPrint, perm: "pets.manage" },
    ],
  },
  {
    title: "Tienda",
    items: [
      { href: "/productos", label: "Productos y precios", icon: Package, perm: "stock.manage" },
      { href: "/stock", label: "Stock", icon: Boxes, perm: "stock.manage" },
      { href: "/categorias", label: "Categorías", icon: Tags, perm: "products.manage" },
      { href: "/servicios", label: "Servicios", icon: Stethoscope, perm: "services.manage" },
      { href: "/envios", label: "Envíos", icon: Truck, perm: "settings.manage" },
    ],
  },
  {
    title: "Crecer",
    items: [
      { href: "/promociones", label: "Promociones y combos", icon: Megaphone, perm: "promotions.manage" },
      { href: "/fidelizacion", label: "Fidelización", icon: Gift, perm: "promotions.manage" },
      { href: "/automatizaciones", label: "Automatizaciones", icon: Zap, perm: "automations.manage" },
      { href: "/estadisticas", label: "Estadísticas", icon: BarChart3, perm: "stats.view" },
      { href: "/contenido", label: "Contenido y reseñas", icon: MessageSquareText, perm: "content.manage" },
    ],
  },
  {
    title: "Negocio",
    items: [{ href: "/configuracion", label: "Configuración", icon: Cog, perm: "settings.manage" }],
  },
];

const MOBILE_TABS: NavItem[] = [
  { href: "", label: "Inicio", icon: House, perm: "dashboard.view" },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList, perm: "orders.manage" },
  { href: "/turnos", label: "Turnos", icon: CalendarDays, perm: "appointments.manage" },
  { href: "/productos", label: "Productos", icon: Package, perm: "stock.manage" },
];

function active(pathname: string, href: string) {
  return href === "" ? pathname === adminPath() : pathname.startsWith(adminPath(href));
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? adminPath();
  const { role, name, ready, demo } = useStaffRole();
  const setStaff = useSession((s) => s.setStaff);
  const settings = useSettings();
  const orders = useCollection("orders", Boolean(role));
  const appts = useCollection("appointments", Boolean(role));
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);

  if (!ready) return <div className="grid min-h-dvh place-items-center text-sm text-neutral-500">Cargando panel…</div>;

  if (!role) {
    return (
      <div className="grid min-h-dvh place-items-center bg-vet-surface p-4">
        <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <img src="/veterinaria/brand/mark.svg" alt="" className="size-12" />
            <div>
              <p className="font-vet-display text-xl font-extrabold">{settings.business.name}</p>
              <p className="text-sm text-neutral-500">Panel de administración</p>
            </div>
          </div>
          {demo ? (
            <>
              <p className="mt-5 rounded-2xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
                <strong>Modo de prueba.</strong> Elegí con qué rol entrar para ver los permisos. Con la base de datos conectada, el ingreso es con usuario y contraseña, y los permisos los controla el servidor.
              </p>
              <div className="mt-4 grid gap-2">
                <Button size="lg" onClick={() => setStaff("ADMIN", "Dueña")}>
                  <ShieldCheck className="size-5" /> Entrar como Administración
                </Button>
                <Button size="lg" variant="outline" onClick={() => setStaff("EMPLEADO", "Empleado/a")}>
                  Entrar como Empleado/a
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm text-neutral-600">Tu usuario no tiene acceso al panel. Pedile a la administración que te habilite.</p>
          )}
          <Link href={VET_BASE} className="mt-4 block text-center text-sm font-semibold text-vet-primary-dark">Volver a la tienda</Link>
        </div>
      </div>
    );
  }

  const newOrders = orders.items.filter((o) => o.status === "nuevo" || o.status === "pago_pendiente").length;
  const pendingAppts = appts.items.filter((a) => a.status === "pendiente" && a.date >= new Date().toISOString().slice(0, 10)).length;
  const badge = (href: string) => (href === "/pedidos" ? newOrders : href === "/turnos" ? pendingAppts : 0);
  const allowed = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(role, i.perm)) })).filter((g) => g.items.length);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-black/[0.06] bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/veterinaria/brand/mark.svg" alt="" className="size-10" />
          <div className="min-w-0">
            <p className="truncate font-vet-display text-[17px] font-extrabold">{settings.business.name}</p>
            <p className="text-xs text-neutral-500">{ROLE_LABEL[role]}</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Panel">
          {allowed.map((g) => (
            <div key={g.title} className="mt-3">
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400">{g.title}</p>
              {g.items.map((i) => (
                <Link key={i.href} href={adminPath(i.href)} aria-current={active(pathname, i.href) ? "page" : undefined} className={cn("flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition", active(pathname, i.href) ? "bg-vet-tint text-vet-primary-dark" : "text-neutral-700 hover:bg-black/[0.04]")}>
                  <i.icon className="size-[18px]" /> <span className="flex-1">{i.label}</span>
                  {badge(i.href) > 0 && <span className="rounded-full bg-vet-accent px-1.5 text-[11px] font-bold text-white">{badge(i.href)}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-black/[0.06] p-3">
          <Link href={VET_BASE} target="_blank" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-neutral-700 hover:bg-black/[0.04]">
            <ExternalLink className="size-4" /> Ver tienda
          </Link>
          {demo && (
            <button type="button" onClick={() => setStaff(null)} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-neutral-700 hover:bg-black/[0.04]">
              <LogOut className="size-4" /> Cambiar de rol ({name})
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        {/* Barra superior móvil */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-black/[0.06] bg-white/90 px-4 backdrop-blur-xl lg:hidden">
          <img src="/veterinaria/brand/mark.svg" alt="" className="size-8" />
          <p className="flex-1 truncate font-vet-display text-[15px] font-extrabold">Panel · {settings.business.name}</p>
          {demo && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">DEMO</span>}
          <Link href={adminPath("/automatizaciones")} className="grid size-10 place-items-center rounded-full hover:bg-black/5" aria-label="Recordatorios y avisos">
            <Bell className="size-5" />
          </Link>
        </header>

        {INTEGRATIONS.dataSource === "demo" && (
          <p className="hidden bg-amber-50 px-6 py-2 text-xs text-amber-900 lg:block">
            Modo de prueba: los cambios se guardan solo en este navegador. Para operar con datos reales, conectá la base de datos (ver docs/veterinaria/GUIA.md).
          </p>
        )}

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-8">{children}</main>

        {/* Barra inferior móvil */}
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.06] bg-white/95 backdrop-blur-xl vet-safe-bottom lg:hidden" aria-label="Panel">
          <ul className="grid h-[66px] grid-cols-5">
            {MOBILE_TABS.filter((t) => can(role, t.perm)).map((t) => (
              <li key={t.href}>
                <Link href={adminPath(t.href)} aria-current={active(pathname, t.href) ? "page" : undefined} className="relative flex h-full flex-col items-center justify-center gap-0.5">
                  <span className={cn("grid h-8 w-12 place-items-center rounded-full", active(pathname, t.href) ? "bg-vet-tint text-vet-primary-dark" : "text-neutral-500")}>
                    <t.icon className="size-[21px]" />
                  </span>
                  <span className={cn("text-[11px] font-semibold", active(pathname, t.href) ? "text-vet-primary-dark" : "text-neutral-500")}>{t.label}</span>
                  {badge(t.href) > 0 && <span className="absolute right-[20%] top-1.5 grid min-w-5 place-items-center rounded-full bg-vet-accent px-1 text-[10px] font-bold text-white ring-2 ring-white">{badge(t.href)}</span>}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => setMore(true)} className="flex h-full w-full flex-col items-center justify-center gap-0.5" aria-haspopup="dialog">
                <span className="grid h-8 w-12 place-items-center rounded-full text-neutral-500"><LayoutGrid className="size-[21px]" /></span>
                <span className="text-[11px] font-semibold text-neutral-500">Más</span>
              </button>
            </li>
          </ul>
        </nav>

        <Sheet open={more} onClose={() => setMore(false)} title="Todas las secciones">
          <div className="space-y-4 pb-2">
            {allowed.map((g) => (
              <div key={g.title}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">{g.title}</p>
                <div className="grid grid-cols-3 gap-2">
                  {g.items.map((i) => (
                    <Link key={i.href} href={adminPath(i.href)} className={cn("flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl p-2 text-center text-[12px] font-semibold ring-1", active(pathname, i.href) ? "bg-vet-tint text-vet-primary-dark ring-vet-primary/30" : "bg-white ring-black/[0.06]")}>
                      <i.icon className="size-5" /> {i.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <Link href={VET_BASE} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-vet-surface text-sm font-semibold"><ExternalLink className="size-4" /> Ver tienda</Link>
              {demo && <button type="button" onClick={() => setStaff(null)} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-vet-surface text-sm font-semibold"><LogOut className="size-4" /> Cambiar rol</button>}
            </div>
          </div>
        </Sheet>
      </div>
    </div>
  );
}

/** Bloquea una página si el rol no tiene permiso. */
export function RequirePermission({ perm, children }: { perm: Permission; children: React.ReactNode }) {
  const { role } = useStaffRole();
  if (!can(role, perm)) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-black/5">
        <ShieldCheck className="mx-auto size-10 text-neutral-400" />
        <p className="mt-3 font-semibold">No tenés permiso para ver esta sección</p>
        <p className="mt-1 text-sm text-neutral-500">Pedile acceso a la administración.</p>
      </div>
    );
  }
  return <>{children}</>;
}
