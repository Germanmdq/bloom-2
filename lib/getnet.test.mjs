// node --test lib/getnet.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { basicAuthMatches, buildOrderId, creditedCoversDeclared, parseOrderId } from "./getnet-core.ts";

test("order_id ida y vuelta, respeta el límite de Getnet (36, [A-Za-z0-9_-])", () => {
  const id = buildOrderId(123450);
  assert.ok(id.length <= 36 && /^[A-Za-z0-9_-]+$/.test(id), id);
  assert.deepEqual(parseOrderId(id), { cents: 123450 });
  assert.notEqual(buildOrderId(100), buildOrderId(100)); // aleatorio
});
test("order_id inválidos", () => {
  for (const bad of ["", null, undefined, "CC0_aaaaaaaaaaaa", "CC-5_aaaaaaaaaaaa", "ORDER_AR_12345", "CC100_zzzz", "CC100", "cc100_aaaaaaaaaaaa"]) {
    assert.equal(parseOrderId(bad), null, String(bad));
  }
});
test("monto acreditado cubre lo declarado", () => {
  assert.equal(creditedCoversDeclared(123450, 123450), true);
  assert.equal(creditedCoversDeclared(130000, 123450), true); // cuotas con interés
  assert.equal(creditedCoversDeclared(100, 123450), false); // pagó menos
  assert.equal(creditedCoversDeclared(123450 * 3, 123450), false); // desproporcionado
  assert.equal(creditedCoversDeclared(undefined, 100), false);
  assert.equal(creditedCoversDeclared(NaN, 100), false);
});
test("Basic auth del webhook", () => {
  const header = "Basic " + Buffer.from("testwebhook:testwebhook13579").toString("base64");
  assert.equal(header, "Basic dGVzdHdlYmhvb2s6dGVzdHdlYmhvb2sxMzU3OQ=="); // ejemplo de la documentación de Getnet
  assert.equal(basicAuthMatches(header, "testwebhook", "testwebhook13579"), true);
  assert.equal(basicAuthMatches(header, "testwebhook", "otra"), false);
  assert.equal(basicAuthMatches("Basic xxxx", "testwebhook", "testwebhook13579"), false);
  assert.equal(basicAuthMatches(null, "testwebhook", "testwebhook13579"), false);
  assert.equal(basicAuthMatches(header, "", ""), false); // sin credenciales configuradas nunca autentica
  assert.equal(basicAuthMatches("Bearer abc", "u", "p"), false);
});
