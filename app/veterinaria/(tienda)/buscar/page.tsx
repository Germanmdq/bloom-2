import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicCatalog } from "@/lib/vet/server/catalog";
import { SearchView } from "@/components/veterinaria/store/SearchView";

export const metadata: Metadata = { title: "Buscar", robots: { index: false, follow: true } };

export default async function BuscarPage() {
  const { categories, services } = await getPublicCatalog();
  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
      <Suspense>
        <SearchView categories={categories} services={services.filter((s) => s.visible)} />
      </Suspense>
    </div>
  );
}
