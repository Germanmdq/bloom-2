import { randomBytes, timingSafeEqual } from "crypto";

// Funciones puras de Getnet (sin dependencias de Next; testeadas en lib/getnet.test.mjs).

/**
 * order_id del payment intent: lo arma SOLO el servidor y lleva el monto declarado en centavos.
 * (Getnet limita order_id a 36 caracteres [A-Za-z0-9_-]).
 */
export function buildOrderId(cents: number) {
  return `CC${cents}_${randomBytes(6).toString("hex")}`;
}

export function parseOrderId(orderId: string | null | undefined): { cents: number } | null {
  const m = String(orderId ?? "").match(/^CC(\d{1,12})_[0-9a-f]{12}$/);
  if (!m) return null;
  const cents = Number(m[1]);
  return cents > 0 ? { cents } : null;
}

/**
 * ¿Lo acreditado por Getnet cubre lo declarado? Puede ser MAYOR (cuotas con interés suman al total que paga el
 * cliente) pero nunca menor. A la deuda se le descuenta el monto declarado, no el interés.
 */
export function creditedCoversDeclared(creditedCents: number | null | undefined, declaredCents: number) {
  const c = Number(creditedCents);
  return Number.isFinite(c) && c >= declaredCents - 1 && c <= declaredCents * 2;
}

/** Valida `Authorization: Basic base64(user:password)` en tiempo constante. */
export function basicAuthMatches(header: string | null | undefined, user: string, password: string) {
  if (!user || !password || !header?.startsWith("Basic ")) return false;
  const expected = Buffer.from(`Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

