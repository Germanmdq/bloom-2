"use client";
import { Heart } from "lucide-react";
import { vetPath } from "@/lib/vet/config/integrations";
import { useCurrentCustomer, useHydrated } from "@/lib/vet/client/session";
import { useCatalog, useFavoriteIds } from "./hooks";
import { ProductGrid } from "./ProductCard";
import { SignInCard } from "./SignInCard";
import { ButtonLink, EmptyState, Skeleton } from "../ui/primitives";

export function FavoritesView() {
  const hydrated = useHydrated();
  const ids = useFavoriteIds();
  const { customer } = useCurrentCustomer();
  const { products, categories, ready } = useCatalog();
  const favs = products.filter((p) => ids.includes(p.id) && p.visible);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <h1 className="font-vet-display text-3xl font-extrabold tracking-[-0.01em]">Mis favoritos</h1>
      <p className="mb-5 mt-1 text-sm text-neutral-600">Lo que guardaste para comprar después.</p>
      {!hydrated || !ready ? (
        <Skeleton className="h-64" />
      ) : favs.length ? (
        <>
          {!customer && (
            <div className="mb-5">
              <SignInCard title="Guardá tus favoritos" subtitle="Creá tu perfil para no perderlos y verlos desde cualquier dispositivo." />
            </div>
          )}
          <ProductGrid products={favs} categories={categories} />
        </>
      ) : (
        <EmptyState icon={<Heart className="size-6" />} title="Todavía no guardaste favoritos" text="Tocá el ❤️ en cualquier producto para guardarlo acá." action={<ButtonLink href={vetPath("/tienda")}>Explorar la tienda</ButtonLink>} />
      )}
    </div>
  );
}
