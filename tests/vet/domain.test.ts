import { test } from "node:test";
import assert from "node:assert/strict";
import { categories, now, product, service, settings } from "./fixtures";
import { computeCart } from "../../lib/vet/domain/pricing";
import { getSlots, nextAvailableDays } from "../../lib/vet/domain/availability";
import { createProductSearch } from "../../lib/vet/domain/search";
import { applyStockMovement, canPurchase, getStockStatus } from "../../lib/vet/domain/stock";
import { computeLoyaltyPointsForAmount, getCustomerTier, rewardProgress } from "../../lib/vet/domain/loyalty";
import { toWhatsAppNumber, waLink, WA_MESSAGES } from "../../lib/vet/domain/whatsapp";
import { detectMedicalConcern, ruleBasedReply } from "../../lib/vet/domain/assistant";
import { computePendingActions, upcomingBirthdays } from "../../lib/vet/domain/automations";
import { salesSummary, stockAlerts } from "../../lib/vet/domain/stats";
import { can } from "../../lib/vet/domain/permissions";
import type { Appointment, Coupon, Customer, Order, Pet } from "../../lib/vet/types";

const baseCart = { combos: [], coupons: [] as Coupon[], deliveryMethod: "retiro" as const, shipping: settings.shipping, loyalty: settings.loyalty };

test("carrito: subtotal, variantes y puntos", () => {
  const polar = product({ id: "polar", price: null, variants: [{ id: "t1", label: "Talle 1", price: 2000, stock: null }, { id: "t2", label: "Talle 2", price: 3000, stock: null }] });
  const r = computeCart({ ...baseCart, products: [polar, product({ id: "pelota", price: 1500 })], lines: [{ productId: "polar", variantId: "t2", quantity: 2 }, { productId: "pelota", quantity: 1 }] });
  assert.equal(r.totals.subtotal, 7500);
  assert.equal(r.totals.total, 7500);
  assert.equal(r.totals.pointsEarned, 70); // 7 × $1.000 × 10 pts
  assert.equal(r.hasProblems, false);
});

test("carrito: productos sin precio o de farmacia no se pueden comprar", () => {
  const r = computeCart({ ...baseCart, products: [product({ id: "x", price: null }), product({ id: "rx", price: 5000, requiresConsultation: true })], lines: [{ productId: "x", quantity: 1 }, { productId: "rx", quantity: 1 }] });
  assert.equal(r.totals.total, 0);
  assert.equal(r.hasProblems, true);
});

test("carrito: respeta el stock disponible", () => {
  const r = computeCart({ ...baseCart, products: [product({ id: "a", stock: 1 })], lines: [{ productId: "a", quantity: 3 }] });
  assert.equal(r.lines[0].available, false);
  assert.match(r.lines[0].problem ?? "", /Solo quedan 1/);
});

test("cupones: porcentaje por categoría, primera compra, mínimo y envío gratis", () => {
  const coupons: Coupon[] = [
    { id: "c1", code: "BIENVENIDA", title: "", type: "porcentaje", value: 10, usedCount: 0, productIds: [], categoryIds: [], audience: "primera_compra", active: true, public: true, createdAt: "" },
    { id: "c2", title: "Auto juguetes", type: "porcentaje", value: 20, usedCount: 0, productIds: [], categoryIds: ["juguetes"], audience: "todos", active: true, public: true, createdAt: "" },
    { id: "c3", code: "ENVIO", title: "", type: "envio_gratis", value: 0, minPurchase: 5000, usedCount: 0, productIds: [], categoryIds: [], audience: "todos", active: true, public: true, createdAt: "" },
  ];
  const products = [product({ id: "toy", price: 10000 }), product({ id: "shampoo", categoryId: "higiene", price: 5000 })];
  const lines = [{ productId: "toy", quantity: 1 }, { productId: "shampoo", quantity: 1 }];

  const first = computeCart({ ...baseCart, coupons, products, lines, couponCode: "bienvenida", previousOrders: 0 });
  assert.equal(first.automaticDiscount, 2000); // 20% de 10.000 en juguetes
  assert.equal(first.couponDiscountAmount, 1500); // 10% de 15.000
  assert.equal(first.totals.total, 11500);

  const again = computeCart({ ...baseCart, coupons, products, lines, couponCode: "BIENVENIDA", previousOrders: 2 });
  assert.equal(again.appliedCoupon, undefined);
  assert.match(again.couponError ?? "", /primera compra/);

  const zone = { id: "z", name: "Z", price: 1200, active: true, order: 1 };
  const ship = computeCart({ ...baseCart, coupons, products, lines, couponCode: "ENVIO", deliveryMethod: "envio", zone });
  assert.equal(ship.totals.shipping, 0);
  assert.equal(ship.freeShipping, true);

  const noCoupon = computeCart({ ...baseCart, coupons: [], products, lines, deliveryMethod: "envio", zone: { ...zone, freeFrom: 20000 } });
  assert.equal(noCoupon.totals.shipping, 1200);
  assert.equal(noCoupon.missingForFreeShipping, 5000);
});

