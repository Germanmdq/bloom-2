export interface OfflineOrder {
  id: string;
  table_id: number | null;
  customer_name: string;
  notes: string | null;
  items: Array<{ id: string; name: string; quantity: number; price: number }>;
  total: number;
  created_at: string;
  retryCount: number;
}

const STORAGE_KEY = "bloom_offline_orders_queue";

export function getOfflineOrders(): OfflineOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineOrder(
  order: Omit<OfflineOrder, "id" | "created_at" | "retryCount">
): OfflineOrder {
  const newOrder: OfflineOrder = {
    ...order,
    id: "offline-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    created_at: new Date().toISOString(),
    retryCount: 0,
  };

  const queue = getOfflineOrders();
  queue.push(newOrder);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("[OfflineQueue] Error guardando pedido offline:", err);
  }
  return newOrder;
}

export function removeOfflineOrder(orderId: string): void {
  try {
    const queue = getOfflineOrders().filter((o) => o.id !== orderId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("[OfflineQueue] Error eliminando pedido sincronizado:", err);
  }
}

export async function syncOfflineOrders(): Promise<{ synced: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const queue = getOfflineOrders();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const order of queue) {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: order.table_id,
          customer_name: order.customer_name,
          notes: order.notes ? `${order.notes} [Offline Sync]` : "[Offline Sync]",
          items: order.items,
          total: order.total,
        }),
      });

      if (res.ok) {
        removeOfflineOrder(order.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
