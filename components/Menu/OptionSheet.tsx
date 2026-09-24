"use client";

import { useEffect, useState } from "react";
import { motion, useDragControls, PanInfo } from "framer-motion";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import WheelPicker from "./WheelPicker";
import type { MenuItem } from "@/lib/menu/catalog";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val);

export interface SheetLine {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

/**
 * Hoja inferior para elegir variantes y opciones de un producto. Emerge desde
 * abajo; se cierra tocando afuera, con la X, deslizando hacia abajo o con Esc.
 * Solo agrega al pedido cuando están todas las selecciones obligatorias.
 */
export default function OptionSheet({
  item,
  categoryName,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  categoryName?: string;
  onClose: () => void;
  onAdd: (line: SheetLine, quantity: number) => void;
}) {
  const dragControls = useDragControls();
  const [variantIdx, setVariantIdx] = useState<number | null>(item.variants.length === 1 ? 0 : null);
  const [optionValues, setOptionValues] = useState<(number | null)[]>(
    item.options.map((o) => o.defaultIndex ?? null)
  );
  const [repeatValues, setRepeatValues] = useState<(number | null)[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const variant = variantIdx === null ? null : item.variants[variantIdx];
  const repeatCount = variant && item.repeat ? item.repeat.count(variant.label) : 0;
  const pickCount = variant && item.pick ? item.pick.count(variant.label) : 0;
  const unitPrice = variant?.price ?? item.price;

  // Al cambiar de variante se ajustan las facturas / ingredientes a elegir
  useEffect(() => {
    setRepeatValues((prev) => Array.from({ length: repeatCount }, (_, i) => prev[i] ?? null));
  }, [repeatCount]);
  useEffect(() => {
    setPicked((prev) => prev.slice(0, pickCount));
  }, [pickCount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const missing = (): string | null => {
    if (!variant) return `Elegí ${item.variantTitle.toLowerCase()}.`;
    const option = item.options.find((_, i) => optionValues[i] === null);
    if (option) return `Elegí ${option.name.toLowerCase()}.`;
    if (repeatValues.some((v) => v === null))
      return repeatCount > 1 ? "Elegí todas las facturas." : "Elegí la factura.";
    if (item.pick && picked.length !== pickCount)
      return `Elegí exactamente ${pickCount} ${item.pick.name.toLowerCase()}.`;
    return null;
  };

  const handleAdd = () => {
    const error = missing();
    if (error || !variant) {
      toast.error(error ?? "Completá las opciones.");
      return;
    }
    const details = [
      ...item.options
        .map((o, i) => ({ o, v: optionValues[i]! }))
        .filter(({ o, v }) => v !== o.defaultIndex)
        .map(({ o, v }) => `${o.name}: ${o.choices[v]}`),
      ...(item.repeat && repeatCount
        ? [
            `${repeatCount > 1 ? "Facturas" : item.repeat.name}: ${repeatValues
              .map((v) => item.repeat!.choices[v!])
              .join(" + ")}`,
          ]
        : []),
      ...(item.pick && pickCount ? [`${item.pick.name}: ${picked.join(", ")}`] : []),
    ];
    onAdd(
      {
        id: variant.productId,
        name: [variant.cartName, ...details].join(" · "),
        price: variant.price,
        image_url: variant.image_url,
      },
      quantity
    );
  };

  const togglePick = (choice: string) => {
    setPicked((prev) => {
      if (prev.includes(choice)) return prev.filter((c) => c !== choice);
      if (prev.length >= pickCount) {
        toast.error(
          pickCount ? `Podés elegir hasta ${pickCount} ingredientes.` : "Primero elegí la cantidad de ingredientes."
        );
        return prev;
      }
      return [...prev, choice];
    });
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  const image = variant?.image_url || item.image_url;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={handleDragEnd}
        className="relative w-full max-w-lg bg-white rounded-t-[28px] shadow-2xl max-h-[92vh] flex flex-col z-[160]"
      >
        {/* Zona para arrastrar hacia abajo */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="pt-2.5 pb-3 px-5 cursor-grab touch-none select-none border-b border-[#c4b896]/20"
        >
          <div className="w-10 h-1.5 rounded-full bg-[#d9d4c2] mx-auto mb-3" />
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {categoryName && (
                <small className="text-[10px] font-bold uppercase tracking-widest text-[#7a765a]">
                  {categoryName}
                </small>
              )}
              <h2 className="font-extrabold text-xl text-[#4b4e38] leading-tight truncate">{item.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-9 h-9 rounded-full bg-[#f2f0e6] text-[#4b4e38] flex items-center justify-center shrink-0"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 pt-4 pb-4 space-y-5">
          <div className="flex gap-4 items-start">
            <img
              src={image || FALLBACK_IMAGE}
              alt=""
              className="w-20 h-20 rounded-2xl object-cover bg-[#edeae0] shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
              }}
            />
            <div className="min-w-0">
              {item.description && (
                <p className="text-[13px] text-[#6b6756] leading-relaxed">{item.description}</p>
              )}
              <span className="block mt-1 font-extrabold text-lg text-[#4b4e38]">
                {variant || item.variants.length === 1
                  ? formatCurrency(unitPrice)
                  : `Desde ${formatCurrency(item.price)}`}
              </span>
            </div>
          </div>

          {item.variants.length > 1 && (
            <Section title={item.variantTitle}>
              <WheelPicker
                label={item.variantTitle}
                items={item.variants.map((v) => `${v.label} · ${formatCurrency(v.price)}`)}
                value={variantIdx}
                onChange={setVariantIdx}
              />
            </Section>
          )}

          {item.options.map((option, i) => (
            <Section key={option.name} title={option.name}>
              <WheelPicker
                label={option.name}
                items={option.choices}
                value={optionValues[i]}
                onChange={(v) => setOptionValues((prev) => prev.map((x, j) => (j === i ? v : x)))}
              />
            </Section>
          ))}

          {item.repeat &&
            repeatValues.map((value, i) => (
              <Section
                key={`repeat-${i}`}
                title={repeatCount > 1 ? `${item.repeat!.name} ${i + 1}` : item.repeat!.name}
              >
                <WheelPicker
                  label={`${item.repeat!.name} ${i + 1}`}
                  items={item.repeat!.choices}
                  value={value}
                  onChange={(v) => setRepeatValues((prev) => prev.map((x, j) => (j === i ? v : x)))}
                />
              </Section>
            ))}

          {item.pick && (
            <Section
              title={`${item.pick.name}${pickCount ? ` (${picked.length}/${pickCount})` : ""}`}
            >
              <div className="grid grid-cols-3 gap-2">
                {item.pick.choices.map((choice) => {
                  const active = picked.includes(choice);
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => togglePick(choice)}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                        active
                          ? "bg-[#777b5b] text-[#f5e8ca] border-[#777b5b]"
                          : "bg-white text-[#4b4e38] border-[#c4b896]/50"
                      }`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7a765a]">Cantidad</span>
            <div className="flex items-center gap-3 bg-[#f2f0e6] px-3 py-1.5 rounded-full border border-[#c4b896]/30">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="p-1 rounded-full text-[#4b4e38] disabled:opacity-30"
                aria-label="Disminuir cantidad"
              >
                <Minus size={16} />
              </button>
              <span className="font-bold text-sm min-w-[20px] text-center text-[#4b4e38]">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="p-1 rounded-full text-[#4b4e38]"
                aria-label="Aumentar cantidad"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#c4b896]/20 bg-white">
          <button type="button" onClick={handleAdd} className="primary-action !mt-0">
            <ShoppingBag size={20} />
            <span>Agregar al pedido · {formatCurrency(unitPrice * quantity)}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-black uppercase tracking-wider text-[#4b4e38] mb-2">{title}</h3>
      {children}
    </section>
  );
}
