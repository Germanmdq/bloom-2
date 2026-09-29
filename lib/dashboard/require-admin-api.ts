import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import type { User } from "@supabase/supabase-js";

/** Usuario autenticado y email admin del panel. */
export async function requireDashboardAdmin(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.email || !isAdminEmail(user.email)) return null;
  return user;
}
