#!/usr/bin/env node
/**
 * Importa el catálogo de Excel al formato de la tienda Vida de Perros.
 *
 * Uso:
 *   node scripts/vet-import-catalog.mjs ruta/al/catalogo.xlsx
 *
 * Columnas esperadas (hoja 1):
 *   Código | Categoría | Subcategoría | Destinado a | Producto | Imagen |
 *   Enlace | Estado | Precio compra | Precio venta | Notas
 *
 * Genera:
 *   - lib/vet/catalog/products.json  → datos PÚBLICOS (se versionan en git).
 *   - supabase/private/vet_catalog_import.sql → INSERT completo para Supabase,
 *     incluyendo precio de compra y enlace de proveedor. Esa carpeta está en
 *     .gitignore: el repositorio es público y esos datos son internos.
 */
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/vet-import-catalog.mjs catalogo.xlsx");
  process.exit(1);
}

/** Categoría del Excel → id de categoría de la tienda (lib/vet/catalog/categories.ts). */
const CATEGORY_MAP = {
  "Cuidado veterinario": "farmacia",
  "Higiene y peluquería": "higiene",
  "Paseo y seguridad": "paseo",
  Juguetes: "juguetes",
  Indumentaria: "indumentaria",
  "Alimentación e hidratación": "comederos",
  "Hogar y descanso": "descanso",
  Transporte: "transporte",
  "Accesorios para personas": "regalos",
  "Otros accesorios": "otros",
};
const HIDDEN_CATEGORIES = new Set(["otros"]);
const CONSULTATION_CATEGORIES = new Set(["farmacia"]);

const SPECIES_MAP = {
  perros: ["perro"],
  gatos: ["gato"],
  "perros y gatos": ["perro", "gato"],
  personas: ["personas"],
};

const clean = (s) => (s == null ? "" : String(s)).replace(/\s+/g, " ").trim();

