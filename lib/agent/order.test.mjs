// node --test lib/agent/order.test.mjs  -- createAgentOrder contra una base simulada (no toca datos reales)
import test from "node:test";
import assert from "node:assert/strict";
import { createAgentOrder } from "./order.ts";

function fakeDb() {
  const log = [];
  const db = {
    from(table) {
      const q = { table, ops: [] };
      log.push(q);
      const result = (data) => Promise.resolve({ data, error: null });
      const chain = new Proxy({}, {
        get: (_, op) => {
          if (op === "then") return undefined; // no es una promesa hasta que se llama single/in
          return (...args) => {
            q.ops.push([op, ...args]);
            if (op === "single") return result({ id: "abcdef12-0000-4000-8000-000000000000" });
            if (op === "in" && table === "products") return result([{ id: "p1", stock: 5, track_stock: true, vendidos: 1, total_vendidos: 9 }, { id: "p2", stock: 0, track_stock: false }]);
            if (op === "insert" && table === "kitchen_tickets") return result(null);
            return chain;
          };
        },
      });
      return chain;
    },
  };
  return { db, log };
}

test("pedido de retiro: orders + comanda + descuento de stock, con precios de la base", async () => {
  const { db, log } = fakeDb();
  const lines = [{ id: "p1", name: "Medialuna", quantity: 2, unitPrice: 1200, subtotal: 2400 }, { id: "p2", name: "Café", quantity: 1, unitPrice: 3500, subtotal: 3500, notes: "sin azúcar" }];
  const r = await createAgentOrder(db, { draft: { items: [], orderType: "retiro", address: null, name: "Ana", phone: null }, lines, total: 5900, customerId: "cust-1" });
  assert.equal(r.orderId, "abcdef12-0000-4000-8000-000000000000");
  const ins = log.filter((q) => q.table === "orders")[0].ops.find((o) => o[0] === "insert")[1][0];
  assert.equal(ins.total, 5900); assert.equal(ins.customer_id, "cust-1"); assert.equal(ins.status, "pending"); assert.equal(ins.paid, false);
  assert.equal(ins.delivery_type, "retiro"); assert.equal(ins.order_type, "TAKEAWAY"); assert.equal(ins.table_id, null);
  assert.deepEqual(ins.items.map((i) => [i.id, i.price, i.quantity]), [["p1", 1200, 2], ["p2", 3500, 1]]);
  const kt = log.filter((q) => q.table === "kitchen_tickets")[0].ops.find((o) => o[0] === "insert")[1][0];
  assert.equal(kt.status, "PENDING"); assert.match(kt.notes, /RETIRO EN LOCAL/); assert.equal(kt.items[1].notes, "sin azúcar");
  const upd = log.filter((q) => q.table === "products").find((q) => q.ops.some((o) => o[0] === "update"));
  assert.equal(upd.ops.find((o) => o[0] === "update")[1].stock, 3); // 5 - 2, solo el producto con control de stock
});
test("pedido delivery lleva dirección y teléfono", async () => {
  const { db, log } = fakeDb();
  await createAgentOrder(db, { draft: { items: [], orderType: "delivery", address: "Tribunales, piso 4", name: "Ana", phone: "2236151152" }, lines: [{ id: "p2", name: "Café", quantity: 1, unitPrice: 3500, subtotal: 3500 }], total: 3500, customerId: null });
  const ins = log.filter((q) => q.table === "orders")[0].ops.find((o) => o[0] === "insert")[1][0];
  assert.equal(ins.delivery_info, "Tribunales, piso 4"); assert.equal(ins.order_type, "DELIVERY"); assert.equal(ins.customer_phone, "2236151152"); assert.equal(ins.customer_id, null);
  const kt = log.filter((q) => q.table === "kitchen_tickets")[0].ops.find((o) => o[0] === "insert")[1][0];
  assert.match(kt.notes, /DELIVERY: Tribunales, piso 4/);
});
