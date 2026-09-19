/** Producción: `MERCADOPAGO_ACCESS_TOKEN`. Compat: `MP_ACCESS_TOKEN` (docs anteriores). */
export function getMercadoPagoAccessToken(): string | undefined {
  const a = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  const b = process.env.MP_ACCESS_TOKEN?.trim();
  return a || b || undefined;
}
