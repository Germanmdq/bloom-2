"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Product, ProductVariant, Species } from "@/lib/vet/types";
import { adminPath, vetPath } from "@/lib/vet/config/integrations";
import { slugify, uid } from "@/lib/vet/domain/format";
import { SPECIES_META } from "@/lib/vet/domain/labels";
import { useCollection, useVetData } from "@/lib/vet/client/store";
import { uploadImage } from "@/lib/vet/client/images";
import { Button, Input, Select, Textarea, Toggle, Skeleton } from "../ui/primitives";
import { Panel } from "./ui";

const SPECIES: Species[] = ["perro", "gato", "conejo", "ave", "pequenos", "peces", "personas"];

function blank(categoryId: string): Product {
  const now = new Date().toISOString();
  return { id: uid("p_"), slug: "", name: "", categoryId, species: [], tags: [], images: [], price: null, compareAtPrice: null, variants: [], stock: null, minStock: 3, visible: true, createdAt: now, updatedAt: now };
}

export function ProductEditor({ id }: { id: string | null }) {
  const router = useRouter();
  const products = useCollection("products");
  const categories = useCollection("categories");
  const upsert = useVetData((s) => s.upsert);
  const remove = useVetData((s) => s.remove);
  const [p, setP] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [discount, setDiscount] = useState("");

  useEffect(() => {
    if (!products.ready || !categories.ready || p) return;
    const found = id ? products.items.find((x) => x.id === id) : null;
    setP(found ? structuredClone(found) : blank(categories.items[0]?.id ?? "otros"));
  }, [products.ready, categories.ready, id]);

  if (!p) return <Skeleton className="h-96" />;
  if (id && !products.items.some((x) => x.id === id)) return <p>Producto no encontrado. <Link href={adminPath("/productos")} className="underline">Volver</Link></p>;

  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP({ ...p, [k]: v });
  const setVariant = (i: number, v: Partial<ProductVariant>) => set("variants", p.variants.map((x, k) => (k === i ? { ...x, ...v } : x)));

  const save = async () => {
    if (p.name.trim().length < 2) return toast.error("Ingresá el nombre del producto");
    const slugBase = slugify(p.name);
    let slug = p.slug || `${slugBase}-${p.id.slice(-6)}`;
    if (products.items.some((x) => x.slug === slug && x.id !== p.id)) slug = `${slugBase}-${uid().slice(0, 6)}`;
    const cat = categories.items.find((c) => c.id === p.categoryId);
    setSaving(true);
    try {
      await upsert("products", { ...p, name: p.name.trim(), slug, requiresConsultation: p.requiresConsultation ?? cat?.requiresConsultation, updatedAt: new Date().toISOString() });
      toast.success("Producto guardado");
      router.push(adminPath("/productos"));
    } finally {
      setSaving(false);
    }
  };

  const applyDiscount = () => {
    const pct = Number(discount);
    if (!p.price || !pct || pct <= 0 || pct >= 90) return toast.error("Ingresá un % entre 1 y 89 y un precio");
    const base = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice : p.price;
    setP({ ...p, compareAtPrice: base, price: Math.round((base * (100 - pct)) / 100) });
    toast.success(`Descuento del ${pct}% aplicado (guardá para confirmar)`);
  };

  return (
    <div className="pb-24">
      <Link href={adminPath("/productos")} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-neutral-600"><ChevronLeft className="size-4" /> Productos</Link>
      <h1 className="mb-5 font-vet-display text-2xl font-extrabold sm:text-3xl">{id ? "Editar producto" : "Nuevo producto"}</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Panel title="Información">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Nombre" required className="sm:col-span-2" value={p.name} onChange={(e) => set("name", e.target.value)} />
              <Select label="Categoría" value={p.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                {categories.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input label="Subcategoría" value={p.subcategory ?? ""} onChange={(e) => set("subcategory", e.target.value || undefined)} />
              <Input label="Marca" value={p.brand ?? ""} onChange={(e) => set("brand", e.target.value || undefined)} />
              <Input label="Peso / tamaño / presentación" value={p.size ?? ""} onChange={(e) => set("size", e.target.value || undefined)} placeholder="Ej: 3 kg, 500 ml, Talle M" />
              <Textarea label="Descripción" className="sm:col-span-2" value={p.description ?? ""} onChange={(e) => set("description", e.target.value || undefined)} />
              <Input label="Etiquetas para el buscador" className="sm:col-span-2" hint="Separadas por coma. Ej: cachorro, antipulgas, pelo largo" value={p.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-[13px] font-semibold text-vet-ink/80">Para</legend>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIES.map((s) => {
                    const on = p.species.includes(s);
                    return (
                      <button key={s} type="button" aria-pressed={on} onClick={() => set("species", on ? p.species.filter((x) => x !== s) : [...p.species, s])} className={`h-9 rounded-full px-3 text-[13px] font-semibold ring-1 ${on ? "bg-vet-primary text-white ring-vet-primary" : "bg-white ring-black/10"}`}>
                        {SPECIES_META[s].plural}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </Panel>

          <Panel title="Imágenes">
            <div className="flex flex-wrap gap-2">
              {p.images.map((src, i) => (
                <div key={src.slice(0, 40) + i} className="relative">
                  <img src={src} alt="" className="size-24 rounded-2xl object-cover ring-1 ring-black/5" />
                  <button type="button" onClick={() => set("images", p.images.filter((_, k) => k !== i))} className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-white shadow ring-1 ring-black/10" aria-label="Quitar imagen"><X className="size-4" /></button>
                  {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-white/90 px-1.5 text-[10px] font-bold">Principal</span>}
                </div>
              ))}
              <label className="grid size-24 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-vet-primary/30 text-vet-primary hover:bg-vet-tint/40">
                <span className="flex flex-col items-center text-xs font-semibold">{uploading ? "Subiendo…" : <><ImagePlus className="mb-1 size-6" />Agregar</>}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={async (e) => {
                    const files = [...(e.target.files ?? [])];
                    if (!files.length) return;
                    setUploading(true);
                    try {
                      const urls = await Promise.all(files.map((f) => uploadImage(f, "products")));
                      setP((cur) => (cur ? { ...cur, images: [...cur.images, ...urls] } : cur));
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "No se pudo subir");
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>
            </div>
            <Input label="…o pegá la URL de una imagen" className="mt-3" placeholder="https://" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v.startsWith("http")) { set("images", [...p.images, v]); (e.target as HTMLInputElement).value = ""; } } }} hint="Se optimizan automáticamente (WebP) al subirlas desde el teléfono." />
          </Panel>

          <Panel title="Variantes" action={<Button size="sm" variant="secondary" onClick={() => set("variants", [...p.variants, { id: uid("v_"), label: "", price: p.price, stock: null }])}><Plus className="size-4" /> Agregar</Button>}>
            {p.variants.length === 0 ? (
              <p className="text-sm text-neutral-600">Sin variantes. Usalas para tamaños o presentaciones con precio propio (ej. alimento 3 kg / 15 kg, talles).</p>
            ) : (
              <ul className="space-y-2">
                {p.variants.map((v, i) => (
                  <li key={v.id} className="grid grid-cols-2 gap-2 rounded-2xl bg-vet-surface p-3 sm:grid-cols-[1.2fr_1fr_0.8fr_1fr_auto]">
                    <Input label="Opción" value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} placeholder="Ej: 15 kg" />
                    <Input label="Precio" type="number" inputMode="numeric" value={v.price ?? ""} onChange={(e) => setVariant(i, { price: e.target.value === "" ? null : Number(e.target.value) })} />
                    <Input label="Stock" type="number" inputMode="numeric" value={v.stock ?? ""} onChange={(e) => setVariant(i, { stock: e.target.value === "" ? null : Number(e.target.value) })} />
                    <Input label="SKU" value={v.sku ?? ""} onChange={(e) => setVariant(i, { sku: e.target.value || undefined })} />
                    <button type="button" onClick={() => set("variants", p.variants.filter((_, k) => k !== i))} className="col-span-2 flex h-11 items-center justify-center self-end rounded-2xl text-sm font-semibold text-red-600 hover:bg-red-50 sm:col-span-1 sm:w-11" aria-label={`Quitar variante ${v.label}`}><Trash2 className="size-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Precio">
            {p.variants.length > 0 ? (
              <p className="text-sm text-neutral-600">El precio se define en cada variante.</p>
            ) : (
              <div className="space-y-3">
                <Input label="Precio de venta" type="number" inputMode="numeric" hint="Vacío = «Consultar precio»" value={p.price ?? ""} onChange={(e) => set("price", e.target.value === "" ? null : Number(e.target.value))} />
                <Input label="Precio anterior (tachado)" type="number" inputMode="numeric" value={p.compareAtPrice ?? ""} onChange={(e) => set("compareAtPrice", e.target.value === "" ? null : Number(e.target.value))} />
                <div className="flex items-end gap-2">
                  <Input label="Crear descuento (%)" type="number" inputMode="numeric" className="flex-1" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                  <Button variant="secondary" onClick={applyDiscount}>Aplicar</Button>
                </div>
              </div>
            )}
          </Panel>
          <Panel title="Stock">
            <div className="grid grid-cols-2 gap-2">
              {p.variants.length === 0 && <Input label="Stock actual" type="number" inputMode="numeric" hint="Vacío = sin controlar" value={p.stock ?? ""} onChange={(e) => set("stock", e.target.value === "" ? null : Number(e.target.value))} />}
              <Input label="Stock mínimo" type="number" inputMode="numeric" hint="Alerta de poco stock" value={p.minStock} onChange={(e) => set("minStock", Number(e.target.value) || 0)} />
            </div>
            <p className="mt-2 text-xs text-neutral-500">Para registrar entradas y salidas con historial, usá la sección Stock.</p>
          </Panel>
          <Panel title="Códigos">
            <div className="space-y-3">
              <Input label="Código interno" value={p.code ?? ""} onChange={(e) => set("code", e.target.value || undefined)} />
              <Input label="SKU" value={p.sku ?? ""} onChange={(e) => set("sku", e.target.value || undefined)} />
              <Input label="Código de barras" inputMode="numeric" value={p.barcode ?? ""} onChange={(e) => set("barcode", e.target.value || undefined)} />
            </div>
          </Panel>
          <Panel title="Visibilidad">
            <Toggle checked={p.visible} onChange={(v) => set("visible", v)} label="Visible en la tienda" />
            <Toggle checked={Boolean(p.featured)} onChange={(v) => set("featured", v)} label="Destacado en la portada" />
            <Toggle checked={Boolean(p.requiresConsultation)} onChange={(v) => set("requiresConsultation", v)} label="Venta con asesoramiento" description="No se compra por carrito: se consulta por WhatsApp (farmacia)." />
          </Panel>
          {id && (
            <div className="flex gap-2">
              <Link href={vetPath(`/producto/${p.slug}`)} target="_blank" className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-white text-sm font-semibold ring-1 ring-black/10">Ver en la tienda</Link>
              <Button
                variant="ghost"
                className="text-red-600"
                onClick={async () => {
                  if (!confirm(`¿Eliminar «${p.name}»? Si solo querés que no se vea, usá «Visible en la tienda».`)) return;
                  await remove("products", p.id);
                  toast("Producto eliminado");
                  router.push(adminPath("/productos"));
                }}
              >
                <Trash2 className="size-4" /> Eliminar
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[66px] z-40 border-t border-black/[0.06] bg-white/95 p-3 backdrop-blur lg:bottom-0 lg:left-[260px]">
        <div className="mx-auto flex max-w-6xl justify-end gap-2">
          <Link href={adminPath("/productos")} className="flex h-12 items-center rounded-2xl px-5 text-sm font-semibold text-neutral-600">Cancelar</Link>
          <Button size="lg" loading={saving} onClick={save} className="flex-1 sm:flex-none">Guardar producto</Button>
        </div>
      </div>
    </div>
  );
}
