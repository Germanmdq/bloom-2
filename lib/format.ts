/** Formato de precios argentino: $8.000, $12.800 (punto de miles, sin decimales). */
export function formatARS(value: number | string | null | undefined): string {
  const n = Math.round(Number(value) || 0);
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("es-AR")}`;
}

/** Misma interfaz que Intl.NumberFormat#format, para reemplazar los formateadores de moneda existentes. */
export const arsFormatter = { format: (value: number | string) => formatARS(value) };
