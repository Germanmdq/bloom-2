/** Colores POS: local (mesa salón) = rojo, delivery = azul, retiro = amarillo */

import { WEB_ORDER_TABLE_DELIVERY, WEB_ORDER_TABLE_RETIRO } from "@/lib/orders/web-virtual-tables";

export type TableChannel = "local" | "delivery" | "retiro";

export function tableChannelFromId(id: number): TableChannel {
    if (id === WEB_ORDER_TABLE_RETIRO) return "retiro";
    if (id === WEB_ORDER_TABLE_DELIVERY) return "delivery";
    if (id >= 201) return "retiro";
    if (id >= 100) return "delivery";
    return "local";
}

/** Tarjeta ocupada — degradado de fondo */
export function occupiedCardGradient(id: number): string {
    const ch = tableChannelFromId(id);
    if (ch === "retiro") return "bg-gradient-to-br from-amber-400 to-amber-600";
    if (ch === "delivery") return "bg-gradient-to-br from-green-500 to-green-700";
    return "bg-gradient-to-br from-red-500 to-red-700";
}

/** Barra de tiempo dentro de la tarjeta */
export function occupiedTimeBarFill(id: number, minutes: number): string {
    if (minutes > 60) return "bg-white/90";
    if (minutes > 30) return "bg-white/60";
    return "bg-white/40";
}

/** Lista: fila seleccionada */
export function listRowSelectedClass(id: number): string {
    const ch = tableChannelFromId(id);
    if (ch === "retiro") return "bg-amber-50 border-r-2 border-amber-500";
    if (ch === "delivery") return "bg-green-50 border-r-2 border-green-500";
    return "bg-red-50 border-r-2 border-red-500";
}

export function listPulseDotClass(id: number): string {
    const ch = tableChannelFromId(id);
    if (ch === "retiro") return "bg-amber-500";
    if (ch === "delivery") return "bg-green-500";
    return "bg-red-500";
}

export function listSubPriceClass(id: number): string {
    const ch = tableChannelFromId(id);
    if (ch === "retiro") return "text-amber-700";
    if (ch === "delivery") return "text-green-700";
    return "text-red-700";
}

/** Barra superior del panel de pedido (mesa / delivery / retiro) */
export function orderSheetHeaderBorderClass(tableId: number): string {
    if (tableId === WEB_ORDER_TABLE_RETIRO) return "border-t-4 border-t-amber-500";
    if (tableId === WEB_ORDER_TABLE_DELIVERY) return "border-t-4 border-t-blue-600";
    if (tableId >= 201) return "border-t-4 border-t-amber-500";
    if (tableId >= 100) return "border-t-4 border-t-green-600";
    return "border-t-4 border-t-red-600";
}
