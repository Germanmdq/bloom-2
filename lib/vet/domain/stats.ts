/**
 * Estadísticas del negocio calculadas a partir de pedidos, turnos, clientes y productos.
 * "Ventas" = pedidos no cancelados (incluye pago pendiente, para ver la demanda real).
 */
import type { Appointment, Category, Coupon, Customer, Order, Product, Service } from "../types";
import { addDays, startOfDay, toDateKey, WEEKDAY_SHORT } from "./dates";
import { getStockStatus, totalStock } from "./stock";

const sold = (o: Order) => o.status !== "cancelado";

function sumTotal(orders: Order[]) {
  return orders.reduce((s, o) => s + o.totals.total, 0);
}

export interface PeriodSummary {
  total: number;
  orders: number;
  avgTicket: number;
  /** Variación vs. el período anterior equivalente (0.12 = +12%). null si no hay base. */
  change: number | null;
}

function period(orders: Order[], from: Date, to: Date, prevFrom: Date): PeriodSummary {
  const cur = orders.filter((o) => sold(o) && new Date(o.createdAt) >= from && new Date(o.createdAt) < to);
  const prev = orders.filter((o) => sold(o) && new Date(o.createdAt) >= prevFrom && new Date(o.createdAt) < from);
  const total = sumTotal(cur);
  const prevTotal = sumTotal(prev);
  return {
    total,
    orders: cur.length,
    avgTicket: cur.length ? Math.round(total / cur.length) : 0,
    change: prevTotal > 0 ? (total - prevTotal) / prevTotal : null,
  };
}

export function salesSummary(orders: Order[], now = new Date()) {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekStart = addDays(today, -6);
  const monthStart = addDays(today, -29);
  return {
    today: period(orders, today, tomorrow, addDays(today, -1)),
    week: period(orders, weekStart, tomorrow, addDays(weekStart, -7)),
    month: period(orders, monthStart, tomorrow, addDays(monthStart, -30)),
  };
}

export function salesByDay(orders: Order[], days = 7, now = new Date()) {
  const out: { key: string; label: string; total: number; orders: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(startOfDay(now), -i);
    const key = toDateKey(d);
    const dayOrders = orders.filter((o) => sold(o) && toDateKey(new Date(o.createdAt)) === key);
    out.push({ key, label: days <= 7 ? WEEKDAY_SHORT[d.getDay()] : String(d.getDate()), total: sumTotal(dayOrders), orders: dayOrders.length });
  }
  return out;
}

export function topProducts(orders: Order[], products: Product[], limit = 5, sinceDays = 30, now = new Date()) {
  const since = addDays(now, -sinceDays).getTime();
  const map = new Map<string, { id: string; name: string; units: number; revenue: number }>();
  for (const o of orders) {
    if (!sold(o) || new Date(o.createdAt).getTime() < since) continue;
    for (const it of o.items) {
      const id = it.productId ?? it.comboId ?? it.name;
      const cur = map.get(id) ?? { id, name: products.find((p) => p.id === it.productId)?.name ?? it.name, units: 0, revenue: 0 };
      cur.units += it.quantity;
      cur.revenue += it.unitPrice * it.quantity;
      map.set(id, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, limit);
}

export function salesByCategory(orders: Order[], products: Product[], categories: Category[], sinceDays = 30, now = new Date()) {
  const since = addDays(now, -sinceDays).getTime();
  const catOf = new Map(products.map((p) => [p.id, p.categoryId]));
  const map = new Map<string, number>();
  for (const o of orders) {
    if (!sold(o) || new Date(o.createdAt).getTime() < since) continue;
    for (const it of o.items) {
      const cat = (it.productId && catOf.get(it.productId)) || "combos";
      map.set(cat, (map.get(cat) ?? 0) + it.unitPrice * it.quantity);
    }
  }
  return [...map.entries()]
    .map(([id, total]) => ({ id, name: categories.find((c) => c.id === id)?.name ?? (id === "combos" ? "Combos" : id), total }))
    .sort((a, b) => b.total - a.total);
}

export function stockAlerts(products: Product[]) {
  const low: Product[] = [];
  const out: Product[] = [];
  let untracked = 0;
  for (const p of products) {
    if (!p.visible) continue;
    const s = getStockStatus(p);
    if (s === "poco") low.push(p);
    else if (s === "sin_stock") out.push(p);
    else if (s === "sin_control") untracked++;
  }
  low.sort((a, b) => (totalStock(a) ?? 0) - (totalStock(b) ?? 0));
  return { low, out, untracked };
}

export function appointmentSummary(appointments: Appointment[], now = new Date()) {
  const today = toDateKey(now);
  const active = appointments.filter((a) => a.status === "pendiente" || a.status === "confirmado");
  const todays = active.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = active.filter((a) => a.date > today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const pending = active.filter((a) => a.status === "pendiente" && a.date >= today);
  return { today: todays, upcoming, pending };
}

export function servicesRanking(appointments: Appointment[], services: Service[], sinceDays = 60, now = new Date()) {
  const since = toDateKey(addDays(now, -sinceDays));
  const map = new Map<string, number>();
  for (const a of appointments) {
    if (a.status === "cancelado" || a.date < since) continue;
    map.set(a.serviceId, (map.get(a.serviceId) ?? 0) + 1);
  }
  return services.map((s) => ({ id: s.id, name: s.name, count: map.get(s.id) ?? 0 })).sort((a, b) => b.count - a.count);
}

export function customerSummary(customers: Customer[], orders: Order[], sinceDays = 30, now = new Date()) {
  const since = addDays(now, -sinceDays).getTime();
  const newOnes = customers.filter((c) => new Date(c.createdAt).getTime() >= since);
  const ordersBy = new Map<string, number>();
  for (const o of orders) if (sold(o) && o.customerId) ordersBy.set(o.customerId, (ordersBy.get(o.customerId) ?? 0) + 1);
  const recurring = customers.filter((c) => (ordersBy.get(c.id) ?? 0) >= 2);
  return { total: customers.length, newCount: newOnes.length, recurringCount: recurring.length, ordersBy };
}

export function newCustomersByWeek(customers: Customer[], weeks = 8, now = new Date()) {
  const out: { label: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = addDays(startOfDay(now), -i * 7 + 1);
    const start = addDays(end, -7);
    out.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      count: customers.filter((c) => {
        const t = new Date(c.createdAt);
        return t >= start && t < end;
      }).length,
    });
  }
  return out;
}

export function activePromotions(coupons: Coupon[], now = new Date()) {
  const today = toDateKey(now);
  return coupons.filter((c) => c.active && (!c.endsAt || c.endsAt.slice(0, 10) >= today) && (!c.startsAt || c.startsAt.slice(0, 10) <= today));
}

export function paymentMix(orders: Order[], sinceDays = 30, now = new Date()) {
  const since = addDays(now, -sinceDays).getTime();
  const map = new Map<string, number>();
  for (const o of orders) if (sold(o) && new Date(o.createdAt).getTime() >= since) map.set(o.paymentMethod, (map.get(o.paymentMethod) ?? 0) + 1);
  return [...map.entries()].map(([method, count]) => ({ method, count }));
}
