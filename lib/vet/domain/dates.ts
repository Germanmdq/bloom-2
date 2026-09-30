/** Utilidades de fecha en hora local (los turnos se manejan en la zona del local). */

/** "2026-09-30" en hora local. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Días enteros entre dos fechas (b - a), ignorando la hora. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

/** Próximo cumpleaños (fecha) a partir de hoy, o null si no hay fecha. */
export function nextBirthday(birthDate: string | undefined, now: Date): Date | null {
  if (!birthDate) return null;
  const b = parseDateKey(birthDate);
  const next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (daysBetween(now, next) < 0) next.setFullYear(now.getFullYear() + 1);
  return next;
}

export function ageFromBirthDate(birthDate: string | undefined, now: Date): number | null {
  if (!birthDate) return null;
  const b = parseDateKey(birthDate);
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return Math.max(0, age);
}

export const WEEKDAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
