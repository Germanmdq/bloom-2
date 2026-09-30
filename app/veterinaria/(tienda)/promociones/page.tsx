import type { Metadata } from "next";
import { getPublicCatalog } from "@/lib/vet/server/catalog";
import { vetPath } from "@/lib/vet/config/integrations";
import { formatDate, formatMoney } from "@/lib/vet/domain/format";
import { ComboCard } from "@/components/veterinaria/store/ComboCard";
import { DemoTag, EmptyStateStatic } from "@/components/veterinaria/ui/static";
import { TicketPercent } from "lucide-react";

export const metadata: Metadata = {
  title: "Promociones y combos",
  description: "Cupones, descuentos y combos de productos y servicios para tu mascota.",
  alternates: { canonical: vetPath("/promociones") },
};

const TYPE_LABEL = { porcentaje: "% de descuento", fijo: "Descuento", envio_gratis: "Envío gratis", dos_por_uno: "2x1" } as const;

export default async function PromocionesPage() {
  const { coupons, combos, products, services, categories } = await getPublicCatalog();
  const today = new Date().toISOString().slice(0, 10);
  const list = coupons.filter((c) => c.active && c.public && (!c.endsAt || c.endsAt >= today));
  const activeCombos = combos.filter((c) => c.active);
  const comboProducts = products.filter((p) => activeCombos.some((c) => c.items.some((i) => i.productId === p.id)));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <h1 className="font-vet-display text-3xl font-extrabold tracking-[-0.01em]">Promociones y combos</h1>
      <p className="mt-1 text-sm text-neutral-600">Beneficios vigentes. Las condiciones se muestran en cada promoción.</p>

      {list.length === 0 && activeCombos.length === 0 && <div className="mt-6"><EmptyStateStatic title="No hay promociones activas" text="Seguinos en Instagram para enterarte de las próximas." icon={<TicketPercent className="size-6" />} /></div>}

      {list.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold">Cupones y descuentos</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <article key={c.id} className="relative overflow-hidden rounded-3xl bg-vet-ink p-5 text-white">
                {c.demo && <DemoTag className="absolute right-4 top-4" />}
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{TYPE_LABEL[c.type]}</p>
                <h3 className="mt-2 font-vet-display text-xl font-extrabold">{c.title}</h3>
                {c.description && <p className="mt-1 text-sm text-white/70">{c.description}</p>}
                {c.code ? <p className="mt-3 inline-block rounded-xl border border-dashed border-white/40 px-3 py-1.5 font-mono font-bold tracking-wider">{c.code}</p> : <p className="mt-3 text-sm font-semibold text-emerald-300">Se aplica automáticamente en el carrito</p>}
                <ul className="mt-3 space-y-0.5 text-xs text-white/60">
                  {c.minPurchase ? <li>Compra mínima {formatMoney(c.minPurchase)}</li> : null}
                  {c.categoryIds.length > 0 && <li>Válido en: {c.categoryIds.map((id) => categories.find((x) => x.id === id)?.name).filter(Boolean).join(", ")}</li>}
                  {c.audience === "primera_compra" && <li>Solo primera compra</li>}
                  {c.endsAt && <li>Vence el {formatDate(c.endsAt, { day: "numeric", month: "long" })}</li>}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeCombos.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Combos</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeCombos.map((c) => (
              <ComboCard key={c.id} combo={c} products={comboProducts} services={services} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
