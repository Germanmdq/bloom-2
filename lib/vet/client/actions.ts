"use client";
/**
 * Acciones de negocio del lado del cliente. En modo demo se ejecutan en el
 * navegador; en modo supabase las operaciones sensibles (crear pedidos y
 * turnos) pasan por rutas de servidor que revalidan precios, stock y
 * disponibilidad.
 */
import type { Appointment, Customer, Order, OrderStatus, Pet, Product, StockMovementType, WaitlistEntry } from "../types";
import type { CartLine } from "../domain/pricing";
import { computeCart } from "../domain/pricing";
import { applyStockMovement } from "../domain/stock";
import { getCustomerTier } from "../domain/loyalty";
import { getSlots } from "../domain/availability";
import { uid } from "../domain/format";
import { INTEGRATIONS } from "../config/integrations";
import { useVetData } from "./store";
import { useSession } from "./session";
import { track } from "./analytics";

const st = () => useVetData.getState();
const nowIso = () => new Date().toISOString();

async function load() {
  await st().ensure(["products", "combos", "coupons", "shippingZones", "orders", "customers", "services", "appointments", "blockedSlots"]);
  await st().loadSettings();
  return st().data;
}

// ─────────────────────────── Clientes ───────────────────────────

export async function findOrCreateCustomer(input: { name: string; phone: string; email?: string; address?: Customer["address"]; marketingOptIn?: boolean }): Promise<Customer> {
  await st().ensure(["customers"]);
  const digits = input.phone.replace(/\D/g, "").slice(-8);
  const existing = (st().data.customers ?? []).find((c) => c.phone.replace(/\D/g, "").slice(-8) === digits);
  if (existing) {
    const merged: Customer = {
      ...existing,
      name: input.name || existing.name,
      email: input.email || existing.email,
      address: input.address ?? existing.address,
      marketingOptIn: input.marketingOptIn ?? existing.marketingOptIn,
      updatedAt: nowIso(),
    };
    await st().upsert("customers", merged);
    return merged;
  }
  const guestFavs = useSession.getState().guestFavorites;
  const c: Customer = {
    id: uid("c_"),
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    address: input.address,
    points: 0,
    favoriteIds: guestFavs,
    marketingOptIn: input.marketingOptIn ?? false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await st().upsert("customers", c);
  useSession.getState().clearGuestFavorites();
  return c;
}

export async function signIn(input: { name: string; phone: string; email?: string; marketingOptIn?: boolean }) {
  const c = await findOrCreateCustomer(input);
  useSession.getState().setCustomer(c.id);
  return c;
}

export function signOut() {
  useSession.getState().setCustomer(null);
}

export async function toggleFavorite(productId: string) {
  const { customerId, toggleGuestFavorite } = useSession.getState();
  if (!customerId) {
    toggleGuestFavorite(productId);
    track("favorite_add", { productId });
    return;
  }
  await st().ensure(["customers"]);
  const c = (st().data.customers ?? []).find((x) => x.id === customerId);
  if (!c) return toggleGuestFavorite(productId);
  const has = c.favoriteIds.includes(productId);
  if (!has) track("favorite_add", { productId }, c.id);
  await st().upsert("customers", { ...c, favoriteIds: has ? c.favoriteIds.filter((x) => x !== productId) : [...c.favoriteIds, productId], updatedAt: nowIso() });
}

export async function savePet(pet: Omit<Pet, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  await st().ensure(["pets"]);
  const existing = pet.id ? (st().data.pets ?? []).find((p) => p.id === pet.id) : undefined;
  const full: Pet = { ...existing, ...pet, id: pet.id ?? uid("p_"), createdAt: existing?.createdAt ?? nowIso(), updatedAt: nowIso() } as Pet;
  await st().upsert("pets", full);
  return full;
}

// ─────────────────────────── Pedidos ───────────────────────────

export interface PlaceOrderInput {
  lines: CartLine[];
  couponCode?: string;
  pointsToRedeem?: number;
  customer: { name: string; phone: string; email?: string; marketingOptIn?: boolean };
  deliveryMethod: Order["deliveryMethod"];
  zoneId?: string;
  address?: Order["address"];
  paymentMethod: Order["paymentMethod"];
  notes?: string;
  source?: Order["source"];
}

export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  // Los pedidos del panel (staff) se guardan directo: RLS permite al personal escribir pedidos.
  if (INTEGRATIONS.dataSource === "supabase" && input.source !== "admin") {
    const res = await fetch("/api/veterinaria/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "No se pudo crear el pedido");
    st().reload("orders");
    track("purchase", { total: json.order.totals.total, items: json.order.items.length, coupon: input.couponCode });
    return json.order as Order;
  }

  const data = await load();
  const settings = st().settings;
  const customer = await findOrCreateCustomer({ ...input.customer, address: input.address });
  const previousOrders = (data.orders ?? []).filter((o) => o.customerId === customer.id && o.status !== "cancelado");
  const tier = getCustomerTier(customer, data.orders ?? [], settings.loyalty);
  const zone = (data.shippingZones ?? []).find((z) => z.id === input.zoneId) ?? null;
  // En el local se venden también productos de farmacia (luego de la consulta).
  const catalog = input.source === "admin" ? (data.products ?? []).map((p) => ({ ...p, requiresConsultation: false })) : data.products ?? [];
  const cart = computeCart({
    lines: input.lines,
    products: catalog,
    combos: data.combos ?? [],
    coupons: data.coupons ?? [],
    couponCode: input.couponCode,
    deliveryMethod: input.deliveryMethod,
    zone,
    shipping: settings.shipping,
    loyalty: settings.loyalty,
    customerPoints: customer.points,
    pointsToRedeem: input.pointsToRedeem,
    previousOrders: previousOrders.length,
    tier: tier.id,
    pointsMultiplier: tier.pointsMultiplier,
  });
  if (cart.hasProblems) throw new Error(cart.lines.find((l) => !l.available)?.problem ?? "Revisá tu carrito");
  if (!cart.lines.length) throw new Error("Tu carrito está vacío");
  if (input.couponCode && cart.couponError) throw new Error(cart.couponError);

  const orders = data.orders ?? [];
  const number = orders.reduce((m, o) => Math.max(m, o.number), 1000) + 1;
  const status: OrderStatus = input.paymentMethod === "mercadopago" || input.paymentMethod === "transferencia" ? "pago_pendiente" : "nuevo";
  const order: Order = {
    id: uid("o_"),
    number,
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    email: customer.email,
    items: cart.lines.map(({ productId, variantId, comboId, name, variantLabel, unitPrice, quantity }) => ({ productId, variantId, comboId, name, variantLabel, unitPrice, quantity })),
    totals: cart.totals,
    couponCode: cart.appliedCoupon?.code,
    paymentMethod: input.paymentMethod,
    deliveryMethod: input.deliveryMethod,
    shippingZoneId: zone?.id,
    address: input.deliveryMethod === "envio" ? input.address : undefined,
    notes: input.notes?.trim() || undefined,
    status,
    statusHistory: [{ status, at: nowIso() }],
    source: input.source ?? "web",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await st().upsert("orders", order);
  await deductStock(order, "venta");

  // Puntos y cupón.
  await st().upsert("customers", { ...customer, points: Math.max(0, customer.points - cart.totals.pointsRedeemed), updatedAt: nowIso() });
  for (const c of [cart.appliedCoupon, cart.automaticPromo]) if (c) await st().upsert("coupons", { ...c, usedCount: c.usedCount + 1 });

  // El carrito se recuperó / convirtió.
  const openCart = (st().data.carts ?? []).find((c) => c.customerId === customer.id && !c.recovered);
  if (openCart) await st().upsert("carts", { ...openCart, recovered: true });

  track("purchase", { total: order.totals.total, items: order.items.length, coupon: order.couponCode }, customer.id);
  if (order.couponCode) track("coupon_applied", { code: order.couponCode }, customer.id);
  useSession.getState().setCustomer(customer.id);
  return order;
}

/** Descuenta (venta) o repone (devolución) stock de los productos del pedido. */
async function deductStock(order: Order, type: Extract<StockMovementType, "venta" | "devolucion">) {
  await st().ensure(["products", "stockMovements", "combos"]);
  const products = new Map((st().data.products ?? []).map((p) => [p.id, p]));
  const combos = st().data.combos ?? [];
  const units: { productId: string; variantId?: string; qty: number }[] = [];
  for (const it of order.items) {
    if (it.productId) units.push({ productId: it.productId, variantId: it.variantId, qty: it.quantity });
    else if (it.comboId) {
      for (const ci of combos.find((c) => c.id === it.comboId)?.items ?? []) if (ci.productId) units.push({ productId: ci.productId, qty: ci.quantity * it.quantity });
    }
  }
  const changed: Product[] = [];
  for (const u of units) {
    const p = products.get(u.productId);
    if (!p) continue;
    const tracked = u.variantId ? p.variants.find((v) => v.id === u.variantId)?.stock != null : p.stock != null;
    if (!tracked) continue;
    const { product, movement } = applyStockMovement(p, { type, quantity: type === "venta" ? -u.qty : u.qty, variantId: u.variantId, orderId: order.id, reason: `Pedido #${order.number}` }, uid("m_"));
    products.set(p.id, product);
    changed.push(product);
    await st().upsert("stockMovements", movement);
  }
  if (changed.length) await st().upsertMany("products", changed);
}

export async function updateOrderStatus(order: Order, status: OrderStatus, by?: string) {
  if (order.status === status) return order;
  const updated: Order = { ...order, status, statusHistory: [...order.statusHistory, { status, at: nowIso(), by }], updatedAt: nowIso() };
  await st().upsert("orders", updated);
  if (status === "cancelado" && order.status !== "cancelado") await deductStock(order, "devolucion");
  if (order.status === "cancelado" && status !== "cancelado") await deductStock(order, "venta");

  // Puntos: se acreditan al entregar el pedido.
  if (status === "entregado" && order.customerId && order.totals.pointsEarned > 0) {
    await st().ensure(["customers"]);
    const c = (st().data.customers ?? []).find((x) => x.id === order.customerId);
    if (c) await st().upsert("customers", { ...c, points: c.points + order.totals.pointsEarned, updatedAt: nowIso() });
  }
  return updated;
}

export async function adjustStock(product: Product, input: { type: StockMovementType; quantity: number; variantId?: string; reason?: string }, userName?: string) {
  const { product: updated, movement } = applyStockMovement(product, { ...input, userName }, uid("m_"));
  await st().upsert("products", updated);
  await st().upsert("stockMovements", movement);
  return updated;
}

// ─────────────────────────── Turnos ───────────────────────────

export interface BookInput {
  serviceId: string;
  date: string;
  time: string;
  customer: { name: string; phone: string; email?: string; marketingOptIn?: boolean };
  petId?: string;
  petName?: string;
  notes?: string;
  comboId?: string;
  source?: Appointment["source"];
  status?: Appointment["status"];
}

export async function bookAppointment(input: BookInput): Promise<Appointment> {
  if (INTEGRATIONS.dataSource === "supabase" && input.source !== "admin") {
    const res = await fetch("/api/veterinaria/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "No se pudo reservar el turno");
    st().reload("appointments");
    track("appointment_booked", { serviceId: input.serviceId });
    return json.appointment as Appointment;
  }
  const data = await load();
  const service = (data.services ?? []).find((s) => s.id === input.serviceId);
  if (!service) throw new Error("Servicio no disponible");
  const slot = getSlots(service, input.date, data.appointments ?? [], data.blockedSlots ?? []).find((s) => s.time === input.time);
  if (!slot?.available && input.source !== "admin") throw new Error("Ese horario ya no está disponible. Elegí otro o sumate a la lista de espera.");
  const customer = await findOrCreateCustomer(input.customer);
  const combo = input.comboId ? (st().data.combos ?? []).find((c) => c.id === input.comboId) : undefined;
  const a: Appointment = {
    id: uid("a_"),
    serviceId: service.id,
    comboId: combo?.id,
    customerId: customer.id,
    petId: input.petId,
    customerName: customer.name,
    phone: customer.phone,
    petName: input.petName,
    date: input.date,
    time: input.time,
    durationMin: service.durationMin,
    price: combo?.price ?? service.price,
    status: input.status ?? "pendiente",
    notes: input.notes?.trim() || undefined,
    source: input.source ?? "web",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await st().upsert("appointments", a);
  track("appointment_booked", { serviceId: service.id }, customer.id);
  useSession.getState().setCustomer(customer.id);
  return a;
}

export async function joinWaitlist(input: Omit<WaitlistEntry, "id" | "status" | "createdAt">) {
  const entry: WaitlistEntry = { ...input, id: uid("w_"), status: "esperando", createdAt: nowIso() };
  if (INTEGRATIONS.dataSource === "supabase") {
    const res = await fetch("/api/veterinaria/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) });
    if (!res.ok) throw new Error("No se pudo registrar en la lista de espera");
  } else {
    await st().upsert("waitlist", entry);
  }
  track("waitlist_join", { serviceId: input.serviceId });
  return entry;
}

/** Registra el carrito abierto para la recuperación de carritos. */
export async function recordOpenCart(lines: CartLine[], subtotal: number, names: { name: string; unitPrice: number; quantity: number; productId?: string }[]) {
  const { customerId } = useSession.getState();
  if (!customerId || !lines.length) return;
  await st().ensure(["carts", "customers"]);
  const c = (st().data.customers ?? []).find((x) => x.id === customerId);
  const existing = (st().data.carts ?? []).find((x) => x.customerId === customerId && !x.recovered);
  await st().upsert("carts", {
    id: existing?.id ?? uid("cart_"),
    customerId,
    name: c?.name,
    phone: c?.phone,
    items: names,
    subtotal,
    updatedAt: nowIso(),
    recovered: false,
  });
}
