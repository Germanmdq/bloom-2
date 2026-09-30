/**
 * Lectura del catálogo en el SERVIDOR (páginas públicas, SEO, sitemap).
 * Modo demo → datos semilla. Modo supabase → base de datos (solo lectura pública).
 */
import { cache } from "react";
import type { Category, Combo, Coupon, Faq, Product, RecommendationRule, Review, Service, VetSettings } from "../types";
import { INTEGRATIONS } from "../config/integrations";
import { getSeedProducts, SEED_CATEGORIES } from "../catalog";
import { SEED_SERVICES } from "../catalog/services";
import { SEED_FAQS, SEED_RECOMMENDATION_RULES } from "../catalog/settings";
import { mergeSettings } from "../data/settings";
import { seedFor } from "../data/seed";

export interface PublicCatalog {
  products: Product[];
  categories: Category[];
  services: Service[];
  combos: Combo[];
  coupons: Coupon[];
  reviews: Review[];
  faqs: Faq[];
  rules: RecommendationRule[];
  settings: VetSettings;
}

async function fromSupabase(): Promise<PublicCatalog> {
  const { createClient } = await import("@supabase/supabase-js");
  const { getSupabaseAnonKey, getSupabaseUrl } = await import("@/lib/supabase/env");
  const { SupabaseRepository } = await import("../data/supabase-repository");
  const repo = new SupabaseRepository(createClient(getSupabaseUrl(), getSupabaseAnonKey(), { auth: { persistSession: false } }));
  const [products, categories, services, combos, coupons, reviews, faqs, rules, settings] = await Promise.all([
    repo.list("products"), repo.list("categories"), repo.list("services"), repo.list("combos"),
    repo.list("coupons"), repo.list("reviews"), repo.list("faqs"), repo.list("recommendationRules"), repo.getSettings(),
  ]);
  return { products, categories, services, combos, coupons, reviews, faqs, rules, settings: mergeSettings(settings) };
}

export const getPublicCatalog = cache(async (): Promise<PublicCatalog> => {
  if (INTEGRATIONS.dataSource === "supabase") {
    try {
      return await fromSupabase();
    } catch (err) {
      console.error("[vet] No se pudo leer el catálogo de Supabase, uso datos semilla", err);
    }
  }
  return {
    products: getSeedProducts(),
    categories: SEED_CATEGORIES,
    services: SEED_SERVICES,
    combos: seedFor("combos", true),
    coupons: seedFor("coupons", true),
    reviews: seedFor("reviews", true),
    faqs: SEED_FAQS,
    rules: SEED_RECOMMENDATION_RULES,
    settings: mergeSettings(null),
  };
});

export async function getProductBySlug(slug: string) {
  const c = await getPublicCatalog();
  return c.products.find((p) => p.slug === slug && p.visible) ?? null;
}

export async function getCategoryBySlug(slug: string) {
  const c = await getPublicCatalog();
  return c.categories.find((x) => x.slug === slug && x.visible) ?? null;
}

export async function getServiceBySlug(slug: string) {
  const c = await getPublicCatalog();
  return c.services.find((x) => x.slug === slug && x.visible) ?? null;
}
