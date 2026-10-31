// Correr con: node --test lib/os/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { tokenMatches, extractToken, parsePeriod, normalizeMethod, toDbMethod, summarizeSales, topProducts, removeFromLines, linesTotal, requestHash, validIdempotencyKey, cleanActor } from "./core.ts";

test("token", () => {
  assert.equal(tokenMatches("abc", "abc"), true);
  assert.equal(tokenMatches("abd", "abc"), false);
  assert.equal(tokenMatches("", "abc"), false);
  assert.equal(tokenMatches("abc", undefined), false);
  const h = (v) => ({ get: (n) => (n === "authorization" ? v : null) });
  assert.equal(extractToken(h("Bearer xyz")), "xyz");
  assert.equal(extractToken(h("Basic xyz")), null);
});

test("períodos en hora argentina", () => {
  const now = new Date("2026-10-31T01:30:00Z"); // 30/10 22:30 en Argentina
  const p = parsePeriod({}, now);
  assert.equal(p.from, "2026-10-30");
  assert.equal(p.fromIso, "2026-10-30T00:00:00-03:00");
  assert.equal(p.toIso, "2026-10-31T00:00:00-03:00");
  assert.equal(parsePeriod({ period: "week" }, now).from, "2026-10-24");
  assert.equal(parsePeriod({ period: "month" }, now).from, "2026-10-01");
  assert.equal(parsePeriod({ from: "2026-10-01", to: "2026-10-03" }, now).toIso, "2026-10-04T00:00:00-03:00");
  assert.throws(() => parsePeriod({ from: "2026-10-05", to: "2026-10-01" }), /posterior/);
  assert.throws(() => parsePeriod({ from: "hola" }), /inválidas/);
  assert.throws(() => parsePeriod({ from: "2020-01-01", to: "2026-01-01" }), /366/);
});

test("medios de pago", () => {
  assert.equal(normalizeMethod("SANTANDER_RIO"), "TRANSFERENCIA");
  assert.equal(normalizeMethod("cash"), "EFECTIVO");
  assert.equal(toDbMethod("Efectivo"), "CASH");
  assert.equal(toDbMethod("CUENTA_CORRIENTE"), null);
});

const orders = [
  { total: 1000, paid: true, payment_method: "CASH", status: "completed", items: [{ id: "a", name: "Café", price: 500, quantity: 2 }] },
  { total: 3000, paid: true, payment_method: "MERCADO_PAGO", status: "paid", items: [{ id: "a", name: "Café", price: 500, quantity: 1 }, { id: "b", name: "Tostado", price: 2500, quantity: 1 }] },
  { total: 800, paid: true, payment_method: "CASH", status: "completed", items: [{ id: "cc-payment", name: "Pago Cuenta Corriente", price: 800, quantity: 1 }] },
  { total: 500, paid: false, payment_method: "CUENTA_CORRIENTE", cuenta_corriente: true, status: "pending", items: [{ id: "b", name: "Tostado", price: 500, quantity: 1 }] },
  { total: 700, paid: false, payment_method: "PENDING", status: "pending", items: [] },
  { total: 900, paid: true, payment_method: "CASH", status: "cancelled", items: [] },
];
test("ventas del período", () => {
  const s = summarizeSales(orders);
  assert.equal(s.ventas_total, 4500);
  assert.equal(s.pedidos, 3);
  assert.equal(s.ticket_promedio, 1500);
  assert.deepEqual(s.por_medio_de_pago.EFECTIVO, { cantidad: 1, total: 1000 });
  assert.equal(s.por_medio_de_pago.CUENTA_CORRIENTE.total, 500);
  assert.deepEqual(s.pendientes_de_cobro, { pedidos: 1, total: 700 });
});
test("más vendidos", () => {
  const t = topProducts(orders, 5);
  assert.equal(t[0].producto, "Café");
  assert.equal(t[0].unidades, 3);
  assert.equal(t.find((x) => x.producto.startsWith("Pago")), undefined);
});

test("quitar productos de la mesa", () => {
  const items = [{ id: "a", product_id: "a", name: "Café", price: 500, quantity: 2 }, { id: "meta-customer", name: "x" }, { id: "b", price: 100, quantity: 1 }];
  const r = removeFromLines(items, "a", 1);
  assert.equal(r.removed, 1);
  assert.equal(r.items.find((i) => i.id === "a").quantity, 1);
  const r2 = removeFromLines(items, "a", "all");
  assert.equal(r2.items.some((i) => i.id === "a"), false);
  assert.equal(r2.items.some((i) => i.id === "meta-customer"), true);
  assert.equal(linesTotal(r2.items), 100);
  assert.equal(removeFromLines(items, "zzz", 1).removed, 0);
});

test("idempotencia y actor", () => {
  assert.equal(requestHash("POST", "/x", { b: 1, a: 2 }), requestHash("POST", "/x", { a: 2, b: 1 }));
  assert.notEqual(requestHash("POST", "/x", { a: 1 }), requestHash("POST", "/x", { a: 2 }));
  assert.equal(validIdempotencyKey("corto"), null);
  assert.equal(validIdempotencyKey("abc-12345678"), "abc-12345678");
  assert.equal(cleanActor("  Claude <script> "), "Claude script");
  assert.equal(cleanActor(null), "bloom-os");
});
