// node --test lib/agent/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { isAffirmative, missingFields, priceDraft, sanitizeDraft, signDraft, summaryText, verifyDraft, emptyDraft } from "./core.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const menu = new Map([
  [A, { id: A, name: "Café con leche", description: "", price: 3500, category: "Cafetería", available: true, stock: null, options: "" }],
  [B, { id: B, name: "Medialuna", description: "", price: 1200, category: "Panificados", available: true, stock: 3, options: "" }],
  [C, { id: C, name: "Tarta", description: "", price: 9000, category: "Tartas", available: false, stock: 0, options: "" }],
]);

test("precios SIEMPRE de la base; agotados y desconocidos se quitan; stock acota", () => {
  const d = sanitizeDraft({ items: [{ id: A, quantity: 2 }, { id: B, quantity: 5 }, { id: C, quantity: 1 }, { id: "44444444-4444-4444-8444-444444444444", quantity: 1 }], price: 1 });
  const r = priceDraft(d, menu);
  assert.deepEqual(r.lines.map((l) => [l.name, l.quantity, l.subtotal]), [["Café con leche", 2, 7000], ["Medialuna", 3, 3600]]);
  assert.equal(r.total, 10600);
  assert.ok(r.problems.some((p) => /Tarta está agotado/.test(p)));
  assert.ok(r.problems.some((p) => /quedan solo 3/.test(p)));
});
test("sanitizeDraft descarta basura y limita cantidades", () => {
  const d = sanitizeDraft({ items: [{ id: "x", quantity: 1 }, { id: A, quantity: 999 }, { id: A, quantity: -1 }, { id: A, quantity: "abc" }], orderType: "mesa", name: "  Ana   Pérez " });
  assert.deepEqual(d.items, [{ id: A, quantity: 20 }]);
  assert.equal(d.orderType, null);
  assert.equal(d.name, "Ana Pérez");
});
test("faltantes por tipo de pedido", () => {
  const base = { ...emptyDraft(), items: [{ id: A, quantity: 1 }] };
  assert.deepEqual(missingFields(base), ["orderType", "name"]);
  assert.deepEqual(missingFields({ ...base, orderType: "retiro", name: "Ana" }), []);
  assert.deepEqual(missingFields({ ...base, orderType: "delivery", name: "Ana" }), ["address", "phone"]);
  assert.deepEqual(missingFields({ ...base, orderType: "delivery", name: "Ana", address: "Tribunales, piso 4", phone: "2236151152" }), []);
});
test("resumen con detalle, total y destino", () => {
  const d = { ...emptyDraft(), items: [{ id: A, quantity: 2 }], orderType: "delivery", address: "Tribunales, piso 4", name: "Ana", phone: "2236151152" };
  const { lines, total } = priceDraft(d, menu);
  const s = summaryText(lines, total, d);
  assert.match(s, /2 Café con leche/); assert.match(s, /7\.000 pesos/); assert.match(s, /Delivery a Tribunales, piso 4/); assert.match(s, /a nombre de Ana/); assert.match(s, /¿Lo confirmás\?/);
});
test("firma: cambiar un solo dato invalida la confirmación", () => {
  const d = { ...emptyDraft(), items: [{ id: A, quantity: 2 }], orderType: "retiro", name: "Ana" };
  const t = signDraft("secreto", d, 7000);
  assert.equal(verifyDraft("secreto", d, 7000, t), true);
  assert.equal(verifyDraft("secreto", { ...d, items: [{ id: A, quantity: 3 }] }, 7000, t), false); // más cantidad
  assert.equal(verifyDraft("secreto", d, 100, t), false); // otro total (precio cambió)
  assert.equal(verifyDraft("secreto", { ...d, address: "otra" }, 7000, t), false);
  assert.equal(verifyDraft("otro", d, 7000, t), false);
  assert.equal(verifyDraft("secreto", d, 7000, null), false);
  assert.equal(verifyDraft("secreto", d, 7000, "zz"), false);
});
test("confirmación explícita estricta", () => {
  for (const ok of ["Sí", "si", "Sí, confirmo", "dale", "Perfecto.", "OK", "Confirmo", "sí por favor", "de una", "Listo!"]) assert.equal(isAffirmative(ok), true, ok);
  for (const no of ["no", "sí pero sin cebolla", "mejor agregame una medialuna", "no, cambiá la dirección", "sí, y agregá un café", "", "no sé si me alcanza", "quiero dos cafés"]) assert.equal(isAffirmative(no), false, no);
});
