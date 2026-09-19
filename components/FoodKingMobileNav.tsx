"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { PublicAccountNav } from "@/components/PublicAccountNav";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/menu", label: "Menú" },
  { href: "/about", label: "Nosotros" },
  { href: "/reservations", label: "Reservas" },
] as const;

export function FoodKingMobileNavButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="xl:hidden flex items-center justify-center w-11 h-11 rounded-xl border-2 border-bloom-200 bg-white shadow-sm active:scale-[0.98] text-bloom-600"
      aria-label="Abrir menú de navegación"
    >
      <IconMenu2 size={22} strokeWidth={2.5} />
    </button>
  );
}

export function FoodKingMobileNavPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm xl:hidden"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 right-0 z-[90] w-[min(100vw,20rem)] shadow-2xl flex flex-col xl:hidden border-l-2 border-bloom-200 bg-bloom-page"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-bloom-200 bg-white">
              <span className="font-black text-lg tracking-tighter text-neutral-900">
                BLOOM<span className="text-english-600">.</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-bloom-50 text-neutral-600"
                aria-label="Cerrar menú"
              >
                <IconX size={22} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="block px-4 py-3.5 rounded-xl font-black text-neutral-800 hover:bg-white border border-transparent hover:border-bloom-200 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-4 pb-3 flex justify-center">
              <PublicAccountNav className="scale-105" onAfterNavigate={onClose} />
            </div>
            <div className="p-4 border-t border-bloom-200 bg-white">
              <Link
                href="/menu"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-black text-white shadow-md bg-bloom-600 hover:bg-bloom-700 active:scale-[0.98] transition-colors"
              >
                Pedir ahora
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
