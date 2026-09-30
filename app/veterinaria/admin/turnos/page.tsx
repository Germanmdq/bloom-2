import { Suspense } from "react";
import type { Metadata } from "next";
import { AppointmentsAdmin } from "@/components/veterinaria/admin/AppointmentsAdmin";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";

export const metadata: Metadata = { title: "Turnos" };

export default function Page() {
  return (
    <RequirePermission perm="appointments.manage">
      <Suspense>
        <AppointmentsAdmin />
      </Suspense>
    </RequirePermission>
  );
}
