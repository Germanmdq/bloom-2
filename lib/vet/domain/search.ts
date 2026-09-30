/**
 * Buscador inteligente: encuentra productos por nombre, marca, categoría,
 * especie o característica, tolerando acentos, plurales, sinónimos y
 * errores de tipeo ("comida perro", "antipulgas", "arena gato", "shampo").
 */
import type { Category, Product, Service } from "../types";
import { normalizeText } from "./format";

/** Sinónimos → términos que existen en el catálogo. Ampliable desde acá. */
export const SYNONYMS: Record<string, string[]> = {
  comida: ["alimento", "balanceado", "comedero"],
  alimento: ["comida", "balanceado"],
  perro: ["perros", "canino", "cachorro", "can"],
  perros: ["perro"],
  cachorro: ["perro", "cachorros", "puppy", "junior"],
  gato: ["gatos", "felino", "gatito", "michi"],
  gatos: ["gato"],
  gatito: ["gato", "kitten"],
  antipulgas: ["pulgas", "pipeta", "antiparasitario", "garrapatas", "spot"],
  pulgas: ["antipulgas", "pipeta", "antiparasitario"],
  pipeta: ["antipulgas", "spot", "antiparasitario"],
  garrapatas: ["antipulgas", "antiparasitario"],
  desparasitario: ["antiparasitario", "albendazol", "parasitos"],
  antiparasitario: ["antipulgas", "desparasitario", "pipeta"],
  arena: ["piedras", "sanitaria", "bentonita", "pino", "wincat", "piedritas"],
  piedritas: ["arena", "sanitaria"],
  shampoo: ["champu", "shampu", "baño", "higiene"],
  champu: ["shampoo"],
  cepillo: ["peine", "saca", "manopla", "cardina"],
  juguete: ["juguetes", "pelota", "peluche", "mordillo", "soga"],
  juguetes: ["juguete"],
  pelota: ["juguete", "pelotas"],
  cama: ["camas", "colchon", "cucha", "moises", "descanso"],
  cucha: ["cama"],
  correa: ["correas", "pretal", "arnes", "collar", "paseo"],
  arnes: ["pretal", "correa"],
  pretal: ["arnes", "correa"],
  collar: ["collares", "correa"],
  ropa: ["buzo", "polar", "abrigo", "chaleco", "capa", "indumentaria"],
  abrigo: ["buzo", "polar", "campera", "capa", "ropa"],
  buzo: ["ropa", "abrigo", "polar"],
  transportadora: ["bolso", "canil", "transporte"],
  bolso: ["transportadora"],
  plato: ["comedero", "bebedero"],
  comedero: ["plato", "bebedero"],
  bebedero: ["agua", "comedero", "botella"],
  rascador: ["gato", "sisal"],
  snack: ["snacks", "premio", "golosina", "hueso"],
  premio: ["snack", "golosina"],
  vitamina: ["suplemento", "vitaminas"],
  suplemento: ["vitamina", "omega"],
  oido: ["oidos", "otico", "aurix"],
  ojo: ["ojos", "colirio", "oftalmico"],
  diente: ["dientes", "dental", "antiplaca"],
  ave: ["aves", "pajaro", "loro", "canario"],
  conejo: ["conejos", "pequenos", "roedor"],
  hamster: ["pequenos", "roedor"],
};

const SPECIES_WORDS: Record<string, string> = {
  perro: "perro", perros: "perro", cachorro: "perro", canino: "perro",
  gato: "gato", gatos: "gato", gatito: "gato", felino: "gato",
  conejo: "conejo", ave: "ave", aves: "ave", pajaro: "ave", hamster: "pequenos",
};

function stem(w: string): string {
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

interface IndexedDoc<T> {
  item: T;
  fields: { words: string[]; weight: number }[];
  species: string[];
}

function words(s: string | undefined): string[] {
  return s ? normalizeText(s).split(" ").filter(Boolean) : [];
}

function termMatch(term: string, docWords: string[]): number {
  const t = stem(term);
  let best = 0;
  for (const w of docWords) {
    const sw = stem(w);
    if (sw === t) return 1;
    if (t.length >= 3 && sw.startsWith(t)) best = Math.max(best, 0.8);
    else if (t.length >= 4 && sw.includes(t)) best = Math.max(best, 0.6);
    else if (t.length >= 5 && levenshtein(t, sw) <= 1) best = Math.max(best, 0.7);
    else if (t.length >= 7 && levenshtein(t, sw) <= 2) best = Math.max(best, 0.5);
  }
  return best;
}

export interface SearchResult<T> {
  item: T;
  score: number;
}

export function createProductSearch(products: Product[], categories: Category[]) {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const docs: IndexedDoc<Product>[] = products.map((p) => ({
    item: p,
    species: p.species,
    fields: [
      { words: words(p.name), weight: 3 },
      { words: words(p.brand), weight: 2.5 },
      { words: [...words(catById.get(p.categoryId)?.name), ...words(p.subcategory)], weight: 1.5 },
      { words: [...p.tags.flatMap(words), ...words(p.size), ...p.variants.flatMap((v) => words(v.label))], weight: 1.2 },
      { words: [...words(p.code), ...words(p.sku), ...words(p.barcode)], weight: 2 },
    ],
  }));

  return function search(query: string, limit = 50): SearchResult<Product>[] {
    const terms = words(query).filter((t) => t.length > 1 && !["de", "para", "con", "la", "el", "los", "las", "un", "una", "y"].includes(t));
    if (!terms.length) return [];
    const speciesWanted = terms.map((t) => SPECIES_WORDS[t]).filter(Boolean);
    const results: SearchResult<Product>[] = [];

    for (const doc of docs) {
      let score = 0;
      let matchedTerms = 0;
      for (const term of terms) {
        const variants = [term, ...(SYNONYMS[term] ?? [])];
        let termBest = 0;
        for (const [i, v] of variants.entries()) {
          const factor = i === 0 ? 1 : 0.75;
          for (const f of doc.fields) termBest = Math.max(termBest, termMatch(v, f.words) * f.weight * factor);
        }
        // La especie cuenta como coincidencia aunque no esté en el nombre.
        if (!termBest && SPECIES_WORDS[term] && doc.species.includes(SPECIES_WORDS[term])) termBest = 1;
        if (termBest > 0) matchedTerms++;
        score += termBest;
      }
      if (!matchedTerms) continue;
      // Penaliza si faltan términos y si la especie buscada no coincide.
      const coverage = matchedTerms / terms.length;
      if (coverage < 0.5) continue;
      score *= coverage;
      if (speciesWanted.length && !speciesWanted.some((s) => doc.species.includes(s))) score *= 0.3;
      if (!doc.item.visible) continue;
      if (doc.item.price != null || doc.item.variants.some((v) => v.price != null)) score *= 1.05;
      results.push({ item: doc.item, score });
    }
    results.sort((a, b) => b.score - a.score);
    // Corta la "cola larga" poco relevante (ej. todo lo que sea para gatos al buscar "antipulgas gato").
    const best = results[0]?.score ?? 0;
    return results.filter((r) => r.score >= best * 0.35).slice(0, limit);
  };
}

export function searchServices(services: Service[], query: string): Service[] {
  const terms = words(query);
  return services.filter((s) => s.visible && terms.some((t) => termMatch(t, [...words(s.name), ...words(s.description), ...words(s.kind)]) > 0.5));
}

/** Sugerencias populares para el buscador vacío. */
export const POPULAR_SEARCHES = ["antipulgas", "pretal", "buzo perro", "cepillo", "juguete gato", "shampoo", "cama", "arena gato"];
