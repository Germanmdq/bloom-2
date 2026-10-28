"use client";

import { arsFormatter } from "@/lib/format";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowLeft, IconLoader2, IconLogout } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";

const GREEN = "#1a3028";

type PaymentStatus = "pagado" | "pendiente" | "parcial" | "cancelado";
type CuentaData = {
  profile: { fullName: string; phone: string; phoneFormatted: string; address: string };
  balance: number;
  paymentsEnabled: boolean;
  orders: Array<{
    id: string;
    createdAt: string;
    total: number;
    paymentStatus: PaymentStatus;
    paidAmount: number;
    onAccount: boolean;
    channel: string;
    items: Array<{ name: string; quantity: number }>;
  }>;
  movements: Array<{ id: string; date: string; type: "cargo" | "pago"; amount: number; detail: string }>;
};

const money = (n: number) => arsFormatter.format(n);
const when = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

const STATUS_STYLE: Record<PaymentStatus, { label: string; className: string }> = {
  pagado: { label: "Pagado", className: "bg-emerald-100 text-emerald-800" },
  pendiente: { label: "Pendiente de pago", className: "bg-amber-100 text-amber-800" },
  parcial: { label: "Pago parcial", className: "bg-sky-100 text-sky-800" },
  cancelado: { label: "Cancelado", className: "bg-neutral-200 text-neutral-600" },
};

