"use client";

import { useState } from "react";
import { IconArrowLeft, IconLoader2, IconMapPin, IconPhone } from "@tabler/icons-react";
import { formatPhone, normalizePhone, PHONE_ERROR } from "@/lib/phone";

const GREEN = "#2d4a3e";
const CREAM = "#F5EDD8";

type AccessResult =
  | { status: "needs_registration" }
  | { status: "ok"; name: string; created: boolean }
  | { error: string };

/** Solo rutas internas, para no redirigir a sitios externos. */
function safeRedirect(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/cuenta";
}

export default function AccesoPage() {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      setError(PHONE_ERROR);
      return;
    }
    if (needsRegistration && (!fullName.trim() || !address.trim())) {
      setError("Completá tu nombre y tu dirección para crear tu cuenta.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/phone-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          fullName: needsRegistration ? fullName.trim() : undefined,
          address: needsRegistration ? address.trim() : undefined,
        }),
      });
      const result = await response.json() as AccessResult;

      if (!response.ok || "error" in result) {
        setError("error" in result ? result.error : "No pudimos ingresar. Intentá de nuevo.");
        return;
      }
      if (result.status === "needs_registration") {
        setNeedsRegistration(true);
        return;
      }

      window.location.assign(safeRedirect(new URLSearchParams(window.location.search).get("redirect")));
    } catch {
      setError("No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: CREAM }}>
      <div className="w-full max-w-[400px]">
        <button
          type="button"
          onClick={() => window.location.assign("/menu")}
          className="mb-4 inline-flex items-center gap-2 rounded-xl bg-white/80 px-3.5 py-2 text-xs font-bold text-[#1a3028] shadow-sm border border-neutral-200 hover:bg-white transition-all active:scale-95"
        >
          <IconArrowLeft size={16} strokeWidth={2.5} />
          <span>Volver al Menú</span>
        </button>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-md" style={{ backgroundColor: GREEN }}>
            ☕
          </div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Ingresar</h1>
          <p className="mt-1 text-sm font-medium text-neutral-500">Escribí tu característica y número, sin 0 ni 15</p>
        </div>

        <div className="rounded-3xl border border-black/[0.07] bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[14px] font-bold text-neutral-700 mb-1.5">Número de teléfono</label>
              <div className="relative">
                <IconPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ej. 223 615 1152"
                  value={phone}
                  onChange={(event) => { setPhone(event.target.value); setError(""); setNeedsRegistration(false); }}
                  className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 pl-12 text-[16px] font-semibold outline-none placeholder:text-neutral-300 placeholder:font-normal focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/25 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {needsRegistration && (
              <>
                <p className="text-xs font-medium text-neutral-500">
                  Es la primera vez que usás el {formatPhone(phone)}. Completá tus datos para crear tu cuenta.
                </p>
                <div>
                  <label className="block text-[14px] font-bold text-neutral-700 mb-1.5">Tu nombre</label>
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="¿Cómo te llamás?"
                    value={fullName}
                    onChange={(event) => { setFullName(event.target.value); setError(""); }}
                    className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 text-[16px] font-semibold outline-none placeholder:text-neutral-300 focus:border-[#2d4a3e]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-neutral-700 mb-1.5">Dirección</label>
                  <div className="relative">
                    <IconMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                      type="text"
                      autoComplete="street-address"
                      placeholder="Ej. Tribunales, piso 4"
                      value={address}
                      onChange={(event) => { setAddress(event.target.value); setError(""); }}
                      className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 pl-12 text-[16px] font-semibold outline-none placeholder:text-neutral-300 focus:border-[#2d4a3e]"
                    />
                  </div>
                </div>
              </>
            )}

            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[54px] w-full items-center justify-center rounded-2xl text-[16px] font-black text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {loading ? <IconLoader2 className="h-5 w-5 animate-spin" /> : needsRegistration ? "CREAR CUENTA Y ENTRAR →" : "CONTINUAR →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
