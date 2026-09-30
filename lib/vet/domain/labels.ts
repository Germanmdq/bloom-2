import type { AppointmentStatus, DeliveryMethod, OrderStatus, PaymentMethod, Species } from "../types";

export const ORDER_STATUS: Record<OrderStatus, { label: string; emoji: string; tone: "blue" | "amber" | "green" | "violet" | "teal" | "gray" | "red" }> = {
  nuevo: { label: "Nuevo", emoji: "🆕", tone: "blue" },
  pago_pendiente: { label: "Pago pendiente", emoji: "💳", tone: "amber" },
  pagado: { label: "Pagado", emoji: "✅", tone: "green" },
  preparando: { label: "Preparando", emoji: "📦", tone: "violet" },
  en_camino: { label: "En camino", emoji: "🚚", tone: "teal" },
  listo_retirar: { label: "Listo para retirar", emoji: "🏪", tone: "teal" },
  entregado: { label: "Entregado", emoji: "✅", tone: "gray" },
  cancelado: { label: "Cancelado", emoji: "❌", tone: "red" },
};

export const ORDER_FLOW: OrderStatus[] = ["nuevo", "pago_pendiente", "pagado", "preparando", "en_camino", "listo_retirar", "entregado", "cancelado"];

/** Próximo estado sugerido (botón de avance rápido en el panel). */
export function nextOrderStatus(status: OrderStatus, delivery: DeliveryMethod): OrderStatus | null {
  switch (status) {
    case "nuevo":
    case "pago_pendiente":
      return "pagado";
    case "pagado":
      return "preparando";
    case "preparando":
      return delivery === "envio" ? "en_camino" : "listo_retirar";
    case "en_camino":
    case "listo_retirar":
      return "entregado";
    default:
      return null;
  }
}

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: "amber" | "green" | "gray" | "red" | "blue" }> = {
  pendiente: { label: "Pendiente", tone: "amber" },
  confirmado: { label: "Confirmado", tone: "green" },
  completado: { label: "Completado", tone: "gray" },
  cancelado: { label: "Cancelado", tone: "red" },
  ausente: { label: "No asistió", tone: "red" },
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercadopago: "Mercado Pago",
  tarjeta_local: "Tarjeta en el local",
};

export const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  retiro: "Retiro en el local",
  envio: "Envío a domicilio",
};

export const SPECIES_META: Record<Species, { label: string; plural: string; emoji: string }> = {
  perro: { label: "Perro", plural: "Perros", emoji: "🐶" },
  gato: { label: "Gato", plural: "Gatos", emoji: "🐱" },
  conejo: { label: "Conejo", plural: "Conejos", emoji: "🐰" },
  ave: { label: "Ave", plural: "Aves", emoji: "🐦" },
  pequenos: { label: "Pequeño animal", plural: "Pequeños animales", emoji: "🐹" },
  peces: { label: "Pez", plural: "Peces", emoji: "🐠" },
  reptil: { label: "Reptil", plural: "Reptiles", emoji: "🦎" },
  personas: { label: "Pet lovers", plural: "Pet lovers", emoji: "🎁" },
  otro: { label: "Otro", plural: "Otros", emoji: "🐾" },
};

export const PET_SPECIES: Species[] = ["perro", "gato", "conejo", "ave", "pequenos", "peces", "reptil", "otro"];
