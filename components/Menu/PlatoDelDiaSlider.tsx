"use client";

import { useEffect, useRef, useState } from "react";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop";
const AUTOPLAY_MS = 5000;

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val);

export default function PlatoDelDiaSlider({
  items,
  onSelect,
}: {
  items: any[];
  onSelect: (item: any) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  const scrollToIndex = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  };

  // Sincroniza el punto activo con el scroll (swipe manual o autoplay)
  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  };

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      scrollToIndex((active + 1) % items.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [active, items.length]);

  if (items.length === 0) return null;

  return (
    <div
      className="relative"
      onPointerDown={() => (pausedRef.current = true)}
      onPointerUp={() => (pausedRef.current = false)}
      onPointerLeave={() => (pausedRef.current = false)}
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="plato-slider flex overflow-x-auto snap-x snap-mandatory rounded-[22px] shadow-md border border-[#c4b896]/25 bg-white"
      >
        {items.map((item) => (
          <article
            key={item.id}
            onClick={() => onSelect(item)}
            className="snap-start shrink-0 w-full cursor-pointer"
          >
            <div className="w-full h-[210px] sm:h-[280px] relative bg-[#edeae0] overflow-hidden">
              <img
                src={item.image_url || FALLBACK_IMAGE}
                alt=""
                draggable={false}
                className="w-full h-full object-cover select-none"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                }}
              />
              <span className="absolute top-3 left-3 bg-[#1a3028] text-[#f5e8ca] text-[11px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full shadow">
                ⭐ Plato del día
              </span>
            </div>
            <div className="p-4 pb-5">
              <h3 className="font-extrabold text-lg text-[#1a3028] leading-snug">{item.name}</h3>
              {item.description && (
                <p className="text-[13px] text-[#6b6756] mt-1.5 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#c4b896]/20">
                <span className="font-extrabold text-xl text-[#1a3028]">
                  {item.price ? formatCurrency(Number(item.price)) : "Consultar"}
                </span>
                <span className="bg-[#1a3028] text-[#f5e8ca] text-xs font-bold px-4 py-2 rounded-full shadow-sm">
                  Ver detalle →
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Ver plato ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === active ? "w-6 bg-[#1a3028]" : "w-2 bg-[#c4b896]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
