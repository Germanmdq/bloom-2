"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { OrderSheet } from "@/components/dashboard/OrderSheet";

export default function TableOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const tableId = parseInt(id);
    const router = useRouter();

    if (isNaN(tableId)) {
        router.replace("/dashboard/tables");
        return null;
    }

    return (
        <OrderSheet
            tableId={tableId}
            onClose={() => router.push("/dashboard/tables")}
            onOrderComplete={() => router.push("/dashboard/tables")}
        />
    );
}
