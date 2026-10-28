import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import type { User } from "@supabase/supabase-js";

/** Usuario autenticado con acceso operativo al dashboard. */
export async function requireDashboardAdmin(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  if (isAdminEmail(user.email)) return user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_customer")
    .eq("id", user.id)
    .maybeSingle();
  // Un cliente (is_customer) nunca es personal, aunque su rol por defecto sea WAITER.
  if (profile?.is_customer === true) return null;
  if (!["ADMIN", "WAITER", "KITCHEN", "MANAGER"].includes(profile?.role ?? "")) return null;
  return user;
}

/** Solo administradores/encargados (ADMIN, MANAGER o el email admin histórico). Para altas y bajas de personal. */
export async function requireManager(): Promise<User | null> {
  const user = await requireDashboardAdmin();
  if (!user) return null;
  if (isAdminEmail(user.email)) return user;

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return ["ADMIN", "MANAGER"].includes(profile?.role ?? "") ? user : null;
}
