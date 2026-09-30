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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!["ADMIN", "WAITER", "KITCHEN", "MANAGER"].includes(profile?.role ?? "")) return null;
  return user;
}
