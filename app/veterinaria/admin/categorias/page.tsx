"use client";
import { Suspense } from "react";
import { Tags } from "lucide-react";
import type { Category } from "@/lib/vet/types";
import { slugify, uid } from "@/lib/vet/domain/format";
import { useCollection } from "@/lib/vet/client/store";
import { CrudSection } from "@/components/veterinaria/admin/CrudSection";
import { PageHeader } from "@/components/veterinaria/admin/ui";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";
import { ICON_NAMES, NamedIcon } from "@/components/veterinaria/ui/icons";
import { Badge } from "@/components/veterinaria/ui/primitives";

export default function CategoriasPage() {
  const products = useCollection("products");
  return (
    <RequirePermission perm="products.manage">
      <PageHeader title="Categorías" subtitle="Ordená, renombrá u ocultá las categorías de la tienda." />
      <Suspense>
        <CrudSection<"categories">
          collection="categories"
          newLabel="Nueva categoría"
          emptyIcon={<Tags className="size-6" />}
          sort={(a, b) => a.order - b.order}
          blank={(): Category => ({ id: uid("cat_"), slug: "", name: "", icon: "PawPrint", order: 99, visible: true })}
          validate={(c) => (c.name.trim().length < 2 ? "Ingresá un nombre" : null)}
          beforeSave={(c) => ({ ...c, slug: c.slug || slugify(c.name) })}
          fields={[
            { key: "name", label: "Nombre", type: "text", required: true },
            { key: "slug", label: "URL", type: "text", hint: "Se genera sola si la dejás vacía" },
            { key: "description", label: "Descripción (se muestra en la tienda y ayuda al SEO)", type: "textarea" },
            { key: "icon", label: "Ícono", type: "select", options: ICON_NAMES.map((n) => ({ value: n, label: n })) },
            { key: "order", label: "Orden", type: "number" },
            { key: "visible", label: "Visible en la tienda", type: "toggle" },
            { key: "requiresConsultation", label: "Venta con asesoramiento", type: "toggle", hint: "Para farmacia: se consulta por WhatsApp en lugar de comprar por carrito." },
            { key: "consumable", label: "Consumo frecuente", type: "toggle", hint: "Activa «Volver a comprar» y los recordatorios de recompra." },
          ]}
          row={(c) => ({
            title: (
              <span className="flex items-center gap-2">
                <NamedIcon name={c.icon} className="size-5 text-vet-primary" /> {c.name}
              </span>
            ),
            subtitle: `${products.items.filter((p) => p.categoryId === c.id).length} productos · orden ${c.order}`,
            badges: (
              <>
                {!c.visible && <Badge tone="gray">Oculta</Badge>}
                {c.requiresConsultation && <Badge tone="teal">Asesoramiento</Badge>}
                {c.consumable && <Badge tone="green">Consumo frecuente</Badge>}
              </>
            ),
          })}
        />
      </Suspense>
    </RequirePermission>
  );
}
