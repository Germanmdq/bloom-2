"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2 } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";

const GREEN = "#2d4a3e";
const CREAM = "#F5EDD8";

export default function RegistroGooglePage() {
  const router = useRouter();
  const supabase = createClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/acceso");
        return;
      }
      const metadata = user.user_metadata ?? {};
      setFirstName(String(metadata.given_name ?? ""));
      setLastName(String(metadata.family_name ?? ""));
      setLoading(false);
    });
  }, [router, supabase.auth]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const nombre = firstName.trim();
    const apellido = lastName.trim();
    if (!nombre || !apellido) {
      setError("Completá tu nombre y apellido.");
      return;
    }

    setSaving(true);
    setError("");
    const fullName = `${nombre} ${apellido}`;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/acceso");
      return;
    }

    const [{ error: authError }, { error: profileError }] = await Promise.all([
      supabase.auth.updateUser({ data: { full_name: fullName, first_name: nombre, last_name: apellido, is_customer: true } }),
      supabase.from("profiles").update({ full_name: fullName, is_customer: true }).eq("id", user.id),
    ]);

    if (authError || profileError) {
      setError("No pudimos guardar tus datos. Intentá de nuevo.");
      setSaving(false);
      return;
    }

    router.replace("/menu");
    router.refresh();
  };

  if (loading) {
    return <div className="min-h-[100dvh] grid place-items-center" style={{ backgroundColor: CREAM }}><IconLoader2 className="h-7 w-7 animate-spin" style={{ color: GREEN }} /></div>;
  }

  return (
    <main className="min-h-[100dvh] grid place-items-center px-4 py-10" style={{ backgroundColor: CREAM }}>
      <section className="w-full max-w-[430px] rounded-3xl border border-black/[0.07] bg-white p-8 shadow-xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl text-3xl shadow-md" style={{ backgroundColor: GREEN }}>☕</div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">¡Ya casi está!</h1>
          <p className="mt-2 text-sm font-medium text-neutral-500">Contanos cómo querés que te llamemos en Bloom.</p>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-neutral-700">Nombre</label>
            <input autoComplete="given-name" value={firstName} onChange={(e) => { setFirstName(e.target.value); setError(""); }} placeholder="Tu nombre" className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 px-4 text-base font-semibold outline-none focus:border-[#c9a84c]" autoFocus />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-neutral-700">Apellido</label>
            <input autoComplete="family-name" value={lastName} onChange={(e) => { setLastName(e.target.value); setError(""); }} placeholder="Tu apellido" className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 px-4 text-base font-semibold outline-none focus:border-[#c9a84c]" />
          </div>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <button type="submit" disabled={saving} className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-base font-black text-white shadow-md disabled:opacity-60" style={{ backgroundColor: GREEN }}>
            {saving && <IconLoader2 className="h-5 w-5 animate-spin" />}
            Continuar →
          </button>
        </form>
      </section>
    </main>
  );
}
