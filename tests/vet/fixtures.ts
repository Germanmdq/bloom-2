import type { Category, Product, Service } from "../../lib/vet/types";
import { DEFAULT_SETTINGS } from "../../lib/vet/catalog/settings";

export const now = new Date(2026, 8, 30, 10, 0, 0); // 30/09/2026 10:00 (miércoles)

export function product(p: Partial<Product> & { id: string }): Product {
  return {
    slug: p.id,
    name: p.id,
    categoryId: "juguetes",
    species: ["perro"],
    tags: [],
    images: [],
    price: 1000,
    variants: [],
    stock: null,
    minStock: 2,
    visible: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...p,
  };
}

export const categories: Category[] = [
  { id: "juguetes", slug: "juguetes", name: "Juguetes", icon: "Bone", order: 1, visible: true },
  { id: "higiene", slug: "higiene", name: "Higiene y peluquería", icon: "Sparkles", order: 2, visible: true, consumable: true },
  { id: "farmacia", slug: "farmacia", name: "Farmacia veterinaria", icon: "Pill", order: 3, visible: true, requiresConsultation: true },
  { id: "descanso", slug: "descanso", name: "Hogar y descanso", icon: "BedDouble", order: 4, visible: true },
];

export const service: Service = {
  id: "bano",
  slug: "bano",
  kind: "bano",
  name: "Baño",
  icon: "ShowerHead",
  durationMin: 60,
  price: null,
  days: [1, 2, 3, 4, 5, 6],
  hours: [{ from: "09:00", to: "13:00" }],
  capacity: 1,
  species: ["perro"],
  visible: true,
  order: 1,
};

export const settings = DEFAULT_SETTINGS;
