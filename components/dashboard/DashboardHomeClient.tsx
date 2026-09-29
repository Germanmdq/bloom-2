"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconLayoutGrid, IconUserCircle, IconArrowRight, IconLoader2, IconClock } from "@tabler/icons-react";
import type { Order } from "@/lib/types";
import { CHANNEL_BADGE, CHANNEL_LABEL, CHANNEL_LEFT, getOrderChannel } from "@/lib/dashboard/order-channel";
import { tableChannelFromId } from "@/lib/dashboard/table-colors";
import { createClient } from "@/lib/supabase/client";

type PendingQueueEntry =
    | { kind: "order"; created_at: string; order: Record<string, unknown> }
    | {
          kind: "kitchen_ticket";
          created_at: string;
          ticket: {
              id: string;
              table_id: number;
              items: unknown;
              notes: string | null;
              created_at: string;
          };
      };

function ticketToDisplayChannel(tableId: number): "mesa" | "delivery" | "retiro" {
    const ch = tableChannelFromId(tableId);
    if (ch === "local") return "mesa";
    if (ch === "delivery") return "delivery";
    return "retiro";
}

function orderDetailHref(order: Record<string, unknown>): string {
    const tid = order.table_id;
    if (tid != null && tid !== "" && Number.isFinite(Number(tid)) && Number(tid) > 0) {
        return `/dashboard/tables/${Number(tid)}`;
    }
    const dt = String(order.delivery_type ?? "").toLowerCase();
    if (dt === "delivery") return "/dashboard/tables/999";
    return "/dashboard/tables/998";
}

function orderTitle(order: Record<string, unknown>): string {
    const name = String(order.customer_name ?? "").trim();
    if (name) return name;
    const tid = order.table_id;
    if (tid != null && Number(tid) > 0) return `Mesa ${tid}`;
    return "Pedido web";
}

