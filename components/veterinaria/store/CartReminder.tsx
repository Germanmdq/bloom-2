"use client";
/**
 * Recuperación de carritos: si el cliente vuelve y tiene productos sin
 * comprar desde hace un rato, se lo recordamos UNA vez, sin insistir.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { useCart, cartCount } from "@/lib/vet/client/cart";
import { useSettings } from "@/lib/vet/client/store";
import { vetPath } from "@/lib/vet/config/integrations";
import { track } from "@/lib/vet/client/analytics";

export function CartReminder() {
  const { lines, updatedAt, reminderShownAt, markReminderShown } = useCart();
  const settings = useSettings();
  const pathname = usePathname() ?? "";
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!lines.length || !updatedAt) return;
    if (pathname.startsWith(vetPath("/carrito")) || pathname.startsWith(vetPath("/checkout"))) return;
    const idleMin = (Date.now() - new Date(updatedAt).getTime()) / 60000;
    const alreadyShown = reminderShownAt && new Date(reminderShownAt) > new Date(updatedAt);
    if (idleMin >= settings.abandonedCartMinutes && !alreadyShown) {
      setShow(true);
      markReminderShown();
      track("cart_abandoned", { items: lines.length, idleMin: Math.round(idleMin) });
    }
  }, [lines.length, updatedAt]);

  if (!show) return null;
  const n = cartCount(lines);
  return (
    <div role="status" className="fixed inset-x-3 bottom-[88px] z-50 mx-auto max-w-md vet-rise lg:bottom-6 lg:left-6 lg:right-auto">
      <div className="flex items-center gap-3 rounded-3xl bg-vet-ink p-3 pl-4 text-white shadow-2xl">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10">
          <ShoppingBag className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">¿Te olvidaste de algo?</p>
          <p className="text-xs text-white/75">Tenés {n} {n === 1 ? "producto" : "productos"} esperándote en el carrito.</p>
        </div>
        <Link
          href={vetPath("/carrito")}
          onClick={() => {
            setShow(false);
            track("cart_recovered", { items: lines.length });
          }}
          className="inline-flex h-10 shrink-0 items-center rounded-xl bg-white px-3.5 text-sm font-bold text-vet-ink"
        >
          Ver carrito
        </Link>
        <button type="button" onClick={() => setShow(false)} className="grid size-9 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10" aria-label="Cerrar aviso">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
