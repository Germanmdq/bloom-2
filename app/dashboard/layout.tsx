import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { DashboardClientLayout } from "@/components/dashboard/DashboardClientLayout";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/acceso");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_customer")
    .eq("id", user.id)
    .single();

  // Un MANAGER es personal operativo igual que un administrador. Antes quedaba
  // fuera de este control y era redirigido a /acceso aun con una sesión válida.
  const isStaff = !profile?.is_customer && (
    profile?.role === "ADMIN" ||
    profile?.role === "MANAGER" ||
    profile?.role === "WAITER" ||
    profile?.role === "KITCHEN" ||
    isAdminEmail(user.email)
  );

  if (!isStaff) {
    redirect("/acceso");
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