export default function CuentaPage() {
  const [data, setData] = useState<CuentaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [payMode, setPayMode] = useState<"total" | "parcial">("total");
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [payMessage, setPayMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cuenta", { cache: "no-store" });
      if (res.status === 401) {
        window.location.replace("/acceso?redirect=/cuenta");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos cargar tu cuenta.");
        return;
      }
      setData(json as CuentaData);
      setForm({ fullName: json.profile.fullName, phone: json.profile.phone, address: json.profile.address });
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Al volver de Mercado Pago: el webhook acredita en segundos; se refresca el saldo unas veces.
    const result = new URLSearchParams(window.location.search).get("pago");
    if (!result) return;
    window.history.replaceState(null, "", "/cuenta");
    if (result === "ok") setPayMessage({ ok: true, text: "¡Gracias! Estamos acreditando tu pago; el saldo se actualiza en unos segundos." });
    else if (result === "pendiente") setPayMessage({ ok: true, text: "Tu pago está pendiente de acreditación. Cuando se confirme se descuenta de tu saldo." });
    else setPayMessage({ ok: false, text: "No se completó el pago. Podés intentarlo de nuevo." });
    const timers = [4000, 10000, 20000].map((ms) => setTimeout(() => void load(), ms));
    return () => timers.forEach(clearTimeout);
  }, [load]);

  async function pay() {
    if (!data) return;
    const amount = Number(payAmount.replace(",", "."));
    if (payMode === "parcial" && (!Number.isFinite(amount) || amount < 1 || amount > data.balance)) {
      setPayMessage({ ok: false, text: `Ingresá un monto entre $1 y ${money(data.balance)}.` });
      return;
    }
    setPaying(true);
    setPayMessage(null);
    try {
      const res = await fetch("/api/cuenta/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payMode === "total" ? { mode: "total" } : { mode: "parcial", amount }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPayMessage({ ok: false, text: json.error ?? "No pudimos iniciar el pago." });
        return;
      }
      window.location.assign(json.redirect_url);
    } catch {
      setPayMessage({ ok: false, text: "No pudimos conectarnos." });
    } finally {
      setPaying(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cuenta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) setMessage({ ok: false, text: json.error ?? "No pudimos guardar." });
      else {
        setMessage({ ok: true, text: "Datos guardados." });
        await load();
      }
    } catch {
      setMessage({ ok: false, text: "No pudimos conectarnos." });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await createClient().auth.signOut();
    window.location.assign("/acceso");
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#f7f5ef]">
        <IconLoader2 className="h-8 w-8 animate-spin text-[#1a3028]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-[#f7f5ef] px-6 text-center">
        <p className="font-semibold text-neutral-700">{error || "No pudimos cargar tu cuenta."}</p>
        <Link href="/acceso" className="rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ backgroundColor: GREEN }}>Ingresar</Link>
      </div>
    );
  }

  const inputClass = "w-full min-h-[48px] rounded-2xl border-2 border-neutral-200 bg-white px-4 text-[16px] font-semibold outline-none focus:border-[#1a3028]";

  return (
    <div className="bloom-ui min-h-[100dvh] pb-16">
      <header className="sticky top-0 z-10 border-b border-[#c4b896]/30 bg-[#fffdf8]/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/menu" className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: GREEN }}>
            <IconArrowLeft size={18} /> Volver al menú
          </Link>
          <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-500">
            <IconLogout size={18} /> Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: GREEN }}>Mi cuenta</h1>
          <p className="text-sm font-medium text-neutral-500">Hola, {data.profile.fullName || "bienvenido/a"}</p>
        </div>

        {data.balance > 0 && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Saldo de cuenta corriente</p>
            <p className="mt-1 text-3xl font-black text-amber-900">{money(data.balance)}</p>
            <p className="mt-1 text-sm font-medium text-amber-800">Es lo que tenés pendiente de pago. Podés pagarlo online con tarjeta o QR (Getnet) o abonarlo en el local.</p>
            <div className="mt-4 flex gap-2">
              {(["total", "parcial"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMode(m)}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${payMode === m ? "bg-amber-900 text-white" : "bg-white text-amber-900"}`}
                >
                  {m === "total" ? `Pagar todo (${money(data.balance)})` : "Pagar otro monto"}
                </button>
              ))}
            </div>
            {payMode === "parcial" && (
              <input
                className={`${inputClass} mt-3`}
                inputMode="decimal"
                placeholder="Monto a pagar"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            )}
            <button
              type="button"
              onClick={pay}
              disabled={paying || !data.paymentsEnabled}
              className="mt-3 flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-[#1a3028] text-sm font-black text-white disabled:opacity-60"
            >
              {paying ? <IconLoader2 className="h-5 w-5 animate-spin" /> : data.paymentsEnabled ? "PAGAR" : "PAGO ONLINE PRÓXIMAMENTE"}
            </button>
            {!data.paymentsEnabled && (
              <p className="mt-2 text-center text-xs font-semibold text-amber-800">Por ahora podés abonar tu saldo en el local.</p>
            )}
          </section>
        )}

        {payMessage && (
          <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${payMessage.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{payMessage.text}</p>
        )}

        <section className="glass-card p-5">
          <h2 className="mb-4 text-base font-black text-neutral-900">Mis datos</h2>
          <form onSubmit={save} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-neutral-700">Nombre</span>
              <input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="name" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-neutral-700">Teléfono</span>
              <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder="223 615 1152" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-neutral-700">Dirección</span>
              <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} autoComplete="street-address" placeholder="Ej. Tribunales, piso 4" />
            </label>
            {message && (
              <p className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
            )}
            <button type="submit" disabled={saving} className="flex min-h-[48px] w-full items-center justify-center rounded-2xl text-sm font-black text-white disabled:opacity-60" style={{ backgroundColor: GREEN }}>
              {saving ? <IconLoader2 className="h-5 w-5 animate-spin" /> : "GUARDAR CAMBIOS"}
            </button>
          </form>
        </section>

        <section className="glass-card p-5">
          <h2 className="mb-3 text-base font-black text-neutral-900">Movimientos de cuenta corriente</h2>
          {data.movements.length === 0 ? (
            <p className="text-sm font-medium text-neutral-500">Todavía no tenés movimientos.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.movements.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-neutral-800">{m.detail}</p>
                    <p className="text-xs font-medium text-neutral-400">{when(m.date)}</p>
                  </div>
                  <p className={`shrink-0 text-sm font-black ${m.type === "pago" ? "text-emerald-600" : "text-neutral-800"}`}>
                    {m.type === "pago" ? "−" : "+"} {money(m.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card p-5">
          <h2 className="mb-3 text-base font-black text-neutral-900">Mis pedidos</h2>
          {data.orders.length === 0 ? (
            <p className="text-sm font-medium text-neutral-500">Todavía no hiciste pedidos.</p>
          ) : (
            <ul className="space-y-3">
              {data.orders.map((o) => {
                const st = STATUS_STYLE[o.paymentStatus];
                return (
                  <li key={o.id} className="rounded-2xl border border-neutral-100 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-neutral-800">Pedido #{o.id.slice(0, 6).toUpperCase()}</p>
                        <p className="text-xs font-medium text-neutral-400">{when(o.createdAt)}{o.onAccount ? " · Cuenta corriente" : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-neutral-900">{money(o.total)}</p>
                        <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.className}`}>{st.label}</span>
                      </div>
                    </div>
                    {o.paymentStatus === "parcial" && (
                      <p className="mt-2 text-xs font-semibold text-sky-700">Pagaste {money(o.paidAmount)}, resta {money(o.total - o.paidAmount)}.</p>
                    )}
                    {o.items.length > 0 && (
                      <p className="mt-2 text-xs font-medium text-neutral-500">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
