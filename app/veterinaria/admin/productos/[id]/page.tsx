import type { Metadata } from "next";
import { ProductEditor } from "@/components/veterinaria/admin/ProductEditor";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";

export const metadata: Metadata = { title: "Producto" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequirePermission perm="products.manage">
      <ProductEditor id={id === "nuevo" ? null : id} />
    </RequirePermission>
  );
}
