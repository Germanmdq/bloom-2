"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconBell,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconLoader2,
  IconMessageCircle,
} from "@tabler/icons-react";
import type { DashboardCustomerRow } from "@/lib/types/dashboard-customers";

const REMINDER_INTERVAL_MS = 72 * 60 * 60 * 1000;
const REMINDER_STORAGE_KEY = "bloom-debt-reminder-last-shown";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function debtAge(iso: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(iso).getTime());
  const days = Math.floor(elapsed / 86_400_000);
  if (days >= 2) return `hace ${days} días`;
  const hours = Math.max(1, Math.floor(elapsed / 3_600_000));
  return `hace ${hours} h`;
}

function WhatsAppLinkButton({ userId, name }: { userId: string; name: string }) {
  const [state, setState] = useState<"idle" | "loading" | "copied">("idle");

  async function generate() {
    setState("loading");
    try {
      const res = await fetch("/api/auth/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, label: name }),
      });
      const json = (await res.json()) as { link?: string; error?: string };
      if (!res.ok || !json.link) throw new Error(json.error ?? "Error");
      await navigator.clipboard.writeText(json.link);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("idle");
      alert("Error al generar el link");
    }
  }

  return (
    <button type="button" onClick={generate} disabled={state === "loading"} title="Generar link de acceso directo para WhatsApp"
      className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-bold text-green-800 hover:bg-green-100 transition-colors disabled:opacity-50">
      {state === "loading" ? <IconLoader2 size={13} className="animate-spin" /> : state === "copied" ? <IconCheck size={13} /> : <IconMessageCircle size={13} />}
      {state === "copied" ? "¡Copiado!" : "Link WA"}
    </button>
  );
}

