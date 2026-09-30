"use client";
/**
 * Carrito del cliente. Se guarda en el dispositivo (no es información
 * crítica) y se registra como "carrito abierto" para poder recuperarlo si
 * el cliente no termina la compra.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "../domain/pricing";
import { track } from "./analytics";

export interface CartState {
  lines: CartLine[];
  couponCode: string;
  updatedAt: string | null;
  /** Momento en que se mostró el aviso "¿Te olvidaste de algo?" (para no insistir). */
  reminderShownAt: string | null;
  add: (line: CartLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setCoupon: (code: string) => void;
  markReminderShown: () => void;
}

export const lineKey = (l: Pick<CartLine, "productId" | "variantId" | "comboId">) => l.comboId ? `combo:${l.comboId}` : `${l.productId}:${l.variantId ?? ""}`;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      couponCode: "",
      updatedAt: null,
      reminderShownAt: null,
      add: (line) =>
        set((s) => {
          const key = lineKey(line);
          const exists = s.lines.find((l) => lineKey(l) === key);
          track("add_to_cart", { productId: line.productId, variantId: line.variantId, comboId: line.comboId, quantity: line.quantity });
          return {
            lines: exists ? s.lines.map((l) => (lineKey(l) === key ? { ...l, quantity: Math.min(99, l.quantity + line.quantity) } : l)) : [...s.lines, line],
            updatedAt: new Date().toISOString(),
          };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines: quantity <= 0 ? s.lines.filter((l) => lineKey(l) !== key) : s.lines.map((l) => (lineKey(l) === key ? { ...l, quantity: Math.min(99, quantity) } : l)),
          updatedAt: new Date().toISOString(),
        })),
      remove: (key) =>
        set((s) => {
          track("remove_from_cart", { key });
          return { lines: s.lines.filter((l) => lineKey(l) !== key), updatedAt: new Date().toISOString() };
        }),
      clear: () => set({ lines: [], couponCode: "", updatedAt: null, reminderShownAt: null }),
      setCoupon: (couponCode) => set({ couponCode }),
      markReminderShown: () => set({ reminderShownAt: new Date().toISOString() }),
    }),
    { name: "vdp:cart", version: 1 },
  ),
);

export function cartCount(lines: CartLine[]) {
  return lines.reduce((s, l) => s + l.quantity, 0);
}
