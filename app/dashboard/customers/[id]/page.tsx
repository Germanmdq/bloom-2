"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { IconLoader2 } from "@tabler/icons-react";
import type { CustomerOrderRow } from "@/lib/types/dashboard-customers";

function fmtMoney(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(
    n
  );
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type CustomerHeader = {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  defaultAddress: string;
};

export default function DashboardCustomerDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [customer, setCustomer] = useState<CustomerHeader | null>(null);
  const [orders, setOrders] = useState<CustomerOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/customers/${encodeURIComponent(id)}`);
      const j = (await res.json()) as {
        customer?: CustomerHeader;
        orders?: CustomerOrderRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(j.error || "Error");
        setCustomer(null);
        setOrders([]);
        return;
      }
      setCustomer(j.customer ?? null);
      setOrders(j.orders ?? []);
    } catch {
      setError("Error de red");
      setCustomer(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchOrder(orderId: string, patch: { paid?: boolean; cuenta_corriente?: boolean }) {
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/orders/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...patch }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error(j);
        return;
      }
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/customers"
            className="text-sm font-bold text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
          >
            ← Clientes
          </Link>
          {customer ? (
            <>
              <h1 className="mt-3 text-2xl font-black text-gray-900">{customer.displayName}</h1>
              <p className="mt-1 text-sm text-gray-600">{customer.email}</p>
              <p className="text-sm text-gray-600">{customer.phone}</p>
              <p className="mt-2 max-w-xl text-sm font-medium text-gray-700">{customer.defaultAddress}</p>
            </>
          ) : (
            <h1 className="mt-3 text-2xl font-black text-gray-900">Cliente</h1>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <IconLoader2 className="h-6 w-6 animate-spin" />
            <span className="font-medium">Cargando pedidos…</span>
          </div>
        ) : error ? (
          <p className="p-6 text-sm font-semibold text-red-600">{error}</p>
        ) : orders.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Este cliente aún no tiene pedidos vinculados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-black uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Pagado</th>
                  <th className="px-4 py-3 text-center">Cuenta corriente</th>
                  <th className="px-4 py-3"> </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-800">{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800">
                          {o.status ?? "—"}
                        </span>
                        {o.cuenta_corriente ? (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-900">
                            Cuenta corriente
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{fmtMoney(o.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 accent-[#2d4a3e]"
                          checked={o.paid}
                          disabled={updatingId === o.id}
                          onChange={(e) => void patchOrder(o.id, { paid: e.target.checked })}
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 accent-amber-600"
                          checked={o.cuenta_corriente}
                          disabled={updatingId === o.id}
                          onChange={(e) => void patchOrder(o.id, { cuenta_corriente: e.target.checked })}
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {updatingId === o.id ? <IconLoader2 className="ml-auto h-4 w-4 animate-spin text-gray-500" /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
