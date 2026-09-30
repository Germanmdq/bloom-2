import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderTracking } from "@/components/veterinaria/store/OrderTracking";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <OrderTracking id={id} />
    </Suspense>
  );
}
