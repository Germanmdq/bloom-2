import { normalizePhone } from "@/lib/phone";
export { buildOrderId, parseOrderId, creditedCoversDeclared, basicAuthMatches } from "@/lib/getnet-core";

/**
 * Getnet Argentina — Web Checkout (redirect), sin SDK. Especificación oficial:
 * https://docs.globalgetnet.com/en/products/online-payments/web-checkout  (OpenAPI "Web Checkout API" v1.6.0)
 *
 *  - Auth:    POST {host}/authentication/oauth2/access_token  (client_credentials, form-urlencoded)
 *  - Crear:   POST {host}/dpy/web-checkout/v1/payment-intent  -> { payment_intent_id, redirect_url }
 *  - Consultar: GET {host}/dpy/web-checkout/v1/payment-intent/{id} -> { status: paid|pending|denied|..., payment: { amount, currency, result } }
 *  - Webhook: POST a nuestra URL con `Authorization: Basic base64(usuario:clave)` (los configura el comercio en el
 *    Portal de Getnet). No hay firma HMAC: la autenticidad se valida con esas credenciales y, además, el monto y el
 *    estado se confirman SIEMPRE consultando a Getnet con nuestro token.
 *  - Montos: enteros en centavos (ARS 150,00 = 15000).
 *
 * El medio de pago queda DESACTIVADO hasta que estén cargadas TODAS las variables:
 *   GETNET_CLIENT_ID, GETNET_CLIENT_SECRET, GETNET_WEBHOOK_USER, GETNET_WEBHOOK_PASSWORD
 * (GETNET_ENV = sandbox | pre | production; por defecto sandbox).
 */

const HOSTS = {
  sandbox: "https://api-sbx.globalgetnet.com",
  pre: "https://api.pre.globalgetnet.com",
  production: "https://api.globalgetnet.com",
} as const;

export function getnetConfig() {
  const env = (process.env.GETNET_ENV ?? "sandbox").trim().toLowerCase() as keyof typeof HOSTS;
  const clientId = process.env.GETNET_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GETNET_CLIENT_SECRET?.trim() ?? "";
  const webhookUser = process.env.GETNET_WEBHOOK_USER?.trim() ?? "";
  const webhookPassword = process.env.GETNET_WEBHOOK_PASSWORD?.trim() ?? "";
  return {
    host: process.env.GETNET_API_HOST?.trim().replace(/\/$/, "") || (HOSTS[env] ?? HOSTS.sandbox), // GETNET_API_HOST: solo para pruebas con un servidor simulado
    env: HOSTS[env] ? env : "sandbox",
    clientId,
    clientSecret,
    webhookUser,
    webhookPassword,
    enabled: process.env.GETNET_DISABLED !== "true" && Boolean(clientId && clientSecret && webhookUser && webhookPassword),
  };
}

// ---------- Cliente HTTP ----------

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const cfg = getnetConfig();
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(`${cfg.host}/authentication/oauth2/access_token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: cfg.clientId, client_secret: cfg.clientSecret }),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !json.access_token) throw new Error(`Getnet auth falló (${res.status}${json.error ? `: ${json.error}` : ""})`);
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3000) * 1000 };
  return cachedToken.value;
}

async function getnetFetch(path: string, init: RequestInit = {}) {
  const cfg = getnetConfig();
  const token = await getAccessToken();
  return fetch(`${cfg.host}/dpy/web-checkout/v1${path}`, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
}

export type GetnetCustomerInput = {
  customerId: string;
  fullName: string;
  phone: string | null;
  cuit: string | null;
};

/**
 * Getnet exige en `customer`: email, document_type, document_number (8-15) y billing_address
 * (street, number, country, postal_code). La cuenta del cliente solo guarda nombre, teléfono y una dirección en
 * texto libre, así que lo que falte sale de variables GETNET_CUSTOMER_* del comercio.
 * PENDIENTE de confirmar con Getnet si aceptan datos genéricos del comercio para estos campos.
 */
export function buildGetnetCustomer(input: GetnetCustomerInput) {
  const env = process.env;
  const parts = input.fullName.trim().split(/\s+/);
  const firstName = parts[0] || "Cliente";
  const lastName = parts.slice(1).join(" ") || firstName;
  const cuit = (input.cuit ?? "").replace(/\D/g, "");
  const phone = normalizePhone(input.phone);
  return {
    customer_id: input.customerId,
    first_name: firstName.slice(0, 40),
    last_name: lastName.slice(0, 80),
    name: input.fullName.trim().slice(0, 100) || "Cliente Bloom",
    email: env.GETNET_CUSTOMER_FALLBACK_EMAIL?.trim() || "pagos@bloommdp.com",
    document_type: cuit.length === 11 ? "CUIT" : env.GETNET_CUSTOMER_FALLBACK_DOC_TYPE?.trim() || "DNI",
    document_number: cuit.length === 11 ? cuit : env.GETNET_CUSTOMER_FALLBACK_DOC_NUMBER?.trim() || "00000000",
    ...(phone ? { phone_number: `549${phone}` } : {}),
    checked_email: false,
    billing_address: {
      street: env.GETNET_BILLING_STREET?.trim() || "Sin dato",
      number: env.GETNET_BILLING_NUMBER?.trim() || "0",
      city: env.GETNET_BILLING_CITY?.trim() || "Mar del Plata",
      state: env.GETNET_BILLING_STATE?.trim() || "Buenos Aires",
      country: "AR",
      postal_code: env.GETNET_BILLING_POSTAL_CODE?.trim() || "B7600",
    },
  };
}

export async function createPaymentIntent(args: {
  orderId: string;
  cents: number;
  customer: ReturnType<typeof buildGetnetCustomer>;
  successUrl: string;
  errorUrl: string;
}): Promise<{ paymentIntentId: string; redirectUrl: string }> {
  const res = await getnetFetch("/payment-intent", {
    method: "POST",
    body: JSON.stringify({
      order_id: args.orderId,
      payment: { currency: "ARS", amount: args.cents },
      product: [{ product_type: "service", title: "Pago de cuenta corriente - Bloom", value: args.cents, quantity: 1 }],
      customer: args.customer,
      pickup_store: false,
      expires_at: "1h",
      soft_descriptor: "BLOOM CAFE",
      configurations: { success_url: args.successUrl, error_url: args.errorUrl },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { payment_intent_id?: string; redirect_url?: string; message?: string };
  if (!res.ok || !json.payment_intent_id || !json.redirect_url) {
    throw new Error(`Getnet no creó el pago (${res.status}${json.message ? `: ${json.message}` : ""})`);
  }
  return { paymentIntentId: json.payment_intent_id, redirectUrl: json.redirect_url };
}

export type PaymentIntentDetails = {
  status?: string;
  payment_intent_id?: string;
  order_id?: string;
  customer?: { customer_id?: string };
  payment?: { method?: string; amount?: number; currency?: string; result?: { status?: string } };
};

export async function getPaymentIntent(id: string): Promise<PaymentIntentDetails | null> {
  const res = await getnetFetch(`/payment-intent/${encodeURIComponent(id)}`);
  if (!res.ok) {
    console.error("[getnet] consulta de payment intent falló", res.status);
    return null;
  }
  return (await res.json().catch(() => null)) as PaymentIntentDetails | null;
}

/** Demo: solo fuera de producción (Vercel), permite probar el botón Pagar sin credenciales de Getnet. */
export const simulationEnabled = () =>
  (process.env.PAYMENTS_SIMULATION === "true" || process.env.NEXT_PUBLIC_PAYMENTS_SIMULATION === "true") &&
  process.env.VERCEL_ENV !== "production";
