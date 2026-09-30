import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountView } from "@/components/veterinaria/store/AccountView";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

export default function CuentaPage() {
  return (
    <Suspense>
      <AccountView />
    </Suspense>
  );
}
