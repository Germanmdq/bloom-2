"use client";

import { motion } from "framer-motion";
import { IconClock, IconAlertTriangle, IconShoppingBag, IconToolsKitchen2, IconTruck } from "@tabler/icons-react";

export type CardKind = "LOCAL" | "TAKEAWAY" | "DELIVERY";
export type CardState = "unsent" | "pending" | "cooking" | "ready";

const KIND = {
    LOCAL: { label: "Salón", Icon: IconToolsKitchen2 },
    TAKEAWAY: { label: "Retiro", Icon: IconShoppingBag },
    DELIVERY: { label: "Delivery", Icon: IconTruck },
} as const;

// El color fuerte es solo del ESTADO. El tipo usa tonos neutros de la paleta.
const STATE = {
    unsent: { label: "Sin enviar", color: "#8a8570" },
    pending: { label: "Pendiente", color: "#c98a2b" },
    cooking: { label: "En cocina", color: "#2f6f7e" },
    ready: { label: "Listo", color: "#3f8a5a" },
} as const;
const ALERT_COLOR = "#b5472f";

/** Minutos a partir de los cuales un pedido se considera demorado (listo sin retirar: la mitad). */
export function isDelayed(state: CardState, minutes: number) {
    return minutes >= (state === "ready" ? 15 : 30);
}

export function formatElapsed(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
    return `${Math.floor(minutes / 1440)} d`;
}

type Props = {
    layoutId: string;
    kind: CardKind;
    name: string;
    detail?: string | null;
    state: CardState;
    itemCount: number;
    total: number;
    minutes: number;
    onClick: () => void;
};

export function OrderCard({ layoutId, kind, name, detail, state, itemCount, total, minutes, onClick }: Props) {
    const k = KIND[kind];
    const s = STATE[state];
    const delayed = isDelayed(state, minutes);
    const accent = delayed ? ALERT_COLOR : s.color;

    return (
        <motion.div
            layoutId={layoutId}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="relative flex min-h-[168px] cursor-pointer flex-col gap-2.5 overflow-hidden rounded-[20px] bg-white/90 p-3.5 sm:p-4 shadow-[0_6px_20px_rgba(26,48,40,0.10)]"
            style={{ border: `1.5px solid ${delayed ? ALERT_COLOR : "rgba(196,184,150,0.55)"}` }}
        >
            <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent }} />

            <div className="mt-1 flex items-center justify-between gap-2">
                <span
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold"
                    style={{ backgroundColor: "rgba(196,184,150,0.28)", color: "#6b6756" }}
                >
                    <k.Icon size={14} strokeWidth={2} />
                    {k.label}
                </span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold" style={{ color: delayed ? ALERT_COLOR : "#6b6756" }}>
                    {delayed ? <IconAlertTriangle size={14} strokeWidth={2.4} /> : <IconClock size={14} strokeWidth={2} />}
                    {formatElapsed(minutes)}
                </span>
            </div>

            <div className="min-w-0 flex-1">
                <p className="break-words text-[17px] font-black leading-tight text-[#1a3028] sm:text-xl">{name}</p>
                {detail && <p className="mt-0.5 break-words text-[11px] font-semibold leading-snug text-[#6b6756]">{detail}</p>}
            </div>

            <span
                className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white"
                style={{ backgroundColor: s.color }}
            >
                {s.label}
            </span>
            {delayed && (
                <span className="-mt-1 text-[11px] font-black uppercase tracking-wide" style={{ color: ALERT_COLOR }}>
                    Demorado
                </span>
            )}

            <div className="flex flex-wrap items-end justify-between gap-x-2 border-t pt-2" style={{ borderColor: "rgba(196,184,150,0.45)" }}>
                <span className="text-xs font-bold text-[#6b6756]">{itemCount > 0 ? `${itemCount} ${itemCount === 1 ? "ítem" : "ítems"}` : "Sin ítems"}</span>
                <span className="whitespace-nowrap text-xl font-black leading-none text-[#1a3028]">
                    ${Number(total || 0).toLocaleString("es-AR")}
                </span>
            </div>
        </motion.div>
    );
}