function cleanName(raw) {
  let n = clean(raw).replace(/\s*-\s*Temu Argentina\s*$/i, "").replace(/\s+-\s*$/, "");
  if (!n) return n;
  // Nombres en MAYÚSCULAS → formato oración (manteniendo siglas cortas).
  if (n === n.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{4,}/.test(n)) {
    n = n.toLowerCase().replace(/\b(xxs|xs|xl|xxl|usb)\b/g, (m) => m.toUpperCase());
  }
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function parsePrice(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function detectSize(name) {
  const m =
    name.match(/\b(\d+(?:[.,]\d+)?\s?(?:kg|kgs|g|gr|grs|ml|lts?|cm|mts?|mm|u\.?|comp\.?))\b/i) ||
    name.match(/\btalle\s+([a-z0-9]+)\b/i) ||
    name.match(/\bT\.?\s?(XXS|XS|S|M|L|XL|XXL)\b/);
  return m ? clean(m[0]) : undefined;
}

function tagsFor(p) {
  const words = new Set();
  for (const s of p.species) words.add(s);
  const stop = new Set(["para", "otros", "revisar", "mascotas", "perros", "gatos", "accesorios"]);
  if (p.subcategory) slugify(p.subcategory).split("-").forEach((w) => w.length > 3 && !stop.has(w) && words.add(w));
  return [...words];
}

const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

const now = "2026-09-30T00:00:00.000Z";
const usedSlugs = new Set();
const products = [];
const privateById = new Map();

for (const r of rows) {
  const code = clean(r["Código"]);
  const name = cleanName(r["Producto"]);
  if (!code || !name) continue;
  const sourceCategory = clean(r["Categoría"]);
  const categoryId = CATEGORY_MAP[sourceCategory] ?? "otros";
  const species = SPECIES_MAP[clean(r["Destinado a"]).toLowerCase()] ?? [];
  let slug = `${slugify(name)}-${code.toLowerCase()}`;
  while (usedSlugs.has(slug)) slug += "-x";
  usedSlugs.add(slug);

  const product = {
    id: code.toLowerCase(),
    slug,
    code,
    name,
    categoryId,
    subcategory: clean(r["Subcategoría"]) || undefined,
    species,
    tags: [],
    images: [],
    price: parsePrice(r["Precio venta"]),
    compareAtPrice: null,
    size: detectSize(name),
    variants: [],
    // El Excel no trae stock: queda "sin controlar" hasta que se cargue.
    stock: null,
    minStock: 2,
    visible: !HIDDEN_CATEGORIES.has(categoryId),
    requiresConsultation: CONSULTATION_CATEGORIES.has(categoryId) || undefined,
    createdAt: now,
    updatedAt: now,
  };
  product.tags = tagsFor(product);
  products.push(product);
  privateById.set(product.id, {
    cost: parsePrice(r["Precio compra"]),
    supplierUrl: clean(r["Enlace"]) || null,
    status: clean(r["Estado"]) || null,
    notes: clean(r["Notas"]) || null,
  });
}

// ── Variantes: agrupa filas que solo difieren en talle/número (ej. "Polar liso talle 0…8").
const VARIANT_RE = /^(.*?)[\s.,-]+((?:talle|nro\.?|n°|nº|t\.)\s*[a-z0-9]{1,4})$/i;
const groups = new Map();
products.forEach((p, i) => {
  const m = p.name.match(VARIANT_RE);
  if (!m) return;
  const key = `${p.categoryId}::${m[1].toLowerCase()}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ index: i, base: m[1], label: m[2] });
});
const removed = new Set();
for (const members of groups.values()) {
  if (members.length < 2) continue;
  const parent = products[members[0].index];
  parent.name = members[0].base;
  parent.slug = `${slugify(parent.name)}-${parent.code.toLowerCase()}`;
  parent.variants = members.map((m) => {
    const p = products[m.index];
    return { id: p.id, label: m.label.replace(/^(t\.|talle)\s*/i, "Talle ").replace(/^(nro\.?|n°|nº)\s*/i, "N° "), price: p.price, sku: p.code, stock: null };
  });
  const prices = parent.variants.map((v) => v.price).filter((x) => x != null);
  parent.price = prices.length ? Math.min(...prices) : null;
  parent.size = undefined;
  members.slice(1).forEach((m) => removed.add(m.index));
}
const finalProducts = products.filter((_, i) => !removed.has(i));
products.length = 0;
products.push(...finalProducts);

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outPublic = path.join(root, "lib/vet/catalog/products.json");
// Formato compacto (se expande en lib/vet/catalog/index.ts): menos KB para el navegador.
const compact = products.map((p) => {
  const c = { c: p.code, n: p.name, k: p.categoryId, s: p.slug };
  if (p.subcategory) c.sc = p.subcategory;
  if (p.species.length) c.sp = p.species;
  if (p.tags.length) c.t = p.tags;
  if (p.price != null) c.p = p.price;
  if (p.size) c.z = p.size;
  if (p.variants.length) c.v = p.variants.map((v) => [v.sku, v.label, v.price]);
  if (!p.visible) c.h = 1;
  if (p.requiresConsultation) c.rx = 1;
  return c;
});
fs.writeFileSync(outPublic, "[\n" + compact.map((c) => JSON.stringify(c)).join(",\n") + "\n]\n");

const privDir = path.join(root, "supabase/private");
fs.mkdirSync(privDir, { recursive: true });
const q = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const sql = [
  "-- Generado por scripts/vet-import-catalog.mjs — NO versionar (contiene costos y proveedores).",
  "begin;",
  ...products.flatMap((p) => {
    const priv = privateById.get(p.id);
    const variants = p.variants.map((v) => ({ ...v }));
    const variantCosts = p.variants.map((v) => `${v.sku}: ${privateById.get(v.id)?.cost ?? "s/d"}`).join(" · ");
    const notes = [priv.status, priv.notes, variantCosts && `Costos por variante: ${variantCosts}`].filter(Boolean).join(" · ") || null;
    return [
      `insert into vet_products (id, slug, code, name, category_id, subcategory, species, tags, images, price, size, variants, stock, min_stock, visible, requires_consultation) values (${[
        q(p.id), q(p.slug), q(p.code), q(p.name), q(p.categoryId), q(p.subcategory),
        `array[${p.species.map(q).join(",")}]::text[]`, `array[${p.tags.map(q).join(",")}]::text[]`, "'{}'::text[]",
        p.price ?? "null", q(p.size), `${q(JSON.stringify(variants))}::jsonb`, "null", p.minStock, p.visible, Boolean(p.requiresConsultation),
      ].join(", ")}) on conflict (id) do update set name = excluded.name, price = excluded.price, variants = excluded.variants, updated_at = now();`,
      `insert into vet_product_costs (product_id, cost, supplier_url, internal_notes) values (${[q(p.id), priv.cost ?? "null", q(priv.supplierUrl), q(notes)].join(", ")}) on conflict (product_id) do update set cost = excluded.cost, supplier_url = excluded.supplier_url, internal_notes = excluded.internal_notes, updated_at = now();`,
    ];
  }),
  "commit;",
  "",
].join("\n");
fs.writeFileSync(path.join(privDir, "vet_catalog_import.sql"), sql);

const suspicious = products.flatMap((p) => [p, ...p.variants]).filter((x) => x.price != null && x.price < 200);
if (suspicious.length) console.log("⚠ Precios sospechosamente bajos (revisar en el Excel):", suspicious.map((x) => `${x.code ?? x.sku} $${x.price}`).join(", "));
const byCat = products.reduce((acc, p) => ((acc[p.categoryId] = (acc[p.categoryId] ?? 0) + 1), acc), {});
console.log(`✔ ${products.length} productos → ${path.relative(root, outPublic)}`);
console.log(`  con precio: ${products.filter((p) => p.price != null).length} · sin precio (Consultar): ${products.filter((p) => p.price == null).length}`);
console.log("  por categoría:", byCat);
console.log(`✔ SQL privado (costos + proveedores) → supabase/private/vet_catalog_import.sql (ignorado por git)`);
