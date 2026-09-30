"use client";
/**
 * Sesión del cliente y del personal.
 *
 * Modo demo: el cliente "ingresa" con su teléfono (sin contraseña) y el
 * personal elige su rol desde el panel. Es SOLO para probar.
 * Modo supabase: el cliente y el staff inician sesión con Supabase Auth
 * (el proyecto ya tiene login por teléfono/email en /auth), y el rol del
 * staff sale de la tabla `vet_staff` + políticas RLS.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Customer, StaffRole } from "../types";
import { INTEGRATIONS } from "../config/integrations";
import { useVetData } from "./store";

interface SessionState {
  customerId: string | null;
  guestFavorites: string[];
  staffRole: StaffRole | null;
  staffName: string;
  setCustomer: (id: string | null) => void;
  toggleGuestFavorite: (id: string) => void;
  clearGuestFavorites: () => void;
  setStaff: (role: StaffRole | null, name?: string) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      customerId: null,
      guestFavorites: [],
      staffRole: null,
      staffName: "",
      setCustomer: (customerId) => set({ customerId }),
      toggleGuestFavorite: (id) => set((s) => ({ guestFavorites: s.guestFavorites.includes(id) ? s.guestFavorites.filter((x) => x !== id) : [...s.guestFavorites, id] })),
      clearGuestFavorites: () => set({ guestFavorites: [] }),
      setStaff: (staffRole, staffName = "") => set({ staffRole, staffName }),
    }),
    { name: "vdp:session", version: 1 },
  ),
);

/** Cliente con sesión iniciada (o null). */
export function useCurrentCustomer(): { customer: Customer | null; ready: boolean } {
  const customerId = useSession((s) => s.customerId);
  const hydrated = useHydrated();
  const items = useVetData((s) => s.data.customers);
  const ensure = useVetData((s) => s.ensure);
  useEffect(() => {
    if (customerId) ensure(["customers"]);
  }, [customerId, ensure]);
  if (!hydrated) return { customer: null, ready: false };
  const customer = customerId ? items?.find((c) => c.id === customerId) ?? null : null;
  return { customer, ready: !customerId || Boolean(items) };
}

/** Evita diferencias de hidratación con datos guardados en el dispositivo. */
const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Rol del personal. En modo supabase se lee de `vet_staff` para el usuario autenticado. */
export function useStaffRole(): { role: StaffRole | null; name: string; ready: boolean; demo: boolean } {
  const demoRole = useSession((s) => s.staffRole);
  const demoName = useSession((s) => s.staffName);
  const hydrated = useHydrated();
  const [remote, setRemote] = useState<{ role: StaffRole | null; name: string; ready: boolean }>({ role: null, name: "", ready: false });
  const isDemo = INTEGRATIONS.dataSource === "demo";

  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return !cancelled && setRemote({ role: null, name: "", ready: true });
      const { data } = await sb.from("vet_staff").select("role, name").eq("user_id", auth.user.id).maybeSingle();
      if (!cancelled) setRemote({ role: (data?.role as StaffRole) ?? null, name: data?.name ?? auth.user.email ?? "", ready: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  if (isDemo) return { role: demoRole, name: demoName, ready: hydrated, demo: true };
  return { ...remote, demo: false };
}
