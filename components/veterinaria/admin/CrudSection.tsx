"use client";
/**
 * Listado + alta/edición/baja genérico para colecciones simples
 * (categorías, servicios, cupones, combos, zonas, FAQ, reseñas…).
 * Mobile-first: lista de tarjetas y formulario en hoja inferior.
 */
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CollectionName, Collections } from "@/lib/vet/data/repository";
import { useCollection, useVetData } from "@/lib/vet/client/store";
import { Button, EmptyState, Sheet, Skeleton } from "../ui/primitives";
import { FormFields, type FieldDef } from "./ui";

export function CrudSection<K extends CollectionName>({
  collection,
  title,
  newLabel = "Nuevo",
  fields,
  blank,
  row,
  sort,
  filter,
  validate,
  beforeSave,
  extra,
  emptyIcon,
  emptyText,
  canDelete = true,
}: {
  collection: K;
  title?: string;
  newLabel?: string;
  fields: FieldDef<Collections[K]>[] | ((item: Collections[K]) => FieldDef<Collections[K]>[]);
  blank: () => Collections[K];
  row: (item: Collections[K]) => { title: ReactNode; subtitle?: ReactNode; badges?: ReactNode; aside?: ReactNode };
  sort?: (a: Collections[K], b: Collections[K]) => number;
  filter?: (item: Collections[K]) => boolean;
  validate?: (item: Collections[K]) => string | null;
  beforeSave?: (item: Collections[K]) => Collections[K];
  extra?: (item: Collections[K], set: (v: Collections[K]) => void) => ReactNode;
  emptyIcon: ReactNode;
  emptyText?: string;
  canDelete?: boolean;
}) {
  const { items, ready } = useCollection(collection);
  const upsert = useVetData((s) => s.upsert);
  const remove = useVetData((s) => s.remove);
  const [editing, setEditing] = useState<Collections[K] | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (params.get("nuevo") === "1") {
      setEditing(blank());
      setIsNew(true);
      router.replace(pathname, { scroll: false });
    }
  }, []);

  const list = (filter ? items.filter(filter) : items).slice().sort(sort ?? (() => 0));
  const defs = editing ? (typeof fields === "function" ? fields(editing) : fields) : [];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        {title ? <h2 className="text-lg font-bold">{title}</h2> : <span />}
        <Button onClick={() => { setEditing(blank()); setIsNew(true); }}>
          <Plus className="size-4" /> {newLabel}
        </Button>
      </div>
      {!ready ? (
        <Skeleton className="h-40" />
      ) : list.length ? (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {list.map((item) => {
            const r = row(item);
            return (
              <li key={(item as { id: string }).id}>
                <button type="button" onClick={() => { setEditing(structuredClone(item)); setIsNew(false); }} className="flex w-full items-start gap-3 rounded-3xl bg-white p-4 text-left ring-1 ring-black/[0.06] transition hover:ring-vet-primary/30">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{r.title}</div>
                    {r.subtitle && <div className="mt-0.5 text-sm text-neutral-600">{r.subtitle}</div>}
                    {r.badges && <div className="mt-2 flex flex-wrap gap-1">{r.badges}</div>}
                  </div>
                  {r.aside}
                  <Pencil className="mt-1 size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={emptyIcon} title="Todavía no hay nada cargado" text={emptyText} />
      )}

      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={isNew ? newLabel : "Editar"}
        wide
        footer={
          <div className="flex gap-2">
            {!isNew && canDelete && (
              <Button
                variant="ghost"
                className="text-red-600"
                onClick={async () => {
                  if (!editing || !confirm("¿Eliminar definitivamente?")) return;
                  await remove(collection, (editing as { id: string }).id);
                  setEditing(null);
                  toast("Eliminado");
                }}
              >
                <Trash2 className="size-4" /> Eliminar
              </Button>
            )}
            <Button
              className="flex-1"
              size="lg"
              loading={saving}
              onClick={async () => {
                if (!editing) return;
                const err = validate?.(editing);
                if (err) return toast.error(err);
                setSaving(true);
                try {
                  await upsert(collection, beforeSave ? beforeSave(editing) : editing);
                  toast.success("Guardado");
                  setEditing(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo guardar");
                } finally {
                  setSaving(false);
                }
              }}
            >
              Guardar
            </Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-4">
            <FormFields fields={defs} value={editing} onChange={setEditing} />
            {extra?.(editing, setEditing)}
          </div>
        )}
      </Sheet>
    </section>
  );
}
