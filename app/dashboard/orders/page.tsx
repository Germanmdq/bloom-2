import { OrderList } from "@/components/dashboard/OrderList";

export const dynamic = "force-dynamic";

export default function OrdersPage() {
    return (
        <div className="min-h-full">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Historial de Órdenes</h2>
            <OrderList />
        </div>
    );
}
