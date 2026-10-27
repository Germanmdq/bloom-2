// Correr con: node --test lib/phone.test.mjs   (Node 22+ ejecuta el .ts directamente)
import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, formatPhone } from "./phone.ts";

const cases = [
  ["223 615 1152", "2236151152"],
  ["2236151152", "2236151152"],
  ["(223) 615-1152", "2236151152"],
  ["0223 615 1152", "2236151152"],
  ["+54 223 615 1152", "2236151152"],
  ["+54 9 223 615 1152", "2236151152"],
  ["549 223 6151152", "2236151152"],
  ["54 223 6151152", "2236151152"],
  ["223 15 615 1152", "2236151152"],
  ["0223 15 6151152", "2236151152"],
  ["+54 9 11 5555 1234", "1155551234"],
  ["011 15 5555 1234", "1155551234"],
  ["615 1152", "2236151152"],
  ["6151152", "2236151152"],
  ["15 615 1152", "2236151152"],
  ["156151152", "2236151152"],
  ["", null],
  ["abc", null],
  ["12345", null],
  ["223 615 11523", null],
];

for (const [input, expected] of cases) {
  test(`normalizePhone(${JSON.stringify(input)})`, () => assert.equal(normalizePhone(input), expected));
}
test("normalizePhone(null)", () => assert.equal(normalizePhone(null), null));
test("formatPhone", () => {
  assert.equal(formatPhone("2236151152"), "223 615 1152");
  assert.equal(formatPhone("1155551234"), "11 555 51234");
});
