"use client";
import { Suspense } from "react";
import { CustomersAdmin } from "@/components/veterinaria/admin/CustomersAdmin";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";

export default function Page() {
  return (
    <RequirePermission perm="customers.view">
      <Suspense>
        <CustomersAdmin />
      </Suspense>
    </RequirePermission>
  );
}