test("cupones: 2x1 y vencimiento", () => {
  const c: Coupon = { id: "b", code: "2X1", title: "", type: "dos_por_uno", value: 0, usedCount: 0, productIds: ["toy"], categoryIds: [], audience: "todos", active: true, public: true, createdAt: "", endsAt: "2026-12-31" };
  const r = computeCart({ ...baseCart, coupons: [c], couponCode: "2x1", products: [product({ id: "toy", price: 3000 })], lines: [{ productId: "toy", quantity: 3 }], now });
  assert.equal(r.couponDiscountAmount, 3000);
  const expired = computeCart({ ...baseCart, coupons: [{ ...c, endsAt: "2026-01-01" }], couponCode: "2X1", products: [product({ id: "toy", price: 3000 })], lines: [{ productId: "toy", quantity: 2 }], now });
  assert.match(expired.couponError ?? "", /vencido/);
});

test("turnos: franjas, ocupados, bloqueos y días cerrados", () => {
  const tomorrow = "2026-10-01";
  const appts: Appointment[] = [{ id: "a", serviceId: "bano", customerName: "X", phone: "1", date: tomorrow, time: "10:00", durationMin: 60, price: null, status: "confirmado", source: "web", createdAt: "", updatedAt: "" }];
  const slots = getSlots(service, tomorrow, appts, [{ id: "b", date: tomorrow, time: "12:00" }], now);
  assert.deepEqual(slots.map((s) => `${s.time}:${s.available ? "L" : s.reason}`), ["09:00:L", "10:00:ocupado", "11:00:L", "12:00:bloqueado"]);
  assert.equal(getSlots(service, "2026-10-04", [], [], now).length, 0); // domingo
  assert.equal(getSlots(service, tomorrow, [], [{ id: "d", date: tomorrow }], now).length, 0); // día bloqueado
  const today = getSlots(service, "2026-09-30", [], [], now);
  assert.equal(today.filter((s) => s.available).map((s) => s.time).join(","), "11:00,12:00"); // anticipación mínima 1 h
  assert.ok(nextAvailableDays(service, [], [], now, 7).length >= 5);
});

test("buscador: sinónimos, acentos, especie y errores de tipeo", () => {
  const products = [
    product({ id: "pipeta", name: "Meltra spot on gato", categoryId: "farmacia", species: ["gato"], tags: ["gato"] }),
    product({ id: "shampoo", name: "Shampoo neutro", categoryId: "higiene", species: ["perro", "gato"] }),
    product({ id: "pelota", name: "Pelota con soga", categoryId: "juguetes", species: ["perro"] }),
    product({ id: "cama", name: "Moisés acolchado", categoryId: "descanso", species: ["gato"] }),
  ];
  const search = createProductSearch(products, categories);
  assert.equal(search("antipulgas gato")[0]?.item.id, "pipeta");
  assert.equal(search("shampo")[0]?.item.id, "shampoo");
  assert.equal(search("juguete perro")[0]?.item.id, "pelota");
  assert.equal(search("cama gato")[0]?.item.id, "cama");
  assert.equal(search("MOISES")[0]?.item.id, "cama");
});

test("stock: estados y movimientos", () => {
  const p = product({ id: "a", stock: 5, minStock: 3 });
  assert.equal(getStockStatus(p), "disponible");
  const out = applyStockMovement(p, { type: "venta", quantity: -3 }, "m1", now);
  assert.equal(out.product.stock, 2);
  assert.equal(getStockStatus(out.product), "poco");
  assert.equal(out.movement.quantity, -3);
  const adj = applyStockMovement(out.product, { type: "ajuste", quantity: 0 }, "m2", now);
  assert.equal(getStockStatus(adj.product), "sin_stock");
  assert.equal(canPurchase(adj.product), false);
  assert.equal(getStockStatus(product({ id: "b" })), "sin_control");
});

