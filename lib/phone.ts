/**
 * Normalización única de teléfonos argentinos para todo el sistema.
 * Formato canónico: 10 dígitos = característica + número (ej. "2236151152"), sin 54, sin 9, sin 0, sin 15.
 */

export const DEFAULT_AREA_CODE = "223";

/**
 * Devuelve el teléfono en 10 dígitos, o null si no se puede interpretar.
 * Reglas:
 *  - quita espacios, guiones, paréntesis y cualquier símbolo;
 *  - quita +54 / 54 / 549 y el 0 inicial de la característica;
 *  - quita el 15 que va después de la característica;
 *  - si es solo el número local (7 dígitos, o 15 + 7), asume característica 223.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  let d = String(input ?? "").replace(/\D/g, "");
  if (!d) return null;

  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);

  // Número local solo: 7 dígitos, o "15" + 7 dígitos → característica por defecto.
  if (d.length === 7) return DEFAULT_AREA_CODE + d;
  if (d.length === 9 && d.startsWith("15")) return DEFAULT_AREA_CODE + d.slice(2);

  // Característica + 15 + número (el 15 viene justo después de la característica).
  if (d.length === 12) {
    for (const n of [2, 3, 4]) {
      if (d.slice(n, n + 2) === "15" && d.length - n - 2 === 10 - n) return d.slice(0, n) + d.slice(n + 2);
    }
    return null;
  }

  if (d.length === 10) return d;
  return null;
}

/** Formato legible para mostrar: "223 615 1152". */
export function formatPhone(phone: string | null | undefined): string {
  const n = normalizePhone(phone);
  if (!n) return String(phone ?? "");
  const a = n.startsWith("11") ? 2 : 3; // Buenos Aires (11) usa característica de 2 dígitos
  return `${n.slice(0, a)} ${n.slice(a, a + 3)} ${n.slice(a + 3)}`.trim();
}

export const PHONE_ERROR = "Ingresá característica y número, sin 0 ni 15 (ej: 223 615 1152).";

/** Para pedidos/contacto: normaliza si se puede; si no, conserva lo escrito (no bloquear un pedido por el teléfono). */
export function normalizePhoneOrKeep(input: string | null | undefined): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  return normalizePhone(raw) ?? raw;
}

/** Separa característica y abonado (Mercado Pago pide area_code y number). */
export function splitPhone(input: string | null | undefined): { area_code: string; number: string } | null {
  const n = normalizePhone(input);
  if (!n) return null;
  const a = n.startsWith("11") ? 2 : 3;
  return { area_code: n.slice(0, a), number: n.slice(a) };
}

/**
 * Formas en que un teléfono pudo haberse guardado antes de normalizar (para reconocer datos viejos):
 * 10 dígitos, con 0 / 54 / 549 / +54 adelante y con el 15 después de la característica.
 */
export function phoneVariants(input: string | null | undefined): string[] {
  const n = normalizePhone(input);
  if (!n) return [];
  const a = n.startsWith("11") ? 2 : 3;
  const area = n.slice(0, a);
  const local = n.slice(a);
  const base = [n, `0${n}`, `54${n}`, `549${n}`, `+54${n}`, `+549${n}`, `${area}15${local}`, `0${area}15${local}`, `${area} ${local}`, `${area} ${local.slice(0, 3)} ${local.slice(3)}`];
  return [...new Set(base)];
}
