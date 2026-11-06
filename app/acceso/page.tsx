"use client";

import { useState } from "react";
import { IconArrowLeft, IconLoader2, IconMapPin, IconPhone } from "@tabler/icons-react";
import { formatPhone, normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { MONTHS, birthdateFrom, customerPassword, daysInMonth } from "@/lib/customer-access";

const GREEN = "#2d4a3e";
const CREAM = "#F5EDD8";

type AccessResult =
  | { status: "needs_registration" }
  | { status: "needs_password" }
  | { status: "needs_customer_password"; needsBirthday: boolean }
  | { status: "ok"; name: string; created: boolean }
  | { error: string };

/** Solo rutas internas, para no redirigir a sitios externos. */
function safeRedirect(raw: string | null, fallback = "/cuenta") {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

export default function AccesoPage() {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [needsCustomerPassword, setNeedsCustomerPassword] = useState(false);
  const [needsBirthday, setNeedsBirthday] = useState(false);
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
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
    if ((needsRegistration || needsBirthday) && !birthdateFrom(birthDay, birthMonth)) {
      setError("Elegí el día y el mes de tu cumpleaños.");
      return;
    }
    if (needsCustomerPassword && password.replace(/\D/g, "").length !== 6) {
      setError("Escribí los últimos 6 números de tu teléfono.");
      return;
    }

    setLoading(true);
    try {
      if (needsPassword) {
        const res = await fetch("/api/auth/staff-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhone, password }),
        });
        const out = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(out.error ?? "No pudimos ingresar. Intentá de nuevo.");
          return;
        }
        const target = safeRedirect(new URLSearchParams(window.location.search).get("redirect"), "/dashboard");
        window.location.assign(target.startsWith("/dashboard") ? target : "/dashboard");
        return;
      }
      const response = await fetch("/api/auth/phone-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          fullName: needsRegistration ? fullName.trim() : undefined,
          address: needsRegistration ? address.trim() : undefined,
          password: needsCustomerPassword ? password : undefined,
          birthDay: needsRegistration || needsBirthday ? birthDay : undefined,
          birthMonth: needsRegistration || needsBirthday ? birthMonth : undefined,
        }),
      });
      const result = await response.json() as AccessResult;

      if (!response.ok || "error" in result) {
        setError("error" in result ? result.error : "No pudimos ingresar. Intentá de nuevo.");
        return;
      }
      if (result.status === "needs_password") {
        setNeedsPassword(true);
        return;
      }
      if (result.status === "needs_customer_password") {
        setNeedsCustomerPassword(true);
        setNeedsBirthday(result.needsBirthday);
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
    <div className="bloom-ui min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: CREAM }}>
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

        <div className="glass-card p-8">
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
                  onChange={(event) => { setPhone(event.target.value); setError(""); setNeedsRegistration(false); setNeedsPassword(false); setNeedsCustomerPassword(false); setNeedsBirthday(false); setPassword(""); }}
                  className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 pl-12 text-[16px] font-semibold outline-none placeholder:text-neutral-300 placeholder:font-normal focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/25 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {needsPassword && (
              <div>
                <label className="block text-[14px] font-bold text-neutral-700 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setError(""); }}
                  className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 text-[16px] font-semibold outline-none placeholder:text-neutral-300 focus:border-[#2d4a3e]"
                  autoFocus
                />
              </div>
            )}

            {needsCustomerPassword && (
              <div>
                <label className="block text-[14px] font-bold text-neutral-700 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={6}
                  placeholder="••••••"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 text-[20px] tracking-[0.4em] font-semibold outline-none placeholder:text-neutral-300 focus:border-[#2d4a3e]"
                  autoFocus
                />
                <p className="mt-1.5 text-xs font-medium text-neutral-500">Son los últimos 6 números de tu teléfono.</p>
              </div>
            )}

            {needsCustomerPassword && needsBirthday && (
              <BirthdayPicker
                day={birthDay}
                month={birthMonth}
                onChange={(day, month) => { setBirthDay(day); setBirthMonth(month); setError(""); }}
                hint="Completalo una sola vez para tu café gratis de cumpleaños."
              />
            )}

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
                <BirthdayPicker
                  day={birthDay}
                  month={birthMonth}
                  onChange={(day, month) => { setBirthDay(day); setBirthMonth(month); setError(""); }}
                />
                <p className="rounded-xl border border-[#c4b896]/50 bg-[#fffaf0] px-4 py-3 text-[13px] font-medium text-neutral-700">
                  Tu contraseña son los últimos 6 números de tu teléfono: <span className="font-black tracking-wider">{customerPassword(normalizePhone(phone) ?? "")}</span>
                </p>
              </>
            )}

            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[54px] w-full items-center justify-center rounded-2xl text-[16px] font-black text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {loading ? <IconLoader2 className="h-5 w-5 animate-spin" /> : needsRegistration ? "CREAR CUENTA Y ENTRAR →" : needsPassword || needsCustomerPassword ? "ENTRAR →" : "CONTINUAR →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** Cumpleaños: día y mes, con selectores nativos (en el celular abren la rueda del sistema). */
function BirthdayPicker({
  day,
  month,
  onChange,
  hint,
}: {
  day: string;
  month: string;
  onChange: (day: string, month: string) => void;
  hint?: string;
}) {
  const maxDay = month ? daysInMonth(Number(month)) : 31;
  const selectClass =
    "w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 text-[16px] font-semibold outline-none focus:border-[#2d4a3e]";
  return (
    <div>
      <label className="block text-[14px] font-bold text-neutral-700 mb-1.5">🎂 Tu cumpleaños</label>
      <div className="grid grid-cols-[1fr_1.6fr] gap-2">
        <select
          aria-label="Día de tu cumpleaños"
          value={day}
          onChange={(event) => onChange(event.target.value, month)}
          className={selectClass}
        >
          <option value="">Día</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={String(d)} disabled={d > maxDay}>{d}</option>
          ))}
        </select>
        <select
          aria-label="Mes de tu cumpleaños"
          value={month}
          onChange={(event) => {
            const nextMonth = event.target.value;
            const limit = nextMonth ? daysInMonth(Number(nextMonth)) : 31;
            onChange(day && Number(day) > limit ? "" : day, nextMonth);
          }}
          className={selectClass}
        >
          <option value="">Mes</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1)}>{name}</option>
          ))}
        </select>
      </div>
      <p className="mt-1.5 text-xs font-medium text-neutral-500">{hint ?? "Ese día te invitamos un café."}</p>
    </div>
  );
}