export default function DashboardCustomersPage() {
  const [rows, setRows] = useState<DashboardCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"pending" | "settled">("pending");
  const [reminder, setReminder] = useState<DashboardCustomerRow[]>([]);
  const [payModal, setPayModal] = useState<{ open: boolean; customer: DashboardCustomerRow | null }>({ open: false, customer: null });
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payLoading, setPayLoading] = useState(false);

  async function fetchRows() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/customers");
      const j = (await res.json()) as { customers?: DashboardCustomerRow[]; error?: string };
      if (!res.ok) {
        setError(j.error || "Error al cargar");
        setRows([]);
        return;
      }

      const customers = j.customers ?? [];
      setRows(customers);

      // Solo se avisa una vez cada 72 h y únicamente por cuentas que llevan 72 h o más pendientes.
      const overdue = customers.filter((customer) =>
        customer.balance > 0 &&
        customer.debtDate !== null &&
        Date.now() - new Date(customer.debtDate).getTime() >= REMINDER_INTERVAL_MS
      );
      const lastShown = Number(window.localStorage.getItem(REMINDER_STORAGE_KEY) ?? 0);
      if (overdue.length > 0 && Date.now() - lastShown >= REMINDER_INTERVAL_MS) {
        setReminder(overdue);
        window.localStorage.setItem(REMINDER_STORAGE_KEY, String(Date.now()));
      }
    } catch {
      setError("Error de red");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchRows(); }, []);

  useEffect(() => {
    const close = () => setPayModal({ open: false, customer: null });
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("bloom-close-all", close);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("bloom-close-all", close);
    };
  }, []);

  const pendingRows = useMemo(
    () => rows.filter((row) => row.balance > 0).sort((a, b) => new Date(a.debtDate ?? 0).getTime() - new Date(b.debtDate ?? 0).getTime()),
    [rows]
  );
  const settledRows = useMemo(
    () => rows.filter((row) => row.balance <= 0 && row.debtDate).sort((a, b) => new Date(a.debtDate ?? 0).getTime() - new Date(b.debtDate ?? 0).getTime()),
    [rows]
  );
  const visibleRows = view === "pending" ? pendingRows : settledRows;
  const pendingTotal = pendingRows.reduce((total, row) => total + row.balance, 0);

  async function handlePayPartial(event: React.FormEvent) {
    event.preventDefault();
    if (!payModal.customer || !payAmount) return;
    setPayLoading(true);
    try {
      const res = await fetch("/api/dashboard/customers/pay-partial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: payModal.customer.id, amount: Number(payAmount), paymentMethod: payMethod }),
      });
      if (!res.ok) {
        const j = await res.json();
        alert(j.error || "Error al registrar el pago");
        return;
      }
      setPayModal({ open: false, customer: null });
      setPayAmount("");
      await fetchRows();
    } catch {
      alert("Error de red");
    } finally {
      setPayLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Cuentas corrientes</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Las deudas pendientes quedan en rojo. Al saldarse, pasan al historial de pagadas.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm font-bold text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline">← Inicio panel</Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button type="button" onClick={() => setView("pending")}
              className={`rounded-lg px-4 py-2 text-sm font-black transition-colors ${view === "pending" ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
              Deudas pendientes ({pendingRows.length})
            </button>
            <button type="button" onClick={() => setView("settled")}
              className={`rounded-lg px-4 py-2 text-sm font-black transition-colors ${view === "settled" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
              Historial pagadas ({settledRows.length})
            </button>
          </div>
          {view === "pending" && (
            <p className="text-sm font-black tabular-nums text-red-600">Total pendiente: $ {pendingTotal.toLocaleString("es-AR")}</p>
          )}
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-500">
          <IconClock size={15} /> Ordenadas por fecha: la última deuda queda al final. Los abonos reducen primero lo más reciente.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500"><IconLoader2 className="h-6 w-6 animate-spin" /><span className="font-medium">Cargando…</span></div>
        ) : error ? (
          <p className="p-6 text-sm font-semibold text-red-600">{error}</p>
        ) : visibleRows.length === 0 ? (
          <p className="p-8 text-center text-sm font-semibold text-gray-500">
            {view === "pending" ? "No hay deudas pendientes." : "Todavía no hay cuentas corrientes pagadas."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-left text-sm">
              <thead><tr className="border-b border-gray-200 bg-gray-50 text-xs font-black uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Teléfono</th><th className="px-4 py-3">Última deuda</th>
                <th className="px-4 py-3 text-center">Saldo CC</th><th className="px-4 py-3 text-center">Puntos</th><th className="px-4 py-3">Acceso</th>
              </tr></thead>
              <tbody>{visibleRows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    <span className="flex flex-wrap items-center gap-2">{row.displayName}
                      {view === "settled" && <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">Pagada</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.phone}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{fmtDate(row.debtDate)}</td>
                  <td className="px-4 py-3 text-center tabular-nums font-black whitespace-nowrap">
                    {view === "pending" ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-red-600">-$ {row.balance.toLocaleString("es-AR")}</span>
                        <button onClick={() => { setPayModal({ open: true, customer: row }); setPayAmount(row.balance.toString()); }}
                          className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-700">Registrar pago</button>
                      </div>
                    ) : <span className="text-emerald-600">$ 0</span>}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-bold text-[#2d4a3e]">{row.loyaltyPoints}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2">
                    <WhatsAppLinkButton userId={row.id} name={row.displayName} />
                    <Link href={`/dashboard/customers/${row.id}`} className="inline-flex items-center gap-1 font-bold text-gray-900 hover:underline">Detalle <IconChevronRight size={16} /></Link>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {reminder.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setReminder([])} />
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-amber-100 p-3 text-amber-700"><IconBell size={24} /></span>
              <div><h2 className="text-xl font-black text-gray-900">Recordatorio de deudas</h2>
                <p className="mt-1 text-sm font-medium text-gray-500">Estas cuentas siguen pendientes hace 72 horas o más.</p></div>
            </div>
            <div className="mt-5 max-h-64 space-y-2 overflow-y-auto">
              {reminder.map((row) => <div key={row.id} className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3">
                <div><p className="font-black text-red-900">{row.displayName}</p><p className="text-xs font-semibold text-red-700">Debe $ {row.balance.toLocaleString("es-AR")} · {row.debtDate ? debtAge(row.debtDate) : ""}</p></div>
                <button onClick={() => { setReminder([]); setView("pending"); }} className="text-xs font-black text-red-700 underline">Ver</button>
              </div>)}
            </div>
            <button type="button" onClick={() => setReminder([])} className="mt-6 w-full rounded-2xl bg-gray-900 py-3 text-sm font-black text-white">Entendido</button>
          </div>
        </div>
      )}

      {payModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPayModal({ open: false, customer: null })} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="mb-2 text-xl font-black uppercase">Abonar cuenta</h3>
            <p className="mb-6 text-xs font-bold uppercase tracking-widest text-gray-400">Cliente: {payModal.customer?.displayName}</p>
            <form onSubmit={handlePayPartial} className="space-y-4">
              <div><label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">Monto a abonar ($)</label>
                <input type="number" min="0.01" step="0.01" required autoFocus value={payAmount} onChange={(event) => setPayAmount(event.target.value)}
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-xl font-black outline-none transition-all focus:ring-2 focus:ring-red-500/10" /></div>
              <div><label className="mb-1.5 ml-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">Medio de pago</label>
                <select value={payMethod} onChange={(event) => setPayMethod(event.target.value)} className="w-full appearance-none rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 font-bold outline-none">
                  <option value="CASH">Efectivo 💵</option><option value="CARD">Tarjeta 💳</option><option value="MERCADO_PAGO">Mercado Pago 📱</option>
                </select></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setPayModal({ open: false, customer: null })} className="flex-1 rounded-2xl bg-gray-50 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Cancelar</button>
                <button type="submit" disabled={payLoading} className="flex-[2] rounded-2xl bg-black py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl disabled:opacity-50">{payLoading ? "Procesando..." : "Registrar pago"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