test("fidelización: puntos, niveles internos y progreso", () => {
  assert.equal(computeLoyaltyPointsForAmount(15999, settings.loyalty), 150);
  const orders = Array.from({ length: 3 }, (_, i) => ({ id: `o${i}`, customerId: "c", status: "entregado", createdAt: now.toISOString(), totals: { total: 10000 } })) as Order[];
  assert.equal(getCustomerTier({ id: "c" }, orders, settings.loyalty, now).id, "frecuente");
  assert.equal(getCustomerTier({ id: "c", tierOverride: "vip" }, orders, settings.loyalty, now).id, "vip");
  const prog = rewardProgress(850, settings.loyalty.rewards);
  assert.equal(prog.missing, 150);
  assert.equal(prog.next?.points, 1000);
});

test("whatsapp: números argentinos y mensajes", () => {
  assert.equal(toWhatsAppNumber("11-5977-2229"), "5491159772229");
  assert.equal(toWhatsAppNumber("+54 11 5977-2229"), "5491159772229");
  assert.equal(toWhatsAppNumber("011 15 5977-2229"), "5491159772229");
  assert.ok(waLink("5491159772229", "Hola").startsWith("https://wa.me/5491159772229?text=Hola"));
  const msg = WA_MESSAGES.cart([{ name: "Producto A", unitPrice: 1000, quantity: 2 }, { name: "Producto B", unitPrice: 500, quantity: 1 }], 2500);
  assert.match(msg, /Producto A x2/);
  assert.match(msg, /Total: \$\s?2\.500/);
});

test("asistente: deriva consultas médicas y detecta intenciones", () => {
  assert.equal(detectMedicalConcern("mi perro vomita desde ayer"), "medico");
  assert.equal(detectMedicalConcern("creo que comió veneno"), "urgencia");
  const ctx = { businessName: "Vida de Perros", whatsappHref: "https://wa.me/1", base: "/veterinaria", hoursText: "", hasAddress: false };
  const med = ruleBasedReply("¿qué dosis de antibiótico le doy?", ctx);
  assert.equal(med.intent, "medico");
  assert.doesNotMatch(med.text, /\d+ ?mg/);
  assert.equal(ruleBasedReply("quiero sacar turno para baño", ctx).intent, "turno");
  assert.equal(ruleBasedReply("tienen arena para gato?", ctx).intent, "producto");
});

test("automatizaciones: cumpleaños, turnos de mañana y stock bajo", () => {
  const customers = [{ id: "c", name: "Laura Gómez", phone: "1122334455", marketingOptIn: true, points: 0, favoriteIds: [], createdAt: "", updatedAt: "" }] as Customer[];
  const pets = [{ id: "p", customerId: "c", name: "Toby", species: "perro", sex: "macho", birthDate: "2020-09-30", createdAt: "", updatedAt: "" }] as Pet[];
  const appointments: Appointment[] = [{ id: "a", serviceId: "bano", customerName: "Laura Gómez", phone: "1122334455", petName: "Toby", date: "2026-10-01", time: "10:00", durationMin: 60, price: null, status: "confirmado", source: "web", createdAt: "", updatedAt: "" }];
  const actions = computePendingActions({
    rules: settings.automations, businessName: "Vida de Perros", siteUrl: "https://x", customers, pets, orders: [], appointments,
    services: [service], products: [product({ id: "s", stock: 1, minStock: 2 })], categories, carts: [], waitlist: [], now,
  });
  const kinds = actions.map((a) => a.kind);
  assert.ok(kinds.includes("cumpleanos"));
  assert.ok(kinds.includes("turno_proximo"));
  assert.ok(kinds.includes("stock_bajo"));
  assert.match(actions.find((a) => a.kind === "cumpleanos")!.title, /cumpleaños de Toby/);
  assert.equal(upcomingBirthdays(pets, now)[0].inDays, 0);
});

test("estadísticas: ventas del período sin cancelados y alertas de stock", () => {
  const mk = (id: string, total: number, status: Order["status"], daysAgo: number) =>
    ({ id, status, createdAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(), totals: { total }, items: [] }) as unknown as Order;
  const s = salesSummary([mk("a", 1000, "entregado", 0), mk("b", 5000, "cancelado", 0), mk("c", 3000, "pagado", 3)], now);
  assert.equal(s.today.total, 1000);
  assert.equal(s.week.total, 4000);
  assert.equal(s.week.avgTicket, 2000);
  const alerts = stockAlerts([product({ id: "x", stock: 0 }), product({ id: "y", stock: 1 }), product({ id: "z" })]);
  assert.equal(alerts.out.length, 1);
  assert.equal(alerts.low.length, 1);
  assert.equal(alerts.untracked, 1);
});

test("permisos por rol", () => {
  assert.equal(can("ADMIN", "settings.manage"), true);
  assert.equal(can("EMPLEADO", "orders.manage"), true);
  assert.equal(can("EMPLEADO", "prices.manage"), false);
  assert.equal(can("CLIENTE", "dashboard.view"), false);
});
