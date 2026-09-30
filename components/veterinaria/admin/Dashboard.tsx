"use client";
import Link from "next/link";
import { useMemo } from "react";
import { BarChart3, Cake, CalendarPlus, ChevronRight, ClipboardPlus, PackagePlus, TicketPercent, TriangleAlert, UserPlus } from "lucide-react";
import { adminPath } from "@/lib/vet/config/integrations";
import { formatDate, formatMoney } from "@/lib/vet/domain/format";
import { ORDER_STATUS, APPOINTMENT_STATUS } from "@/lib/vet/domain/labels";
import { activePromotions, appointmentSummary, customerSummary, newCustomersByWeek, salesByCategory, salesByDay, salesSummary, servicesRanking, stockAlerts, topProducts } from "@/lib/vet/domain/stats";
import { upcomingBirthdays } from "@/lib/vet/domain/automations";
import { totalStock } from "@/lib/vet/domain/stock";
import { can } from "@/lib/vet/domain/permissions";
import { useCollection } from "@/lib/vet/client/store";
import { useStaffRole } from "@/lib/vet/client/session";
import { BarChart, HBarList } from "./charts";
import { PageHeader, Panel, StatCard } from "./ui";
import { Badge, Skeleton } from "../ui/primitives";

const moneyShort = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`);

export function Dashboard() {
  const { role, name } = useStaffRole();
  const orders = useCollection("orders");
  const products = useCollection("products");
  const categories = useCollection("categories");
  const appts = useCollection("appointments");
  const services = useCollection("services");
  const customers = useCollection("customers");
  const coupons = useCollection("coupons");
  const pets = useCollection("pets");
  const ready = orders.ready && products.ready && appts.ready && services.ready && customers.ready && categories.ready;

  const data = useMemo(() => {
    if (!ready) return null;
    const now = new Date();
    return {
      sales: salesSummary(orders.items, now),
      week: salesByDay(orders.items, 7, now),
      top: topProducts(orders.items, products.items, 5, 30, now),
      cats: salesByCategory(orders.items, products.items, categories.items, 30, now).slice(0, 6),
      stock: stockAlerts(products.items),
      ap: appointmentSummary(appts.items, now),
      svc: servicesRanking(appts.items, services.items, 60, now),
      cust: customerSummary(customers.items, orders.items, 30, now),
      newCust: newCustomersByWeek(customers.items, 8, now),
      promos: activePromotions(coupons.items, now),
      birthdays: upcomingBirthdays(pets.items, now, 7),
      recent: [...orders.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
    };
  }, [ready, orders.items, products.items, appts.items, services.items, customers.items, coupons.items, pets.items, categories.items]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const svcName = (id: string) => services.items.find((s) => s.id === id)?.name ?? "Servicio";

  const quick = [
    { href: adminPath("/productos/nuevo"), label: "Nuevo producto", icon: PackagePlus, perm: "products.manage" as const },
    { href: adminPath("/pedidos?nuevo=1"), label: "Nuevo pedido", icon: ClipboardPlus, perm: "orders.manage" as const },
    { href: adminPath("/turnos?nuevo=1"), label: "Nuevo turno", icon: CalendarPlus, perm: "appointments.manage" as const },
    { href: adminPath("/promociones?nuevo=1"), label: "Nueva promoción", icon: TicketPercent, perm: "promotions.manage" as const },
    { href: adminPath("/clientes?nuevo=1"), label: "Nuevo cliente", icon: UserPlus, perm: "customers.view" as const },
    { href: adminPath("/estadisticas"), label: "Ver estadísticas", icon: BarChart3, perm: "stats.view" as const },
    { href: adminPath("/productos?stock=alerta"), label: "Poco stock", icon: TriangleAlert, perm: "stock.manage" as const },
  ].filter((q) => can(role, q.perm));

  return (
    <div>
      <PageHeader title={`${greeting}, ${name || "equipo"}`} subtitle={formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })} />

      <nav aria-label="Acciones rápidas" className="vet-scroll-x -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-7">
        {quick.map((q) => (
          <Link key={q.label} href={q.href} className="flex w-[104px] shrink-0 flex-col items-center gap-2 rounded-3xl bg-white p-3 text-center ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto">
            <span className={`grid size-11 place-items-center rounded-2xl ${q.label === "Poco stock" ? "bg-amber-50 text-amber-700" : "bg-vet-tint text-vet-primary"}`}>
              <q.icon className="size-5" />
            </span>
            <span className="text-[12px] font-bold leading-tight">{q.label}</span>
          </Link>
        ))}
      </nav>

      {!data ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          {can(role, "stats.view") && (
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Ventas de hoy" value={formatMoney(data.sales.today.total)} change={data.sales.today.change} hint={`${data.sales.today.orders} pedidos`} />
              <StatCard label="Últimos 7 días" value={formatMoney(data.sales.week.total)} change={data.sales.week.change} hint="vs. semana anterior" />
              <StatCard label="Últimos 30 días" value={formatMoney(data.sales.month.total)} change={data.sales.month.change} hint={`${data.sales.month.orders} pedidos`} />
              <StatCard label="Ticket promedio" value={formatMoney(data.sales.month.avgTicket)} hint="últimos 30 días" />
            </div>
          )}

          {/* Alertas */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Pedidos por atender" value={String(orders.items.filter((o) => ["nuevo", "pago_pendiente", "pagado", "preparando"].includes(o.status)).length)} hint="nuevos, a cobrar o a preparar" href={adminPath("/pedidos")} />
            <StatCard label="Turnos hoy" value={String(data.ap.today.length)} hint={`${data.ap.pending.length} por confirmar`} href={adminPath("/turnos")} tone={data.ap.pending.length ? "warn" : "default"} />
            <StatCard label="Stock" value={`${data.stock.low.length + data.stock.out.length} alertas`} hint={`${data.stock.out.length} sin stock · ${data.stock.untracked} sin cargar`} href={adminPath("/productos?stock=alerta")} tone={data.stock.out.length ? "danger" : data.stock.low.length ? "warn" : "default"} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {can(role, "stats.view") && (
              <Panel title="Ventas últimos 7 días" className="lg:col-span-2">
                <BarChart title="Ventas últimos 7 días" data={data.week.map((d) => ({ label: d.label, value: d.total, hint: `${d.orders} pedidos` }))} format={moneyShort} highlightLast />
              </Panel>
            )}
            <Panel title="Turnos de hoy" action={<Link href={adminPath("/turnos")} className="text-sm font-semibold text-vet-primary-dark">Agenda</Link>}>
              {data.ap.today.length ? (
                <ul className="space-y-2">
                  {data.ap.today.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-vet-surface px-3 py-2">
                      <span className="w-12 font-bold tabular-nums">{a.time}</span>
                      <span className="min-w-0 flex-1 text-sm"><span className="block truncate font-semibold">{a.petName ?? a.customerName}</span><span className="block truncate text-xs text-neutral-500">{svcName(a.serviceId)}</span></span>
                      <Badge tone={APPOINTMENT_STATUS[a.status].tone}>{APPOINTMENT_STATUS[a.status].label}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-sm text-neutral-500">No hay turnos hoy.</p>
              )}
              {data.ap.upcoming.length > 0 && (
                <>
                  <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-neutral-400">Próximos</p>
                  <ul className="space-y-1.5 text-sm">
                    {data.ap.upcoming.slice(0, 4).map((a) => (
                      <li key={a.id} className="flex justify-between gap-2"><span className="truncate">{a.petName} · {svcName(a.serviceId)}</span><span className="shrink-0 tabular-nums text-neutral-500">{formatDate(a.date, { weekday: "short", day: "numeric" })} {a.time}</span></li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {can(role, "stats.view") && (
              <Panel title="Productos más vendidos (30 días)">
                <HBarList title="Productos más vendidos" items={data.top.map((t) => ({ label: t.name, value: t.units, hint: formatMoney(t.revenue) }))} format={(v) => `${v} u.`} />
              </Panel>
            )}
            {can(role, "stats.view") && (
              <Panel title="Categorías con más ventas">
                <HBarList title="Categorías con más ventas" items={data.cats.map((c) => ({ label: c.name, value: c.total }))} format={formatMoney} />
              </Panel>
            )}
            <Panel title="Stock para revisar" action={<Link href={adminPath("/productos?stock=alerta")} className="text-sm font-semibold text-vet-primary-dark">Ver</Link>}>
              {data.stock.out.length + data.stock.low.length ? (
                <ul className="space-y-1.5 text-sm">
                  {[...data.stock.out, ...data.stock.low].slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{totalStock(p) === 0 ? "🔴" : "🟡"} {p.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{totalStock(p)} u.</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-2 text-sm text-neutral-600">
                  <p>Sin alertas de stock.</p>
                  {data.stock.untracked > 0 && (
                    <p className="mt-2 rounded-2xl bg-vet-tint p-3 text-vet-primary-dark">
                      <strong>{data.stock.untracked} productos</strong> todavía no tienen stock cargado. <Link href={adminPath("/stock")} className="font-semibold underline">Cargar stock</Link> para activar las alertas.
                    </p>
                  )}
                </div>
              )}
            </Panel>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Panel title="Pedidos recientes" className="lg:col-span-2" action={<Link href={adminPath("/pedidos")} className="text-sm font-semibold text-vet-primary-dark">Ver todos</Link>}>
              <ul className="divide-y divide-black/5">
                {data.recent.map((o) => (
                  <li key={o.id}>
                    <Link href={adminPath(`/pedidos?id=${o.id}`)} className="flex items-center gap-3 py-2.5">
                      <span className="w-14 text-sm font-bold tabular-nums">#{o.number}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{o.customerName}</span><span className="block text-xs text-neutral-500">{formatDate(o.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></span>
                      <span className="text-right"><span className="block text-sm font-bold tabular-nums">{formatMoney(o.totals.total)}</span><Badge tone={ORDER_STATUS[o.status].tone === "red" ? "red" : ORDER_STATUS[o.status].tone === "gray" ? "gray" : "teal"}>{ORDER_STATUS[o.status].label}</Badge></span>
                      <ChevronRight className="size-4 text-neutral-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
            <div className="grid gap-3">
              <Panel title="Clientes">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-2xl bg-vet-surface p-3"><p className="text-2xl font-extrabold tabular-nums">{data.cust.newCount}</p><p className="text-xs text-neutral-500">nuevos (30 días)</p></div>
                  <div className="rounded-2xl bg-vet-surface p-3"><p className="text-2xl font-extrabold tabular-nums">{data.cust.recurringCount}</p><p className="text-xs text-neutral-500">recurrentes</p></div>
                </div>
                <div className="mt-3"><BarChart title="Clientes nuevos por semana" data={data.newCust.map((d) => ({ label: d.label, value: d.count }))} height={90} /></div>
              </Panel>
              <Panel title="Promociones activas" action={<Link href={adminPath("/promociones")} className="text-sm font-semibold text-vet-primary-dark">Gestionar</Link>}>
                <p className="text-2xl font-extrabold">{data.promos.length}</p>
                <p className="text-xs text-neutral-500">{data.promos.slice(0, 3).map((p) => p.code ?? p.title).join(" · ") || "Ninguna activa"}</p>
              </Panel>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Panel title="Servicios más reservados (60 días)">
              <HBarList title="Servicios más reservados" items={data.svc.map((s) => ({ label: s.name, value: s.count }))} format={(v) => `${v} turnos`} />
            </Panel>
            <Panel title="Cumpleaños de mascotas (7 días)" action={<Link href={adminPath("/automatizaciones")} className="text-sm font-semibold text-vet-primary-dark">Saludar</Link>}>
              {data.birthdays.length ? (
                <ul className="space-y-2 text-sm">
                  {data.birthdays.map(({ pet, inDays }) => (
                    <li key={pet.id} className="flex items-center gap-2"><Cake className="size-4 text-vet-accent" /> <span className="flex-1 font-semibold">{pet.name}</span><span className="text-neutral-500">{inDays === 0 ? "¡Hoy!" : `en ${inDays} días`}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-sm text-neutral-500">No hay cumpleaños esta semana.</p>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
