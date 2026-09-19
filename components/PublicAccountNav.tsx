"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { IconUser, IconChevronDown, IconLogout, IconSettings } from "@tabler/icons-react";

type Props = {
  className?: string;
  onAfterNavigate?: () => void;
  tone?: "default" | "onDark";
};

export function PublicAccountNav({ className = "", onAfterNavigate, tone = "default" }: Props) {
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const sessionCheckedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      sessionCheckedRef.current = true;
      setUser(session?.user ?? null);
      setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!sessionCheckedRef.current) return;
      setUser(session?.user ?? null);
    });

    // Close on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => { 
      cancelled = true; 
      subscription.unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [supabase]);

  const dark = tone === "onDark";

  if (!ready) return <div className={`h-8 w-24 rounded-full animate-pulse ${dark ? "bg-white/20" : "bg-neutral-200/70"} ${className}`} aria-hidden />;

  if (user) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors ${dark ? "text-white/80 hover:text-white" : "text-neutral-500 hover:text-neutral-900"} ${className}`}
        >
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 shadow-sm border border-black/5">
            <IconUser size={14} />
          </div>
          <span className="hidden sm:inline">Mi cuenta</span>
          <IconChevronDown size={14} className={`hidden sm:block transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute right-0 mt-3 w-48 overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-[100] py-1.5"
            >
               <Link
                href="/cuenta"
                onClick={() => { setIsOpen(false); onAfterNavigate?.(); }}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                    <IconSettings size={14} className="text-neutral-400" />
                    Ver mi cuenta
                </Link>
                <div className="h-px bg-neutral-50 mx-3 my-1" />
                <button
                onClick={async () => { 
                    setIsOpen(false);
                    await supabase.auth.signOut(); 
                    onAfterNavigate?.(); 
                }}
                className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                >
                    <IconLogout size={14} />
                    Cerrar sesión
                </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Link
      href="/auth"
      onClick={() => onAfterNavigate?.()}
      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[12px] sm:text-[13px] font-bold transition-all ${
        dark 
          ? "bg-white/10 text-white hover:bg-white/20" 
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
      } ${className}`}
    >
      <IconUser size={14} className="sm:mr-1.5" />
      <span className="hidden sm:inline">Iniciar sesión</span>
    </Link>
  );
}

