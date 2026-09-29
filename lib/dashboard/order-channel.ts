import type { Order } from "@/lib/types";

/** Canal visual: delivery > mesa POS > retiro (web local / sucursal). */
export type OrderChannel = "mesa" | "delivery" | "retiro";

export function getOrderChannel(order: Pick<Order, "delivery_type" | "order_type" | "table_id">): OrderChannel {
  const dt = String(order.delivery_type ?? "").toLowerCase();
  const ot = String(order.order_type ?? "").toLowerCase();
  if (dt === "delivery") return "delivery";
  if (order.table_id != null && ot !== "web") return "mesa";
  return "retiro";
}

export const CHANNEL_LEFT: Record<OrderChannel, string> = {
  mesa: "border-l-4 border-l-red-500",
  delivery: "border-l-4 border-l-green-500",
  retiro: "border-l-4 border-l-amber-400",
};

export const CHANNEL_BADGE: Record<OrderChannel, string> = {
  mesa: "bg-red-500 text-white",
  delivery: "bg-green-600 text-white",
  retiro: "bg-amber-400 text-gray-900",
};

export const CHANNEL_LABEL: Record<OrderChannel, string> = {
  mesa: "Mesa",
  delivery: "Delivery",
  retiro: "Retiro",
};
