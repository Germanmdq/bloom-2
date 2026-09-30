"use client";
/**
 * Componentes base del diseño Vida de Perros: botones, badges, campos de
 * formulario accesibles, hojas (bottom sheets) y estados vacíos.
 * Mobile-first: objetivos táctiles de 44px mínimo y foco visible.
 */
import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "whatsapp" | "dark";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-vet-primary text-white shadow-sm shadow-vet-primary/20 hover:bg-vet-primary-dark",
  secondary: "bg-vet-tint text-vet-primary-dark hover:bg-vet-tint-strong",
  ghost: "text-vet-ink hover:bg-black/5",
  outline: "border border-black/10 bg-white text-vet-ink hover:border-vet-primary/40 hover:bg-vet-tint/50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  whatsapp: "bg-[#128C4B] text-white hover:bg-[#0e7a40] shadow-sm shadow-green-900/10",
  dark: "bg-vet-ink text-white hover:bg-black",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-xl",
  md: "h-11 px-4.5 text-sm gap-2 rounded-2xl",
  lg: "h-13 px-6 text-[15px] gap-2 rounded-2xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center font-semibold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }>(
  function Button({ variant = "primary", size = "md", className, loading, children, disabled, ...props }, ref) {
    return (
      <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
        {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);

export function ButtonLink({ href, variant = "primary", size = "md", className, children, external, ...rest }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode; external?: boolean; onClick?: () => void; "aria-label"?: string }) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(variant, size, className)} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

const TONES = {
  teal: "bg-vet-tint text-vet-primary-dark",
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  gray: "bg-neutral-100 text-neutral-700",
  blue: "bg-sky-50 text-sky-800",
  violet: "bg-violet-50 text-violet-800",
  pink: "bg-pink-50 text-[#a3274c]",
  dark: "bg-vet-ink text-white",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "teal", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5", TONES[tone], className)}>{children}</span>;
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <Badge tone="amber" className={className}>
      Ejemplo
    </Badge>
  );
}

// ─────────────── Formularios accesibles ───────────────

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

function FieldWrap({ id, label, hint, error, required, className, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-vet-ink/80">
        {label}
        {required && <span className="text-vet-accent"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[15px] text-vet-ink placeholder:text-neutral-400 transition focus:border-vet-primary focus:outline-none focus:ring-4 focus:ring-vet-primary/15 disabled:bg-neutral-50";

export function Input({ label, hint, error, required, className, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const id = props.id ?? autoId;
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <input id={id} required={required} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className={inputClass} {...props} />
    </FieldWrap>
  );
}

export function Textarea({ label, hint, error, required, className, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const id = props.id ?? autoId;
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea id={id} required={required} aria-invalid={Boolean(error) || undefined} className={cn(inputClass, "h-auto min-h-24 py-3")} {...props} />
    </FieldWrap>
  );
}

export function Select({ label, hint, error, required, className, children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const id = props.id ?? autoId;
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <select id={id} required={required} className={cn(inputClass, "appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10")} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
        {children}
      </select>
    </FieldWrap>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-vet-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-vet-primary" : "bg-neutral-300")}
      >
        <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, size = "md", label = "Cantidad" }: { value: number; onChange: (v: number) => void; min?: number; max?: number; size?: "sm" | "md"; label?: string }) {
  const btn = size === "sm" ? "size-9" : "size-11";
  return (
    <div className="inline-flex items-center rounded-2xl border border-black/10 bg-white" role="group" aria-label={label}>
      <button type="button" className={cn(btn, "grid place-items-center rounded-l-2xl text-vet-ink transition hover:bg-black/5 disabled:opacity-30")} onClick={() => onChange(Math.max(min - 1, value - 1))} disabled={value <= min - 1} aria-label="Restar uno">
        <Minus className="size-4" />
      </button>
      <span className={cn("min-w-8 text-center font-semibold tabular-nums", size === "sm" ? "text-sm" : "text-base")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={cn(btn, "grid place-items-center rounded-r-2xl text-vet-ink transition hover:bg-black/5 disabled:opacity-30")} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Sumar uno">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

// ─────────────── Hoja inferior / modal ───────────────

export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[2px] vet-rise" onClick={onClose} aria-label="Cerrar" tabIndex={-1} />
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-white shadow-2xl outline-none vet-rise sm:rounded-[28px]",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
          <div className="mx-auto h-1 w-10 rounded-full bg-black/10 sm:hidden absolute left-1/2 top-2 -translate-x-1/2" aria-hidden="true" />
          <h2 className="font-vet-display text-lg font-bold text-vet-ink">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full text-neutral-500 hover:bg-black/5" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="border-t border-black/5 px-5 py-3 vet-safe-bottom">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-black/10 bg-white/60 px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-vet-tint text-vet-primary">{icon}</div>
      <h3 className="font-vet-display text-lg font-bold text-vet-ink">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-neutral-600">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-3xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(20,60,60,0.12)]", className)}>{children}</div>;
}

export function SectionTitle({ title, subtitle, action, as: Tag = "h2" }: { title: string; subtitle?: string; action?: ReactNode; as?: "h1" | "h2" | "h3" }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <Tag className="font-vet-display text-xl font-extrabold tracking-[-0.01em] text-vet-ink sm:text-2xl">{title}</Tag>
        {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex text-amber-500", className)} role="img" aria-label={`${value} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="size-4" fill={i < value ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="m10 1.8 2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z" />
        </svg>
      ))}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-black/[0.06]", className)} aria-hidden="true" />;
}
