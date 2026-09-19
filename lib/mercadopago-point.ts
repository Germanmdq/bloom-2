import { getMercadoPagoAccessToken } from "@/lib/mercadopago-access-token";

const POINT_API = "https://api.mercadopago.com/point/integration-api";

export function pointApiAuthHeaders(): HeadersInit {
  const token = getMercadoPagoAccessToken();
  if (!token) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (process.env.MERCADOPAGO_POINT_SANDBOX === "true") {
    h["x-test-scope"] = "sandbox";
  }
  return h;
}

export function pointApiHeaders(): HeadersInit {
  return {
    ...pointApiAuthHeaders(),
    "Content-Type": "application/json",
  };
}

/** Monto en API Point: entero con centavos (ej. $15,00 ARS → 1500). */
export function amountToPointApiCents(pesos: number): number {
  return Math.max(1, Math.round(pesos * 100));
}

export function getMercadoPagoDeviceId(): string | undefined {
  return process.env.MERCADOPAGO_DEVICE_ID?.trim() || undefined;
}

export async function pointListDevices(): Promise<Response> {
  return fetch(`${POINT_API}/devices`, {
    method: "GET",
    headers: pointApiAuthHeaders(),
  });
}

export async function pointCreatePaymentIntent(deviceId: string, body: unknown): Promise<Response> {
  const enc = encodeURIComponent(deviceId);
  return fetch(`${POINT_API}/devices/${enc}/payment-intents`, {
    method: "POST",
    headers: pointApiHeaders(),
    body: JSON.stringify(body),
  });
}

export async function pointGetPaymentIntent(paymentIntentId: string): Promise<Response> {
  const enc = encodeURIComponent(paymentIntentId);
  return fetch(`${POINT_API}/payment-intents/${enc}`, {
    method: "GET",
    headers: pointApiAuthHeaders(),
  });
}

export async function pointSetOperatingMode(deviceId: string, mode: "PDV" | "STANDALONE"): Promise<Response> {
  const enc = encodeURIComponent(deviceId);
  return fetch(`${POINT_API}/devices/${enc}`, {
    method: "PATCH",
    headers: pointApiHeaders(),
    body: JSON.stringify({ operating_mode: mode }),
  });
}

/** Obtiene el payment intent activo del dispositivo. */
export async function pointGetDeviceCurrentIntent(deviceId: string): Promise<Response> {
  const enc = encodeURIComponent(deviceId);
  return fetch(`${POINT_API}/devices/${enc}/payment-intents`, {
    method: "GET",
    headers: pointApiAuthHeaders(),
  });
}

/** Cancela un payment intent por su ID. */
export async function pointDeleteIntent(paymentIntentId: string): Promise<Response> {
  const enc = encodeURIComponent(paymentIntentId);
  return fetch(`${POINT_API}/payment-intents/${enc}`, {
    method: "DELETE",
    headers: pointApiAuthHeaders(),
  });
}

/**
 * Cancela el intent activo del dispositivo:
 * 1. GET intent actual → obtiene el ID
 * 2. DELETE ese intent por ID
 */
export async function pointCancelCurrentIntent(deviceId: string): Promise<void> {
  const getResp = await pointGetDeviceCurrentIntent(deviceId);
  if (!getResp.ok) return; // no hay intent activo
  const data = (await getResp.json().catch(() => ({}))) as { id?: string };
  if (!data.id) return;
  await pointDeleteIntent(data.id).catch(() => null);
}
