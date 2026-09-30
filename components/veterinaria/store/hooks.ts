"use client";
import { useMemo } from "react";
import type { Category, Product } from "@/lib/vet/types";
import { useCollection } from "@/lib/vet/client/store";
import { INTEGRATIONS } from "@/lib/vet/config/integrations";

/**
 * En modo supabase el servidor ya entrega datos frescos de la base en cada
 * request; en modo demo los cambios del panel viven en el navegador y hay
 * que combinarlos en el cliente.
 */
const LIVE_MERGE = INTEGRATIONS.dataSource === "demo";
import { useCurrentCustomer, useHydrated, useSession } from "@/lib/vet/client/session";

/**
 * Productos "en vivo": muestra primero lo que vino del servidor (rápido y
 * bueno para SEO) y se actualiza con los datos del repositorio (precios y
 * stock que la dueña cambie desde el panel).
 */
export function useLiveProducts(initial: Product[]): Product[] {
  const { items, ready } = useCollection("products", LIVE_MERGE);
  return useMemo(() => {
    if (!ready) return initial;
    const byId = new Map(items.map((p) => [p.id, p]));
    return initial.map((p) => byId.get(p.id) ?? p).filter((p) => p.visible);
  }, [initial, items, ready]);
}

export function useLiveProduct(initial: Product): Product {
  const { items, ready } = useCollection("products", LIVE_MERGE);
  return (ready && items.find((p) => p.id === initial.id)) || initial;
}

export function useCatalog(initialProducts: Product[] = [], initialCategories: Category[] = []) {
  const products = useCollection("products");
  const categories = useCollection("categories");
  return {
    products: products.ready ? products.items : initialProducts,
    categories: categories.ready ? categories.items : initialCategories,
    ready: products.ready && categories.ready,
  };
}

export function useFavoriteIds(): string[] {
  const guest = useSession((s) => s.guestFavorites);
  const { customer } = useCurrentCustomer();
  const hydrated = useHydrated();
  if (!hydrated) return NONE;
  return customer?.favoriteIds ?? guest;
}

const NONE: string[] = [];