export function DashboardHomeClient() {
    const [stats, setStats] = useState<{ registered: number; active: number } | null>(null);
    const [error, setError] = useState("");
    const [pendingQueue, setPendingQueue] = useState<PendingQueueEntry[] | null>(null);
    const [pendingError, setPendingError] = useState("");

    useEffect(() => {
        void (async () => {
            try {
                const res = await fetch("/api/dashboard/stats");
                const j = (await res.json()) as {
                    error?: string;
                    registeredCustomerCount?: number;
                    customersWithActiveOrdersCount?: number;
                };
                if (!res.ok) {
                    setError(j.error || "No se pudo cargar el resumen");
                    return;
                }
                setStats({
                    registered: j.registeredCustomerCount ?? 0,
                    active: j.customersWithActiveOrdersCount ?? 0,
                });
            } catch {
                setError("Error de red");
            }
        })();
    }, []);

    useEffect(() => {
        const fetchPending = async () => {
            try {
                const res = await fetch("/api/dashboard/pending-queue", { credentials: "include" });
                const j = (await res.json()) as { error?: string; entries?: PendingQueueEntry[] };
                if (!res.ok) {
                    setPendingError(j.error || "No se pudo cargar la cola de pendientes");
                    setPendingQueue([]);
                    return;
                }
                setPendingQueue(Array.isArray(j.entries) ? j.entries : []);
                setPendingError("");
            } catch {
                setPendingError("Error de red al cargar pendientes");
                setPendingQueue([]);
            }
        };

        fetchPending();

        // Subscribe to changes to refresh the list
        const supabase = createClient();
        const channel = supabase
            .channel('dashboard-queue-refresh')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders' },
                () => { fetchPending(); }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'kitchen_tickets' },
                () => { fetchPending(); }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders' },
                () => { fetchPending(); }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <div>
                <h1 className="text-2xl font-black text-gray-900 md:text-3xl">Bloom OS</h1>
                <p className="mt-1 text-sm font-medium text-gray-500">Pedidos pendientes — un solo listado por orden de llegada</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-gray-400">Pedidos pendientes</h2>
                {pendingError ? (
                    <p className="text-sm font-semibold text-red-600">{pendingError}</p>
                ) : pendingQueue == null ? (
                    <div className="flex items-center gap-2 text-gray-500">
                        <IconLoader2 className="h-5 w-5 animate-spin" aria-hidden />
                        <span className="text-sm font-medium">Cargando pendientes…</span>
                    </div>
                ) : pendingQueue.length === 0 ? (
                    <p className="text-sm font-semibold text-gray-600">No hay pedidos pendientes en este momento.</p>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {pendingQueue.map((entry, idx) => {
                            if (entry.kind === "order") {
                                const o = entry.order;
                                const channel = getOrderChannel(o as Order);
                                const href = orderDetailHref(o);
                                const total = Number(o.total ?? 0);
                                const created = new Date(entry.created_at);
                                const timeLabel = created.toLocaleString("es-AR", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                });
                                return (
                                    <Link
                                        key={`o-${String(o.id)}-${idx}`}
                                        href={href}
                                        className={`flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md ${CHANNEL_LEFT[channel]}`}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${CHANNEL_BADGE[channel]}`}
                                            >
                                                {CHANNEL_LABEL[channel]}
                                            </span>
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
                                                <IconClock size={12} />
                                                {timeLabel}
                                            </span>
                                        </div>
                                        <p className="font-black text-gray-900 leading-tight">{orderTitle(o)}</p>
                                        <p className="text-lg font-black text-gray-800">${total.toLocaleString("es-AR")}</p>
                                    </Link>
                                );
                            }

                            const t = entry.ticket;
                            const channel = ticketToDisplayChannel(t.table_id);
                            const items = Array.isArray(t.items) ? t.items : [];
                            const preview = items
                                .slice(0, 2)
                                .map((it: unknown) => {
                                    const row = it as { name?: string; quantity?: number };
                                    return `${row.quantity ?? 1}× ${row.name ?? "Ítem"}`;
                                })
                                .join(" · ");
                            const created = new Date(entry.created_at);
                            const timeLabel = created.toLocaleString("es-AR", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                            });

                            return (
                                <Link
                                    key={`k-${t.id}-${idx}`}
                                    href={`/dashboard/tables/${t.table_id}`}
                                    className={`flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md ${CHANNEL_LEFT[channel]}`}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${CHANNEL_BADGE[channel]}`}
                                        >
                                            {CHANNEL_LABEL[channel]}
                                        </span>
                                        <span className="rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-black uppercase text-[#FFD60A]">
                                            Cocina
                                        </span>
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500">
                                            <IconClock size={12} />
                                            {timeLabel}
                                        </span>
                                    </div>
                                    <p className="font-black text-gray-900">Mesa {t.table_id}</p>
                                    <p className="line-clamp-2 text-xs text-gray-600">{preview || "Ticket en preparación"}</p>
                                </Link>
                            );
                        })}
                    </div>
                )}
                <p className="mt-4 text-[11px] font-medium text-gray-500">
                    🔴 Mesa / salón · 🟢 Delivery · 🟡 Retiro — orden: más antiguo primero.
                </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                {error ? (
                    <p className="text-sm font-semibold text-red-600">{error}</p>
                ) : stats == null ? (
                    <div className="flex items-center gap-2 text-gray-500">
                        <IconLoader2 className="h-5 w-5 animate-spin" aria-hidden />
                        <span className="text-sm font-medium">Cargando clientes…</span>
                    </div>
                ) : (
                    <>
                        <p className="text-lg font-black leading-snug text-gray-900 md:text-xl">
                            {stats.registered}{" "}
                            {stats.registered === 1 ? "cliente registrado" : "clientes registrados"} — {stats.active} con
                            pedidos activos
                        </p>
                        <p className="mt-2 text-xs font-medium text-gray-500">
                            Pedidos activos: clientes con al menos un pedido que no está entregado ni cancelado.
                        </p>
                    </>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Link
                    href="/dashboard/tables"
                    className="group flex items-center justify-between rounded-2xl border-2 border-gray-900 bg-[#FFD60A] p-5 text-gray-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/10">
                            <IconLayoutGrid size={24} strokeWidth={2.2} />
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-tight">Mesas / POS</p>
                            <p className="text-xs font-semibold text-gray-800/80">Abrir operación</p>
                        </div>
                    </div>
                    <IconArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
                </Link>

                <Link
                    href="/dashboard/customers"
                    className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm transition hover:border-gray-300 hover:shadow-md"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                            <IconUserCircle size={24} strokeWidth={2} className="text-gray-700" />
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-tight">Clientes</p>
                            <p className="text-xs font-semibold text-gray-500">Cuentas y pedidos web</p>
                        </div>
                    </div>
                    <IconArrowRight className="h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-1" />
                </Link>
            </div>
        </div>
    );
}
