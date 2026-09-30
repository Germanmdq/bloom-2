/**
 * Categorías de la tienda, armadas a partir del catálogo real
 * (`catalogo_miri_fotos_en_plantilla.xlsx`). El mapeo "categoría del Excel →
 * categoría de la tienda" está en `scripts/vet-import-catalog.mjs`.
 *
 * Se pueden renombrar, reordenar, ocultar o crear nuevas desde
 * /veterinaria/admin/categorias.
 */
import type { Category } from "../types";

export const SEED_CATEGORIES: Category[] = [
  {
    id: "farmacia",
    slug: "farmacia-veterinaria",
    name: "Farmacia veterinaria",
    description: "Antiparasitarios, suplementos y medicamentos. Siempre con indicación profesional.",
    icon: "Pill",
    order: 1,
    visible: true,
    requiresConsultation: true,
    consumable: true,
  },
  {
    id: "higiene",
    slug: "higiene-y-peluqueria",
    name: "Higiene y peluquería",
    description: "Shampoos, cepillos, cortaúñas y todo para el cuidado diario.",
    icon: "Sparkles",
    order: 2,
    visible: true,
    consumable: true,
  },
  {
    id: "paseo",
    slug: "collares-arneses-y-correas",
    name: "Collares, arneses y correas",
    description: "Paseos cómodos y seguros para cada tamaño.",
    icon: "Footprints",
    order: 3,
    visible: true,
  },
  {
    id: "juguetes",
    slug: "juguetes",
    name: "Juguetes",
    description: "Peluches, pelotas e interactivos para perros y gatos.",
    icon: "Bone",
    order: 4,
    visible: true,
  },
  {
    id: "indumentaria",
    slug: "ropa-y-abrigos",
    name: "Ropa y abrigos",
    description: "Buzos, chalecos, polares y bandanas para todas las temporadas.",
    icon: "Shirt",
    order: 5,
    visible: true,
  },
  {
    id: "comederos",
    slug: "comederos-y-bebederos",
    name: "Comederos y bebederos",
    description: "Platos, dispensadores y botellas para paseo.",
    icon: "Soup",
    order: 6,
    visible: true,
  },
  {
    id: "descanso",
    slug: "hogar-y-descanso",
    name: "Hogar y descanso",
    description: "Camas, paños, rascadores y accesorios para la casa.",
    icon: "BedDouble",
    order: 7,
    visible: true,
  },
  {
    id: "transporte",
    slug: "transporte",
    name: "Transporte",
    description: "Bolsos y transportadoras para viajar tranquilos.",
    icon: "Luggage",
    order: 8,
    visible: true,
  },
  {
    id: "regalos",
    slug: "regalos-pet-lovers",
    name: "Regalos pet lovers",
    description: "Llaveros, bijouterie y deco para quienes aman a sus mascotas.",
    icon: "Gift",
    order: 9,
    visible: true,
  },
  {
    id: "otros",
    slug: "otros-accesorios",
    name: "Otros accesorios",
    description: "Productos del catálogo pendientes de revisión.",
    icon: "Package",
    order: 10,
    // El Excel los marca "Por revisar": quedan ocultos hasta que la dueña los revise.
    visible: false,
  },
];
