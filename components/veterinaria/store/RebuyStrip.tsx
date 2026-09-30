"use client";
/** "Volver a comprar": productos que el cliente ya compró, los de consumo frecuente primero. */
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useCollection } from "@/lib/vet/client/store";
import { useCurrentCustomer } from "@/lib/vet/client/session";
import { rebuyList } from "@/lib/vet/domain/recommendations";
import { relativeDays, formatMoney } from "@/lib/vet/domain/format";
import { canPurchase } from "@/lib/vet/domain/stock";
import { unitPriceOf } from "@/lib/vet/domain/pricing";
import { useCart } from "@/lib/vet/client/cart";
import { vetPath } from "@/lib/vet/config/integrations";
import { ProductImage } from "./ProductVisuals";
import { SectionTitle } from "../ui/primitives";

export function RebuyStrip(props: { title?: string; limit?: number }) {
  const { customer } = useCurrentCustomer();
  if (!customer) return null;
  return <RebuyInner customerId={customer.id} firstName={customer.name.split(" ")[0]} {...props} />;
}

function RebuyInner({ customerId, firstName, title = "Volver a comprar", limit = 8 }: { customerId: string; firstName: string; title?: string; limit?: number }) {
  const orders = useCollection("orders");
  const products = useCollection("products");
  const categories = useCollection("categories");
  const add = useCart((s) => s.add);
  if (!orders.ready || !products.ready) return null;
  const consumable = categories.items.filter((c) => c.consumable).map((c) => c.id);
  const items = rebuyList(customerId, orders.items, products.items, consumable).slice(0, limit);
  if (!items.length) return null;

  return (
    <section className="mt-10" aria-label={title}>
      <SectionTitle title={title} subtitle={`Hola ${firstName}, ¿repetimos?`} />
      <div className="vet-scroll-x -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {items.map(({ product, variantId, daysAgo }) => {
          const ok = canPurchase(product, variantId);
          const price = unitPriceOf(product, variantId);
          return (
            <div key={product.id} className="flex w-72 shrink-0 items-center gap-3 rounded-3xl border border-black/[0.06] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <Link href={vetPath(`/producto/${product.slug}`)} className="shrink-0">
                <ProductImage product={product} className="size-16 rounded-2xl" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold">{product.name}</p>
                <p className="text-xs text-neutral-500">Lo compraste {relativeDays(daysAgo)}</p>
                <p className="text-sm font-bold tabular-nums">{formatMoney(price)}</p>
              </div>
              <button
                type="button"
                disabled={!ok}
                onClick={() => {
                  add({ productId: product.id, variantId, quantity: 1 });
                  toast.success("Agregado nuevamente", { description: product.name });
                }}
                className="grid size-11 shrink-0 place-items-center rounded-2xl bg-vet-tint text-vet-primary-dark transition hover:bg-vet-primary hover:text-white disabled:opacity-40"
                aria-label={`Agregar nuevamente ${product.name}`}
              >
                <RotateCcw className="size-5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
