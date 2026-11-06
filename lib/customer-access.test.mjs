// Correr con: node --test lib/customer-access.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { customerPassword, isCustomerPassword, birthdateFrom, daysInMonth } from "./customer-access.ts";

test("la contraseña son los últimos 6 números del teléfono", () => {
  assert.equal(customerPassword("2236151152"), "151152");
  assert.equal(isCustomerPassword("2236151152", "151152"), true);
  assert.equal(isCustomerPassword("2236151152", " 151 152 "), true);
  assert.equal(isCustomerPassword("2236151152", "151153"), false);
  assert.equal(isCustomerPassword("2236151152", ""), false);
  assert.equal(isCustomerPassword("2236151152", undefined), false);
});

test("cumpleaños: día y mes válidos", () => {
  assert.equal(birthdateFrom(5, 3), "2000-03-05");
  assert.equal(birthdateFrom("29", "2"), "2000-02-29");
  assert.equal(birthdateFrom(31, 12), "2000-12-31");
});

test("cumpleaños: día o mes inválidos", () => {
  assert.equal(birthdateFrom(31, 4), null);
  assert.equal(birthdateFrom(30, 2), null);
  assert.equal(birthdateFrom(0, 1), null);
  assert.equal(birthdateFrom(1, 13), null);
  assert.equal(birthdateFrom("", ""), null);
  assert.equal(daysInMonth(2), 29);
});
