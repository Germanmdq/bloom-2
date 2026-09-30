"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Download, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { BusinessSettings, PaymentMethod, Weekday } from "@/lib/vet/types";
import { INTEGRATIONS } from "@/lib/vet/config/integrations";
import { WEEKDAY_NAMES } from "@/lib/vet/domain/dates";
import { PAYMENT_LABEL } from "@/lib/vet/domain/labels";
import { ROLE_LABEL, ROLE_PERMISSIONS } from "@/lib/vet/domain/permissions";
import { COLLECTIONS } from "@/lib/vet/data/repository";
import { LocalRepository } from "@/lib/vet/data/local-repository";
import { useSettings, useVetData, getRepository } from "@/lib/vet/client/store";
import { uploadImage } from "@/lib/vet/client/images";
import { PageHeader, Panel } from "@/components/veterinaria/admin/ui";
import { RequirePermission } from "@/components/veterinaria/admin/AdminShell";
import { Button, Input, Textarea, Toggle } from "@/components/veterinaria/ui/primitives";

const DAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export default function ConfiguracionPage() {
  const settings = useSettings();
  const save = useVetData((s) => s.saveSettings);
  const [b, setB] = useState<BusinessSettings>(settings.business);
  const [saving, setSaving] = useState(false);
  useEffect(() => setB(settings.business), [settings.business]);
  const set = <K extends keyof BusinessSettings>(k: K, v: BusinessSettings[K]) => setB({ ...b, [k]: v });
  const nn = (v: string) => (v.trim() === "" ? null : v.trim());

  const integrations = [
    { name: "Base de datos (Supabase)", ok: INTEGRATIONS.dataSource === "supabase", hint: "NEXT_PUBLIC_VET_DATA_SOURCE=supabase" },
    { name: "Google Analytics", ok: Boolean(INTEGRATIONS.googleAnalyticsId), hint: "NEXT_PUBLIC_VET_GA_ID" },
    { name: "Google Search Console", ok: Boolean(INTEGRATIONS.googleSiteVerification), hint: "NEXT_PUBLIC_VET_GOOGLE_SITE_VERIFICATION" },
    { name: "Google Maps (embed con API key)", ok: Boolean(INTEGRATIONS.googleMapsEmbedKey), hint: "Opcional: NEXT_PUBLIC_VET_GOOGLE_MAPS_KEY" },
    { name: "Google Business Profile", ok: Boolean(INTEGRATIONS.googleBusinessProfileUrl), hint: "NEXT_PUBLIC_VET_GOOGLE_BUSINESS_URL" },
    { name: "Notificaciones push", ok: Boolean(INTEGRATIONS.vapidPublicKey), hint: "NEXT_PUBLIC_VET_VAPID_PUBLIC_KEY + clave privada en el servidor" },
    { name: "Mercado Pago (cobro online)", ok: INTEGRATIONS.mercadoPagoEnabled, hint: "NEXT_PUBLIC_VET_MERCADOPAGO_ENABLED + token en el servidor" },
    { name: "URL pública del sitio", ok: !INTEGRATIONS.siteUrl.includes("localhost"), hint: `NEXT_PUBLIC_VET_SITE_URL (hoy: ${INTEGRATIONS.siteUrl})` },
  ];

  return (
    <RequirePermission perm="settings.manage">
      <PageHeader
        title="Configuración del negocio"
        subtitle="Todo lo que cambies acá se refleja en la tienda, el SEO y los mensajes. Sin tocar código."
        actions={<Button loading={saving} onClick={async () => { setSaving(true); await save({ ...settings, business: b }); setSaving(false); toast.success("Configuración guardada"); }}>Guardar cambios</Button>}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Identidad">
          <div className="grid gap-3">
            <Input label="Nombre del negocio" value={b.name} onChange={(e) => set("name", e.target.value)} />
            <Input label="Frase / slogan" value={b.tagline} onChange={(e) => set("tagline", e.target.value)} />
            <Textarea label="Descripción (Google y redes)" value={b.description} onChange={(e) => set("description", e.target.value)} />
            <div className="flex items-center gap-3">
              <img src={b.logo} alt="Logo actual" className="h-14 w-auto rounded-xl bg-white p-1 ring-1 ring-black/5" />
              <label className="inline-flex h-11 cursor-pointer items-center rounded-2xl bg-vet-tint px-4 text-sm font-semibold text-vet-primary-dark">
                Subir logo
                <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { set("logo", await uploadImage(f, "brand", 600)); toast.success("Logo cargado: guardá para aplicarlo"); } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); } }} />
              </label>
            </div>
            <p className="text-xs text-neutral-500">Para cambiar también el ícono de la app instalada, reemplazá el archivo del logo y corré <code>npm run vet:pwa-assets</code> (ver guía).</p>
          </div>
        </Panel>

        <Panel title="Contacto y redes">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Teléfono (visible)" value={b.phone ?? ""} onChange={(e) => set("phone", nn(e.target.value))} />
            <Input label="WhatsApp (con código de país)" inputMode="numeric" value={b.whatsapp ?? ""} onChange={(e) => set("whatsapp", nn(e.target.value.replace(/[^\d]/g, "")))} hint="Ej: 5491159772229" />
            <Input label="Email" type="email" value={b.email ?? ""} onChange={(e) => set("email", nn(e.target.value))} />
            <Input label="Instagram (sin @)" value={b.instagram ?? ""} onChange={(e) => set("instagram", nn(e.target.value.replace("@", "")))} />
            <Input label="Facebook (URL)" value={b.facebook ?? ""} onChange={(e) => set("facebook", nn(e.target.value))} />
            <Input label="TikTok (URL)" value={b.tiktok ?? ""} onChange={(e) => set("tiktok", nn(e.target.value))} />
          </div>
        </Panel>

        <Panel title="Ubicación">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Calle y número" className="sm:col-span-2" value={b.address.street ?? ""} onChange={(e) => set("address", { ...b.address, street: nn(e.target.value) })} />
            <Input label="Localidad / barrio" value={b.address.city ?? ""} onChange={(e) => set("address", { ...b.address, city: nn(e.target.value) })} />
            <Input label="Provincia" value={b.address.province ?? ""} onChange={(e) => set("address", { ...b.address, province: nn(e.target.value) })} />
            <Input label="Código postal" value={b.address.postalCode ?? ""} onChange={(e) => set("address", { ...b.address, postalCode: nn(e.target.value) })} />
            <Input label="Link de Google Maps (opcional)" value={b.googleMapsUrl ?? ""} onChange={(e) => set("googleMapsUrl", nn(e.target.value))} />
            <Input label="Latitud" inputMode="decimal" value={b.geo?.lat ?? ""} onChange={(e) => set("geo", e.target.value === "" ? null : { lat: Number(e.target.value), lng: b.geo?.lng ?? 0 })} hint="En Google Maps: clic derecho sobre el local → copiar coordenadas" />
            <Input label="Longitud" inputMode="decimal" value={b.geo?.lng ?? ""} onChange={(e) => set("geo", e.target.value === "" ? null : { lat: b.geo?.lat ?? 0, lng: Number(e.target.value) })} />
            <Input label="Zonas/barrios que atienden (SEO local)" className="sm:col-span-2" value={b.areaServed.join(", ")} onChange={(e) => set("areaServed", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} hint="Separados por coma" />
          </div>
        </Panel>

        <Panel title="Horarios de atención">
          <Toggle checked={b.hoursConfirmed} onChange={(v) => set("hoursConfirmed", v)} label="Horarios confirmados" description="Mientras esté apagado, la tienda muestra «a confirmar» y no se publican en Google." />
          <ul className="mt-3 space-y-2">
            {DAYS.map((d) => {
              const h = b.hours.find((x) => x.day === d);
              const ranges = h?.ranges ?? [];
              const setRanges = (r: typeof ranges) => set("hours", [...b.hours.filter((x) => x.day !== d), ...(r.length ? [{ day: d, ranges: r }] : [])].sort((a, z) => a.day - z.day));
              return (
                <li key={d} className="rounded-2xl bg-vet-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{WEEKDAY_NAMES[d]}</span>
                    <button type="button" onClick={() => setRanges([...ranges, { from: "09:00", to: "13:00" }])} className="inline-flex h-8 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-vet-primary-dark hover:bg-vet-tint"><Plus className="size-3.5" /> Franja</button>
                  </div>
                  {ranges.length ? ranges.map((r, i) => (
                    <div key={i} className="mt-2 flex items-end gap-2">
                      <Input className="min-w-0 flex-1" label="Desde" type="time" value={r.from} onChange={(e) => setRanges(ranges.map((x, k) => (k === i ? { ...x, from: e.target.value } : x)))} />
                      <Input className="min-w-0 flex-1" label="Hasta" type="time" value={r.to} onChange={(e) => setRanges(ranges.map((x, k) => (k === i ? { ...x, to: e.target.value } : x)))} />
                      <button type="button" onClick={() => setRanges(ranges.filter((_, k) => k !== i))} className="grid size-12 shrink-0 place-items-center rounded-2xl text-red-600 hover:bg-red-50" aria-label="Quitar franja"><Trash2 className="size-4" /></button>
                    </div>
                  )) : <p className="mt-1 text-sm text-neutral-500">Cerrado</p>}
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Pagos">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => {
              const on = b.paymentMethods.includes(m);
              return <button key={m} type="button" aria-pressed={on} onClick={() => set("paymentMethods", on ? b.paymentMethods.filter((x) => x !== m) : [...b.paymentMethods, m])} className={`h-10 rounded-full px-4 text-sm font-semibold ring-1 ${on ? "bg-vet-primary text-white ring-vet-primary" : "bg-white ring-black/10"}`}>{PAYMENT_LABEL[m]}</button>;
            })}
          </div>
          <Textarea label="Datos para transferencia (se muestran al cliente)" className="mt-3" value={b.bankTransferInfo ?? ""} onChange={(e) => set("bankTransferInfo", nn(e.target.value))} placeholder="Alias, CBU y titular" />
        </Panel>

        <Panel title="Colores de la marca">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([["primary", "Principal (turquesa)"], ["primaryDark", "Principal oscuro"], ["accent", "Acento (rosa)"], ["warm", "Cálido (huellas)"], ["surface", "Fondo"], ["ink", "Texto"]] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 rounded-2xl bg-vet-surface p-2 text-sm">
                <input type="color" value={b.colors[k]} onChange={(e) => set("colors", { ...b.colors, [k]: e.target.value })} className="size-10 cursor-pointer rounded-xl border-0 bg-transparent" />
                <span className="leading-tight">{label}<br /><code className="text-xs text-neutral-500">{b.colors[k]}</code></span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">Elegí colores con buen contraste: el texto blanco debe leerse bien sobre el color principal.</p>
        </Panel>

        <Panel title="Integraciones">
          <ul className="space-y-2 text-sm">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-start gap-2">
                {i.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-neutral-400" />}
                <span><strong className="font-semibold">{i.name}</strong><span className="block text-xs text-neutral-500">{i.ok ? "Configurado" : `Pendiente · ${i.hint}`}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-neutral-500">Las claves se cargan como variables de entorno en el hosting, nunca en el código ni en esta pantalla.</p>
        </Panel>

        <Panel title="Roles y permisos">
          <ul className="space-y-2 text-sm">
            {(["ADMIN", "EMPLEADO", "CLIENTE"] as const).map((r) => (
              <li key={r} className="rounded-2xl bg-vet-surface p-3"><strong>{ROLE_LABEL[r]}:</strong> <span className="text-neutral-600">{r === "ADMIN" ? "puede modificar todo." : r === "EMPLEADO" ? "gestiona pedidos, turnos, clientes, mascotas y stock (no precios ni configuración)." : "gestiona su cuenta, mascotas, pedidos y turnos."}</span> <span className="block text-xs text-neutral-400">{ROLE_PERMISSIONS[r].length} permisos</span></li>
            ))}
          </ul>
        </Panel>

        <Panel title="Datos y copias de seguridad" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const repo = await getRepository();
                const dump: Record<string, unknown> = { exportedAt: new Date().toISOString(), settings: await repo.getSettings() };
                for (const c of COLLECTIONS) dump[c] = await repo.list(c);
                const url = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = `vida-de-perros-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="size-4" /> Descargar copia (JSON)
            </Button>
            {INTEGRATIONS.dataSource === "demo" && (
              <>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!confirm("¿Borrar clientes, mascotas, pedidos, reseñas, cupones y combos de EJEMPLO? El catálogo y la configuración se mantienen.")) return;
                    const st = useVetData.getState();
                    await st.ensure(["customers", "pets", "orders", "appointments", "waitlist", "carts", "reviews", "coupons", "combos"]);
                    for (const name of ["customers", "pets", "orders", "reviews", "coupons", "combos"] as const) {
                      for (const item of (st.data[name] ?? []) as { id: string; demo?: boolean }[]) if (item.demo) await st.remove(name, item.id);
                    }
                    for (const name of ["appointments", "waitlist", "carts"] as const) {
                      for (const item of (st.data[name] ?? []) as { id: string }[]) if (item.id.startsWith("demo-")) await st.remove(name, item.id);
                    }
                    toast.success("Datos de ejemplo borrados");
                  }}
                >
                  <Trash2 className="size-4" /> Borrar datos de ejemplo
                </Button>
                <Button variant="ghost" className="text-red-600" onClick={() => { if (confirm("¿Volver todo al estado inicial en este navegador?")) { LocalRepository.resetAll(); location.reload(); } }}>
                  <RotateCcw className="size-4" /> Reiniciar demo
                </Button>
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            {INTEGRATIONS.dataSource === "demo" ? "Modo de prueba: los datos viven en este navegador. Con Supabase, la base tiene copias automáticas y esta descarga sirve como respaldo adicional." : "Datos en Supabase (PostgreSQL). Configurá las copias automáticas del proyecto en el panel de Supabase."}
          </p>
        </Panel>
      </div>
    </RequirePermission>
  );
}
