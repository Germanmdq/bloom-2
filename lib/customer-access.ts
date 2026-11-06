// Reglas del acceso de clientes:
// - La contraseña del cliente son los últimos 6 números de su teléfono.
// - El cumpleaños se pide como día y mes (sin año). Se guarda en `profiles.birthdate`
//   (tipo DATE) con el año fijo 2000, que es bisiesto y acepta el 29 de febrero.

export const BIRTHDAY_YEAR = 2000;

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Contraseña del cliente: últimos 6 números del teléfono normalizado (10 dígitos). */
export function customerPassword(phone: string): string {
  return String(phone ?? "").replace(/\D/g, "").slice(-6);
}

export function isCustomerPassword(phone: string, password: unknown): boolean {
  const expected = customerPassword(phone);
  return expected.length === 6 && String(password ?? "").replace(/\D/g, "") === expected;
}

/** Días que tiene un mes (con 29 de febrero permitido). */
export function daysInMonth(month: number): number {
  return new Date(BIRTHDAY_YEAR, month, 0).getDate();
}

/** Arma la fecha a guardar ("2000-MM-DD") o null si el día/mes no son válidos. */
export function birthdateFrom(day: unknown, month: unknown): string | null {
  const d = Number(day);
  const m = Number(month);
  if (!Number.isInteger(d) || !Number.isInteger(m) || m < 1 || m > 12 || d < 1 || d > daysInMonth(m)) return null;
  return `${BIRTHDAY_YEAR}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
