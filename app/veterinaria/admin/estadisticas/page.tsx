"use client";
import { useEffect, useMemo, useState } from "react";
import type { AnalyticsEvent } from "@/lib/vet/types";
import { INTEGRATIONS } from "@/lib/vet/config/integrations";
import { formatMoney } from "@/lib/vet/domain/format";
import { PAYMENT_LABEL } from "@/lib/vet/domain/labels";
import { customerSummary, newCustomersByWeek, paymentMix, salesByCategory, salesByDay, salesSummary, servicesRanking, topProducts } from "@/lib/vet/domain/stats";
import { useCollection } from "@/lib/vet/client/store";
import { readLocalEvents } from "@/lib/vet/client/analytics";
import { BarChart, HBarList } from "@/components/veterinaria/admin/charts";
import { Chips, PageHeader, Panel, StatCard } from "@/components/veterinaria/admin/ui";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";
import { Skeleton } from "@/components/veterinaria/ui/primitives";

const moneyShort = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`);
const CONTEXT: Record<string, string> = { fab: "Botón flotante", product_card: "Tarjeta de producto", product_buy: "Comprar por WhatsApp", product_consult: "Consultar producto", product_rx: "Farmacia", cart_share: "Enviar carrito", order_confirmation: "Confirmación de pedido", home_quick: "Portada", search_empty: "Búsqueda sin resultados", assistant: "Asistente" };

export default function EstadisticasPage() {
  const [range, setRange] = useState<"7" | "30" | "60">("30");
  const orders = useCollection("orders");
  const products = useCollection("products");
  const categories = useCollection("categories");
  const appts = useCollection("appointments");
  const services = useCollection("services");
  const customers = useCollection("customers");
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  useEffect(() => setEvents(readLocalEvents()), []);
  const days = Number(range);
  const ready = orders.ready && products.ready && categories.ready && appts.ready && services.ready && customers.ready;

  const d = useMemo(() => {
    if (!ready) return null;
    const now = new Date();
    const since = now.getTime() - days * 86_400_000;
    const ev = events.filter((e) => new Date(e.at).getTime() >= since);
    const count = (n: AnalyticsEvent["name"]) => ev.filter((e) => e.name === n).length;
    const searches = new Map<string, number>();
    const wa = new Map<string, number>();
    const views = new Map<string, number>();
    for (const e of ev) {
      if (e.name === "search" && e.props?.q) searches.set(String(e.props.q), (searches.get(String(e.props.q)) ?? 0) + 1);
      if (e.name === "whatsapp_click") wa.set(String(e.props?.context ?? "otro"), (wa.get(String(e.props?.context ?? "otro")) ?? 0) + 1);
      if (e.name === "product_view" && e.props?.productId) views.set(String(e.props.productId), (views.get(String(e.props.productId)) ?? 0) + 1);
    }
    const top = <T,>(m: Map<string, number>, f: (k: string) => T) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ key: f(k), v }));
    return {
      summary: salesSummary(orders.items, now),
      byDay: salesByDay(orders.items, days, now),
      top: topProducts(orders.items, products.items, 10, days, now),
      cats: salesByCategory(orders.items, products.items, categories.items, days, now),
      pay: paymentMix(orders.items, days, now),
      svc: servicesRanking(appts.items, services.items, days, now),
      cust: customerSummary(customers.items, orders.items, days, now),
      newCust: newCustomersByWeek(customers.items, 8, now),
      funnel: [
        { label: "Productos vistos", value: count("product_view") },
        { label: "Agregados al carrito", value: count("add_to_cart") },
        { label: "Inicios de compra", value: count("begin_checkout") },
        { label: "Compras", value: count("purchase") },
      ],
      other: [
        { label: "Búsquedas", value: count("search") },
        { label: "Categorías visitadas", value: count("category_view") },
        { label: "Favoritos agregados", value: count("favorite_add") },
        { label: "Turnos reservados", value: count("appointment_booked") },
        { label: "Clics en WhatsApp", value: count("whatsapp_click") },
        { label: "Cupones usados", value: count("coupon_applied") },
        { label: "Carritos abandonados", value: count("cart_abandoned") },
        { label: "Carritos recuperados", value: count("cart_recovered") },
      ],
      searches: top(searches, (k) => k),
      wa: top(wa, (k) => CONTEXT[k] ?? k),
      views: top(views, (k) => products.items.find((p) => p.id === k)?.name ?? k),
    };
  }, [ready, days, orders.items, products.items, categories.items, appts.items, services.items, customers.items, events]);

  return (
    <RequirePermission perm="stats.view">
      <PageHeader title="Estadísticas" subtitle="Qué se vende, qué se busca y qué está funcionando." actions={<Chips label="Período" value={range} onChange={setRange} options={[{ value: "7", label: "7 días" }, { value: "30", label: "30 días" }, { value: "60", label: "60 días" }]} />} />
      {!d ? <Skeleton className="h-96" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Ventas del período" value={formatMoney(d.byDay.reduce((s, x) => s + x.total, 0))} />
            <StatCard label="Pedidos" value={String(d.byDay.reduce((s, x) => s + x.orders, 0))} />
            <StatCard label="Ticket promedio (30 d)" value={formatMoney(d.summary.month.avgTicket)} />
            <StatCard label="Clientes nuevos" value={String(d.cust.newCount)} hint={`${d.cust.recurringCount} recurrentes en total`} />
          </div>
          <Panel title={`Ventas por día (últimos ${days} días)`}>
            <BarChart title="Ventas por día" data={d.byDay.map((x) => ({ label: x.label, value: x.total, hint: `${x.orders} pedidos` }))} format={moneyShort} height={200} />
          </Panel>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Panel title="Productos más vendidos"><HBarList title="Productos más vendidos" items={d.top.map((t) => ({ label: t.name, value: t.units, hint: formatMoney(t.revenue) }))} format={(v) => `${v} u.`} /></Panel>
            <Panel title="Ventas por categoría"><HBarList title="Ventas por categoría" items={d.cats.map((c) => ({ label: c.name, value: c.total }))} format={formatMoney} /></Panel>
            <Panel title="Servicios más reservados"><HBarList title="Servicios más reservados" items={d.svc.map((s) => ({ label: s.name, value: s.count }))} format={(v) => `${v}`} /></Panel>
            <Panel title="Medios de pago"><HBarList title="Medios de pago" items={d.pay.map((p) => ({ label: PAYMENT_LABEL[p.method as keyof typeof PAYMENT_LABEL] ?? p.method, value: p.count }))} format={(v) => `${v} pedidos`} /></Panel>
            <Panel title="Clientes nuevos por semana"><BarChart title="Clientes nuevos por semana" data={d.newCust.map((x) => ({ label: x.label, value: x.count }))} height={140} /></Panel>
            <Panel title="Embudo de compra">
              <HBarList title="Embudo de compra" items={d.funnel} format={(v) => String(v)} empty="Todavía no hay visitas registradas en este dispositivo." />
              <p className="mt-3 text-xs text-neutral-500">{INTEGRATIONS.dataSource === "demo" ? "Modo de prueba: se muestran los eventos de este navegador." : "Eventos de todos los visitantes (tabla vet_events)."}{INTEGRATIONS.googleAnalyticsId ? " También se envían a Google Analytics." : ""}</p>
            </Panel>
            <Panel title="Lo que más buscan"><HBarList title="Búsquedas" items={d.searches.map((s) => ({ label: s.key, value: s.v }))} format={(v) => `${v}`} empty="Sin búsquedas registradas" /></Panel>
            <Panel title="Productos más vistos"><HBarList title="Productos más vistos" items={d.views.map((s) => ({ label: s.key, value: s.v }))} format={(v) => `${v} vistas`} empty="Sin vistas registradas" /></Panel>
            <Panel title="Clics en WhatsApp por lugar"><HBarList title="WhatsApp" items={d.wa.map((s) => ({ label: s.key, value: s.v }))} format={(v) => `${v}`} empty="Sin clics registrados" /></Panel>
            <Panel title="Otras métricas">
              <dl className="grid grid-cols-2 gap-2">
                {d.other.map((o) => (
                  <div key={o.label} className="rounded-2xl bg-vet-surface p-3"><dt className="text-xs text-neutral-500">{o.label}</dt><dd className="text-xl font-extrabold tabular-nums">{o.value}</dd></div>
                ))}
              </dl>
            </Panel>
          </div>
        </div>
      )}
    </RequirePermission>
  );
}
