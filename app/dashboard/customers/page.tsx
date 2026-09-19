"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconLoader2, IconChevronRight, IconMessageCircle, IconCopy, IconCheck } from "@tabler/icons-react";
import type { DashboardCustomerRow } from "@/lib/types/dashboard-customers";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

/** Fecha de nacimiento metadata (YYYY-MM-DD) → "15 de marzo" */
function fmtBirthday(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "—";
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "long",
    }).format(new Date(y, mo, d));
  } catch {
    return "—";
  }
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
    <button
      type="button"
      onClick={generate}
      disabled={state === "loading"}
      title="Generar link de acceso directo para WhatsApp"
      className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-bold text-green-800 hover:bg-green-100 transition-colors disabled:opacity-50"
    >
      {state === "loading" ? (
        <IconLoader2 size={13} className="animate-spin" />
      ) : state === "copied" ? (
        <IconCheck size={13} />
      ) : (
        <IconMessageCircle size={13} />
      )}
      {state === "copied" ? "¡Copiado!" : "Link WA"}
    </button>
  );
}

export default function DashboardCustomersPage() {
  const [rows, setRows] = useState<DashboardCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Partial Payment UI State
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
      setRows(j.customers ?? []);
    } catch {
      setError("Error de red");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchRows();
  }, []);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleCloseAll = () => {
      setPayModal({ open: false, customer: null });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseAll();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('bloom-close-all', handleCloseAll);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('bloom-close-all', handleCloseAll);
    };
  }, []);

  const handlePayPartial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal.customer || !payAmount) return;
    setPayLoading(true);
    try {
      const res = await fetch("/api/dashboard/customers/pay-partial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            customerId: payModal.customer.id, 
            amount: parseFloat(payAmount),
            paymentMethod: payMethod 
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        alert(j.error || "Error al registrar el pago");
        return;
      }
      alert("Pago registrado con éxito ✅");
      setPayModal({ open: false, customer: null });
      setPayAmount("");
      fetchRows();
    } catch (e) {
      alert("Error de red");
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Clientes</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Cuentas registradas (web) y resumen de pedidos. Puntos de lealtad: pagos confirmados y pedidos en
            cuenta corriente.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-bold text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
        >
          ← Inicio panel
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <IconLoader2 className="h-6 w-6 animate-spin" />
            <span className="font-medium">Cargando…</span>
          </div>
        ) : error ? (
          <p className="p-6 text-sm font-semibold text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No hay clientes registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-black uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Nº Socio</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3 whitespace-nowrap">Cumpleaños</th>
                  <th className="px-4 py-3">Dirección habitual</th>
                  <th className="px-4 py-3 text-center">Pedidos</th>
                  <th className="px-4 py-3">Último pedido</th>
                  <th className="px-4 py-3 text-center">Saldo CC</th>
                  <th className="px-4 py-3 text-center">Puntos</th>
                  <th className="px-4 py-3 whitespace-nowrap">Acceso</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <span className="flex flex-wrap items-center gap-2">
                        {r.displayName}
                        {r.isSocio ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                            Socio
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.customer_number ? (
                        <span className="inline-block rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-sm font-black tabular-nums text-amber-800 tracking-widest">
                          {r.customer_number}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.phone}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{fmtBirthday(r.birthdate)}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-gray-600">{r.defaultAddress}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-bold text-gray-900">{r.orderCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{fmtDate(r.lastOrderAt)}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-black whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                            <span className={r.balance > 0 ? 'text-red-600' : 'text-gray-400'}>
                                {r.balance > 0 ? `-$${r.balance.toLocaleString()}` : `$${r.balance.toLocaleString()}`}
                            </span>
                            {r.balance > 0 && (
                                <button 
                                    onClick={() => {
                                        setPayModal({ open: true, customer: r });
                                        setPayAmount(r.balance.toString());
                                    }}
                                    className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
                                >
                                    Pagar parcial
                                </button>
                            )}
                        </div>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums font-bold text-[#2d4a3e]">
                      {r.loyaltyPoints}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <WhatsAppLinkButton userId={r.id} name={r.displayName} />
                        <Link
                          href={`/dashboard/customers/${r.id}`}
                          className="inline-flex items-center gap-1 font-bold text-gray-900 hover:underline"
                        >
                          Detalle
                          <IconChevronRight size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PAGO PARCIAL */}
      {payModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPayModal({ open: false, customer: null })} />
              <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                  <h3 className="text-xl font-black mb-2 uppercase">Abonar de Cuenta</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Cliente: {payModal.customer?.displayName}</p>
                  
                  <form onSubmit={handlePayPartial} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Monto a abonar ($)</label>
                        <input 
                            type="number" 
                            required 
                            autoFocus
                            value={payAmount}
                            onChange={e => setPayAmount(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-black text-xl outline-none focus:ring-2 ring-red-500/10 transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Medio de Pago</label>
                        <select 
                            value={payMethod}
                            onChange={e => setPayMethod(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold outline-none appearance-none"
                        >
                            <option value="CASH">Efectivo 💵</option>
                            <option value="CARD">Tarjeta 💳</option>
                            <option value="MERCADO_PAGO">Mercado Pago 📱</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setPayModal({ open: false, customer: null })}
                            className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={payLoading}
                            className="flex-[2] py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
                        >
                            {payLoading ? "Procesando..." : "Registrar Pago"}
                        </button>
                    </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
