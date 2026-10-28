"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 12;

export default function CambiarPasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next.length < MIN_LENGTH) return setMsg({ ok: false, text: `La contraseña nueva debe tener al menos ${MIN_LENGTH} caracteres.` });
    if (next !== repeat) return setMsg({ ok: false, text: "Las contraseñas nuevas no coinciden." });
    if (next === current) return setMsg({ ok: false, text: "La contraseña nueva tiene que ser distinta de la actual." });

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return setMsg({ ok: false, text: "No hay una sesión de administrador activa. Volvé a ingresar." });

      // Se confirma la contraseña actual antes de cambiarla (protege una sesión abierta y desatendida).
      const check = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (check.error) return setMsg({ ok: false, text: "La contraseña actual no es correcta." });

      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) return setMsg({ ok: false, text: error.message || "No se pudo cambiar la contraseña." });

      setCurrent("");
      setNext("");
      setRepeat("");
      setMsg({ ok: true, text: "Contraseña actualizada. Usá la nueva la próxima vez que ingreses." });
    } catch {
      setMsg({ ok: false, text: "No pudimos conectarnos. Probá de nuevo." });
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full min-h-[44px] rounded-xl border border-[#e4dfcf] bg-white px-3 text-sm outline-none";

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-[#1a3028]">Cambiar contraseña</h1>
      <p className="mt-1 text-sm text-gray-500">Elegí una contraseña de al menos {MIN_LENGTH} caracteres que no uses en otro lado.</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl bg-white p-5">
        <label className="block text-sm font-semibold text-gray-700">
          Contraseña actual
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={`${field} mt-1.5`} required />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          Contraseña nueva
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={`${field} mt-1.5`} minLength={MIN_LENGTH} required />
        </label>
        <label className="block text-sm font-semibold text-gray-700">
          Repetí la contraseña nueva
          <input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={`${field} mt-1.5`} minLength={MIN_LENGTH} required />
        </label>

        {msg && (
          <p role="status" className={`rounded-xl px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>
        )}

        <button type="submit" disabled={busy} className="min-h-[46px] w-full rounded-xl bg-[#2d4a3e] px-4 text-sm font-bold text-white disabled:opacity-60">
          {busy ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
