// node --test lib/cuenta-corriente.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildCcReference, creditedMatchesDeclared, parseCcReference } from "./cuenta-corriente.ts";

const id = "123e4567-e89b-12d3-a456-426614174000";

test("referencia ida y vuelta", () => {
  const ref = buildCcReference(id, 1234.5);
  assert.equal(ref, `CCPAY:${id}:123450`);
  assert.deepEqual(parseCcReference(ref), { customerId: id, cents: 123450 });
});
test("referencias inválidas o manipuladas", () => {
  for (const bad of ["", null, undefined, "DEBT_x_1", `CCPAY:${id}:0`, `CCPAY:${id}:-5`, `CCPAY:notauuid:100`, `CCPAY:${id}:1e9`, `ccpay:${id}`]) {
    assert.equal(parseCcReference(bad), null, String(bad));
  }
});
test("monto acreditado vs declarado", () => {
  assert.equal(creditedMatchesDeclared(1234.5, 123450), true);
  assert.equal(creditedMatchesDeclared(1234.499999, 123450), true);
  assert.equal(creditedMatchesDeclared(1, 123450), false); // pagó $1 declarando $1234,50
  assert.equal(creditedMatchesDeclared(99999, 123450), false);
  assert.equal(creditedMatchesDeclared(undefined, 100), false);
  assert.equal(creditedMatchesDeclared(NaN, 100), false);
});
