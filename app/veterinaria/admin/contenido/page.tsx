"use client";
import { Suspense, useState } from "react";
import { MessageSquareText, Sparkles, Star } from "lucide-react";
import type { Faq, RecommendationRule, Review } from "@/lib/vet/types";
import { uid } from "@/lib/vet/domain/format";
import { useCollection } from "@/lib/vet/client/store";
import { CrudSection } from "@/components/veterinaria/admin/CrudSection";
import { Chips, PageHeader } from "@/components/veterinaria/admin/ui";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";
import { Badge, Stars } from "@/components/veterinaria/ui/primitives";
import { INTEGRATIONS } from "@/lib/vet/config/integrations";

export default function ContenidoPage() {
  const [tab, setTab] = useState<"faq" | "resenas" | "recomendaciones">("faq");
  const categories = useCollection("categories");
  const catOptions = categories.items.map((c) => ({ value: c.id, label: c.name }));
  return (
    <RequirePermission perm="content.manage">
      <PageHeader title="Contenido" subtitle="Preguntas frecuentes, reseñas y recomendaciones de productos." />
      <div className="mb-4">
        <Chips label="Sección" value={tab} onChange={setTab} options={[{ value: "faq", label: "Preguntas frecuentes" }, { value: "resenas", label: "Reseñas" }, { value: "recomendaciones", label: "Recomendaciones" }]} />
      </div>
      <Suspense>
        {tab === "faq" && (
          <CrudSection<"faqs">
            collection="faqs"
            newLabel="Nueva pregunta"
            emptyIcon={<MessageSquareText className="size-6" />}
            sort={(a, b) => a.order - b.order}
            blank={(): Faq => ({ id: uid("f_"), question: "", answer: "", order: 99, visible: true })}
            validate={(f) => (!f.question.trim() || !f.answer.trim() ? "Completá pregunta y respuesta" : null)}
            fields={[
              { key: "question", label: "Pregunta", type: "text", required: true, full: true },
              { key: "answer", label: "Respuesta", type: "textarea" },
              { key: "order", label: "Orden", type: "number" },
              { key: "visible", label: "Visible", type: "toggle" },
            ]}
            row={(f) => ({ title: f.question, subtitle: <span className="line-clamp-2">{f.answer}</span>, badges: !f.visible ? <Badge tone="gray">Oculta</Badge> : undefined })}
          />
        )}
        {tab === "resenas" && (
          <>
            <p className="mb-4 rounded-2xl bg-vet-tint p-3 text-sm text-vet-primary-dark">
              Cargá reseñas reales con permiso de tus clientes. Las de ejemplo se muestran con la etiqueta «Ejemplo» y conviene borrarlas antes de publicar.
              {!INTEGRATIONS.googleBusinessProfileUrl && " La integración con Google Reviews queda lista para conectar con tu Perfil de Empresa."}
            </p>
            <CrudSection<"reviews">
              collection="reviews"
              newLabel="Nueva reseña"
              emptyIcon={<Star className="size-6" />}
              sort={(a, b) => b.date.localeCompare(a.date)}
              blank={(): Review => ({ id: uid("r_"), name: "", text: "", rating: 5, date: new Date().toISOString().slice(0, 10), source: "manual", visible: true })}
              validate={(r) => (!r.name.trim() || !r.text.trim() ? "Completá nombre y texto" : null)}
              beforeSave={(r) => ({ ...r, rating: Math.min(5, Math.max(1, Math.round(Number(r.rating)))) as Review["rating"], demo: r.demo && r.text.startsWith("Texto de ejemplo") ? true : undefined })}
              fields={[
                { key: "name", label: "Nombre", type: "text", required: true },
                { key: "date", label: "Fecha", type: "date" },
                { key: "rating", label: "Calificación (1 a 5)", type: "number", min: 1 },
                { key: "source", label: "Origen", type: "select", options: [{ value: "manual", label: "Cargada a mano" }, { value: "google", label: "Google" }] },
                { key: "text", label: "Texto", type: "textarea" },
                { key: "visible", label: "Visible", type: "toggle" },
              ]}
              row={(r) => ({ title: r.name, subtitle: <span className="line-clamp-2">{r.text}</span>, badges: <><Stars value={r.rating} />{r.demo && <Badge tone="amber">Ejemplo</Badge>}{!r.visible && <Badge tone="gray">Oculta</Badge>}</> })}
            />
          </>
        )}
        {tab === "recomendaciones" && (
          <>
            <p className="mb-4 rounded-2xl bg-vet-tint p-3 text-sm text-vet-primary-dark">
              Definí qué mostrar en «Combiná con» / «También te puede interesar». Además, la tienda suma sola «Otros clientes también compraron» a partir de los pedidos.
            </p>
            <CrudSection<"recommendationRules">
              collection="recommendationRules"
              newLabel="Nueva regla"
              emptyIcon={<Sparkles className="size-6" />}
              blank={(): RecommendationRule => ({ id: uid("rr_"), name: "", whenCategoryIds: [], whenTags: [], recommendCategoryIds: [], recommendProductIds: [], label: "Combiná con", active: true })}
              validate={(r) => (!r.name.trim() ? "Poné un nombre" : !r.recommendCategoryIds.length && !r.recommendProductIds.length ? "Elegí qué recomendar" : null)}
              fields={[
                { key: "name", label: "Nombre interno", type: "text", required: true, placeholder: "Ej: Shampoo → cepillos y toallas" },
                { key: "label", label: "Título que ve el cliente", type: "text" },
                { key: "whenCategoryIds", label: "Cuando el producto es de…", type: "multi", options: catOptions },
                { key: "whenTags", label: "…o contiene estas palabras", type: "tags", placeholder: "shampoo, cachorro" },
                { key: "recommendCategoryIds", label: "Recomendar productos de…", type: "multi", options: catOptions },
                { key: "active", label: "Activa", type: "toggle" },
              ]}
              row={(r) => ({ title: r.name, subtitle: `«${r.label}»`, badges: <Badge tone={r.active ? "green" : "gray"}>{r.active ? "Activa" : "Pausada"}</Badge> })}
            />
          </>
        )}
      </Suspense>
    </RequirePermission>
  );
}
