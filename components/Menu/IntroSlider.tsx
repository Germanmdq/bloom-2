"use client";

import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { TakeAwayIcon, SalonIcon, DishIcon } from "./AnimatedIcons";

const SLIDES = [
  {
    image: "/images/hero/barista-pouring.png",
    icon: SalonIcon,
    title: "Bienvenido a Bloom",
    text: "Café de especialidad, pastelería fresca y cocina casera todos los días.",
  },
  {
    image: "/images/categories/platos-diarios.png",
    icon: DishIcon,
    title: "Plato del día",
    text: "Cada día una receta distinta, recién hecha por nuestra cocina.",
  },
  {
    image: "/images/hero/hero-cafe-croissants.png",
    icon: TakeAwayIcon,
    title: "Take Away o Salón",
    text: "Pedí para llevar o desde tu mesa, sin esperar al mozo.",
  },
];

const SWIPE_THRESHOLD = 60;

export default function IntroSlider({ onFinish }: { onFinish: () => void }) {
  const [[index, direction], setSlide] = useState<[number, number]>([0, 0]);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const Icon = slide.icon;

  const goTo = (next: number) => {
    if (next < 0 || next >= SLIDES.length) return;
    setSlide([next, next > index ? 1 : -1]);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      if (isLast) onFinish();
      else goTo(index + 1);
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      goTo(index - 1);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-[#1a3028] overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={index}
          custom={direction}
          initial={{ x: direction >= 0 ? "100%" : "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: direction >= 0 ? "-100%" : "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 34 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 touch-pan-y"
        >
          <img
            src={slide.image}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a3028] via-[#1a3028]/70 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 px-6 pb-40 max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-[#f5e8ca]/10 border border-[#f5e8ca]/25 backdrop-blur-md flex items-center justify-center text-[#f5e8ca]">
              <Icon size={46} />
            </div>
            <h2 className="text-3xl font-extrabold text-[#f5e8ca] tracking-tight">{slide.title}</h2>
            <p className="text-sm text-[#a8c9b8] mt-3 leading-relaxed">{slide.text}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {!isLast && (
        <button
          type="button"
          onClick={onFinish}
          className="absolute top-5 right-5 z-10 text-xs font-bold text-[#f5e8ca]/80 bg-black/25 backdrop-blur-md px-4 py-2 rounded-full"
        >
          Saltar
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-10 max-w-md mx-auto">
        <div className="flex justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir a la pantalla ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? "w-7 bg-[#f5e8ca]" : "w-2 bg-[#f5e8ca]/35"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (isLast ? onFinish() : goTo(index + 1))}
          className="w-full flex items-center justify-center gap-2 bg-[#c4b896] text-[#1a3028] text-sm font-extrabold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
        >
          {isLast ? "Comenzar" : "Siguiente"}
          <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}
