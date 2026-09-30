"use client";
/**
 * Notificaciones PWA.
 *
 * - `requestNotifications()` pide permiso y, si hay clave VAPID configurada,
 *   crea la suscripción push y la guarda (tabla vet_push_subscriptions).
 * - Sin VAPID (hoy) se usan notificaciones locales del dispositivo, por
 *   ejemplo al ver que el pedido cambió de estado.
 * - El envío push real requiere un emisor en el servidor (web-push) que
 *   use la clave privada VAPID: queda documentado en docs/veterinaria.
 */
import { INTEGRATIONS, VET_BASE } from "../config/integrations";
import type { NotificationKind } from "../types";

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function requestNotifications(kinds: NotificationKind[], customerId?: string): Promise<"granted" | "denied" | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  if (INTEGRATIONS.vapidPublicKey) {
    try {
      const reg = await navigator.serviceWorker.getRegistration(VET_BASE);
      const sub = await reg?.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(INTEGRATIONS.vapidPublicKey) });
      if (sub && INTEGRATIONS.dataSource === "supabase") {
        const { createClient } = await import("@/lib/supabase/client");
        const json = sub.toJSON();
        await createClient().from("vet_push_subscriptions").upsert({ endpoint: json.endpoint, keys: json.keys, kinds, customer_id: customerId ?? null }, { onConflict: "endpoint" });
      }
    } catch (err) {
      console.warn("[vet] push", err);
    }
  }
  try {
    localStorage.setItem("vdp:notify-kinds", JSON.stringify(kinds));
  } catch {}
  return "granted";
}

/** Notificación local (sin servidor), p. ej. "Tu pedido está listo para retirar". */
export async function localNotify(title: string, body: string, url = VET_BASE, tag?: string) {
  if (notificationPermission() !== "granted") return;
  const reg = await navigator.serviceWorker.getRegistration(VET_BASE);
  if (reg) reg.showNotification(title, { body, icon: `${VET_BASE}/icons/icon-192.png`, tag, data: { url } });
  else new Notification(title, { body, icon: `${VET_BASE}/icons/icon-192.png`, tag });
}
