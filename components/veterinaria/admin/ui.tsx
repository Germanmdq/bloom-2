"use client";
/** Piezas reutilizables del panel de administración (mobile-first). */
import Link from "next/link";
import type { ReactNode } from "react";
import { Search, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, Select, Textarea, Toggle } from "../ui/primitives";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-vet-display text-2xl font-extrabold tracking-[-0.01em] sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-neutral-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[15px] font-bold text-vet-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, change, hint, href, tone = "default" }: { label: string; value: string; change?: number | null; hint?: string; href?: string; tone?: "default" | "warn" | "danger" }) {
  const body = (
    <>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={cn("mt-1 font-vet-display text-[26px] font-extrabold leading-none tabular-nums", tone === "warn" ? "text-amber-700" : tone === "danger" ? "text-red-700" : "text-vet-ink")}>{value}</p>
      <div className="mt-2 flex min-h-5 items-center gap-2 text-xs">
        {change != null && (
          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold", change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
            {change >= 0 ? <TrendingUp className="size-3" aria-hidden="true" /> : <TrendingDown className="size-3" aria-hidden="true" />}
            {change >= 0 ? "+" : ""}
            {Math.round(change * 100)}%
          </span>
        )}
        {hint && <span className="text-neutral-500">{hint}</span>}
      </div>
    </>
  );
  const cls = "block rounded-3xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition";
  return href ? (
    <Link href={href} className={cn(cls, "hover:-translate-y-0.5 hover:shadow-md")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Buscar…", label = "Buscar" }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <label className="sr-only" htmlFor={`sb-${label}`}>{label}</label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
      <input id={`sb-${label}`} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-10 pr-3 text-[15px] outline-none focus:border-vet-primary focus:ring-4 focus:ring-vet-primary/15" />
    </div>
  );
}

export function Chips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div className="vet-scroll-x -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ring-1 transition", value === o.value ? "bg-vet-ink text-white ring-vet-ink" : "bg-white text-vet-ink ring-black/[0.08] hover:ring-vet-primary/40")}>
          {o.label}
          {o.count != null && <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", value === o.value ? "bg-white/20" : "bg-black/[0.06]")}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ─────────────── Formularios declarativos ───────────────

export type FieldDef<T> =
  | { key: keyof T & string; label: string; type: "text" | "email" | "tel" | "url" | "date" | "time" | "color"; required?: boolean; hint?: string; placeholder?: string; full?: boolean }
  | { key: keyof T & string; label: string; type: "number" | "money"; required?: boolean; hint?: string; min?: number; step?: number; nullable?: boolean; full?: boolean }
  | { key: keyof T & string; label: string; type: "textarea"; hint?: string; placeholder?: string; full?: boolean }
  | { key: keyof T & string; label: string; type: "select"; options: { value: string; label: string }[]; hint?: string; full?: boolean }
  | { key: keyof T & string; label: string; type: "toggle"; hint?: string; full?: boolean }
  | { key: keyof T & string; label: string; type: "multi"; options: { value: string; label: string }[]; hint?: string; full?: boolean }
  | { key: keyof T & string; label: string; type: "tags"; hint?: string; placeholder?: string; full?: boolean };

export function FormFields<T extends object>({ fields, value, onChange }: { fields: FieldDef<T>[]; value: T; onChange: (v: T) => void }) {
  const v = value as Record<string, unknown>;
  const set = (k: string, x: unknown) => onChange({ ...value, [k]: x } as T);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {fields.map((f) => {
        const cls = f.full || f.type === "textarea" || f.type === "multi" || f.type === "toggle" ? "sm:col-span-2" : undefined;
        switch (f.type) {
          case "textarea":
            return <Textarea key={f.key} label={f.label} hint={f.hint} placeholder={f.placeholder} className={cls} value={(v[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />;
          case "select":
            return (
              <Select key={f.key} label={f.label} hint={f.hint} className={cls} value={(v[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            );
          case "toggle":
            return (
              <div key={f.key} className={cls}>
                <Toggle checked={Boolean(v[f.key])} onChange={(x) => set(f.key, x)} label={f.label} description={f.hint} />
              </div>
            );
          case "multi": {
            const arr = (v[f.key] as string[]) ?? [];
            return (
              <fieldset key={f.key} className={cls}>
                <legend className="mb-1.5 text-[13px] font-semibold text-vet-ink/80">{f.label}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {f.options.map((o) => {
                    const on = arr.includes(o.value);
                    return (
                      <button key={o.value} type="button" aria-pressed={on} onClick={() => set(f.key, on ? arr.filter((x) => x !== o.value) : [...arr, o.value])} className={cn("h-9 rounded-full px-3 text-[13px] font-semibold ring-1", on ? "bg-vet-primary text-white ring-vet-primary" : "bg-white ring-black/10")}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                {f.hint && <p className="mt-1 text-xs text-neutral-500">{f.hint}</p>}
              </fieldset>
            );
          }
          case "tags":
            return <Input key={f.key} label={f.label} hint={f.hint ?? "Separados por coma"} placeholder={f.placeholder} className={cls} value={((v[f.key] as string[]) ?? []).join(", ")} onChange={(e) => set(f.key, e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />;
          case "number":
          case "money": {
            const raw = v[f.key];
            return (
              <Input
                key={f.key}
                label={f.label}
                hint={f.hint}
                required={f.required}
                className={cls}
                type="number"
                inputMode={f.type === "money" ? "numeric" : "decimal"}
                min={f.min ?? 0}
                step={f.step ?? (f.type === "money" ? 1 : "any")}
                value={raw == null ? "" : String(raw)}
                placeholder={f.nullable ? "Vacío = consultar" : undefined}
                onChange={(e) => set(f.key, e.target.value === "" ? (f.nullable ? null : 0) : Number(e.target.value))}
              />
            );
          }
          default:
            return <Input key={f.key} label={f.label} hint={f.hint} placeholder={f.placeholder} required={f.required} className={cls} type={f.type} value={(v[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />;
        }
      })}
    </div>
  );
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">{children}</p>;
}
