/**
 * WhatsApp: hoy funciona con enlaces wa.me (sin API ni credenciales).
 * La interfaz `WhatsAppSender` permite conectar después WhatsApp Business
 * Cloud API desde el servidor sin cambiar las pantallas.
 */
import type { OrderItem } from "../types";
import { formatMoney } from "./format";

export function onlyDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Normaliza teléfonos argentinos a formato internacional para wa.me. */
export function toWhatsAppNumber(phone: string): string {
  let d = onlyDigits(phone);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) {
    if (!d.startsWith("549")) d = "549" + d.slice(2).replace(/^0/, "");
    return d;
  }
  d = d.replace(/^0/, "").replace(/^(\d{2,4})15/, "$1");
  return "549" + d;
}

export function waLink(phone: string | null | undefined, text: string): string {
  const base = phone ? `https://wa.me/${toWhatsAppNumber(phone)}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export const WA_MESSAGES = {
  product: (name: string, url?: string) => `Hola, quiero consultar por el producto ${name}.${url ? `\n${url}` : ""}`,
  buyProduct: (name: string, variant?: string, url?: string) => `Hola, quiero comprar ${name}${variant ? ` (${variant})` : ""}.${url ? `\n${url}` : ""}`,
  availability: (name: string) => `Hola, ¿tienen disponibilidad de ${name}?`,
  consultation: (name: string) => `Hola, quiero consultar por ${name}. ¿Me pueden asesorar?`,
  appointment: (service?: string) => `Hola, quiero reservar un turno${service ? ` para ${service}` : ""}.`,
  help: () => "Hola, necesito ayuda.",
  cart: (items: OrderItem[], total: number, extra?: string) =>
    [
      "Hola, quiero realizar este pedido:",
      "",
      ...items.map((i) => `• ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} x${i.quantity} — ${formatMoney(i.unitPrice * i.quantity)}`),
      "",
      `Total: ${formatMoney(total)}`,
      extra ? `\n${extra}` : "",
    ]
      .join("\n")
      .trim(),
};

/** Reemplaza {variables} en plantillas de automatizaciones. */
export function fillTemplate(template: string, vars: Record<string, string | number | undefined | null>): string {
  return template
    .replace(/\{(\w+)\}/g, (_, k) => {
      const v = vars[k];
      return v == null ? "" : String(v);
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Contrato para un envío automático futuro (WhatsApp Business API, email, etc.). */
export interface MessageSender {
  channel: "whatsapp_api" | "email" | "push";
  send(to: string, message: string, meta?: Record<string, string>): Promise<{ ok: boolean; id?: string; error?: string }>;
}
