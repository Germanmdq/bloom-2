"use client";
import { useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { INTEGRATIONS } from "@/lib/vet/config/integrations";
import { signIn } from "@/lib/vet/client/actions";
import { Button, Card, Input, Toggle } from "../ui/primitives";

/**
 * Ingreso del cliente.
 * Modo demo: por teléfono (sin contraseña) para poder probar.
 * Modo supabase: usa el login existente del proyecto (/auth) y vincula la ficha por teléfono.
 */
export function SignInCard({ title = "Ingresá a tu cuenta", subtitle = "Guardá tus favoritos, tus mascotas y volvé a comprar en un toque." }: { title?: string; subtitle?: string }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", optIn: true });
  const [sending, setSending] = useState(false);

  if (INTEGRATIONS.dataSource === "supabase") {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <UserRound className="mx-auto size-10 text-vet-primary" />
        <h2 className="mt-3 font-vet-display text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
        <Link href={`/auth?next=${encodeURIComponent("/veterinaria/cuenta")}`} className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-vet-primary font-bold text-white">
          Ingresar o crear cuenta
        </Link>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md p-6">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-vet-tint text-vet-primary"><UserRound className="size-7" /></span>
        <h2 className="mt-3 font-vet-display text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
      </div>
      <form
        className="mt-5 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (form.name.trim().length < 2 || form.phone.replace(/\D/g, "").length < 8) return toast.error("Completá tu nombre y teléfono");
          setSending(true);
          try {
            const c = await signIn({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined, marketingOptIn: form.optIn });
            toast.success(`¡Hola ${c.name.split(" ")[0]}!`);
          } finally {
            setSending(false);
          }
        }}
      >
        <Input label="Nombre y apellido" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Teléfono / WhatsApp" type="tel" inputMode="tel" autoComplete="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} hint="Si ya compraste, usá el mismo número y recuperamos tu historial." />
        <Input label="Email (opcional)" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Toggle checked={form.optIn} onChange={(v) => setForm({ ...form, optIn: v })} label="Recibir promociones y recordatorios" />
        <Button type="submit" size="lg" className="w-full" loading={sending}>Continuar</Button>
        <p className="text-center text-[11px] leading-relaxed text-neutral-500">Modo de prueba: el ingreso es por teléfono. Con la base de datos conectada se usa inicio de sesión seguro.</p>
      </form>
    </Card>
  );
}
