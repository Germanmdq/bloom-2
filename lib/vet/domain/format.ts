import { parseDateKey, WEEKDAY_NAMES } from "./dates";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return "Consultar";
  return money.format(value);
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  const d = typeof value === "string" ? (value.length === 10 ? parseDateKey(value) : new Date(value)) : value;
  return new Intl.DateTimeFormat("es-AR", opts).format(d);
}

export function formatDateTime(value: string | Date): string {
  return formatDate(value, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** "Jueves 2 de octubre" */
export function formatLongDay(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return `${WEEKDAY_NAMES[d.getDay()]} ${d.getDate()} de ${new Intl.DateTimeFormat("es-AR", { month: "long" }).format(d)}`;
}

export function relativeDays(days: number): string {
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.round(days / 30);
  return months === 1 ? "hace 1 mes" : `hace ${months} meses`;
}

export function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Normaliza texto para búsquedas: minúsculas, sin acentos ni signos. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(s: string): string {
  return normalizeText(s).replace(/ñ/g, "n").replace(/\s+/g, "-").slice(0, 70).replace(/-+$/, "");
}

export function uid(prefix = ""): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}${rand}`;
}
