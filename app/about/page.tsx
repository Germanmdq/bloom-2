"use client";

import IconPhoto from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { IconMapPin, IconBrandInstagram } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useFachadaImageUrl } from "@/lib/hooks/useFachadaImageUrl";
import { FoodKingMobileNavPanel } from "@/components/FoodKingMobileNav";
import { SiteHeader } from "@/components/SiteHeader";

const STORY_P1 =
  "Bloom es una cafetería familiar creada por Bárbara y Agustín como un proyecto lleno de amor, desafío y vocación. Somos un espacio cálido y de encuentro, donde ofrecemos cafés clásicos, sabores tradicionales y comidas caseras, elaboradas con ingredientes de calidad y ese toque hogareño que te hace sentir como en casa.";

const STORY_P2 =
  "Nuestros hijos forman parte de nuestro día a día, y esa esencia familiar se refleja en el ambiente, en el equipo y en la forma en que recibimos a cada cliente. En Bloom buscamos que todos se sientan bienvenidos, cómodos y felices de volver.";

function Hero({ fachadaSrc }: { fachadaSrc: string }) {
  return (
    <section className="relative w-full min-h-[min(72vh,820px)] overflow-hidden bg-neutral-950">
      <IconPhoto
        src={fachadaSrc}
        alt="Fachada Bloom IconCoffee & More, Mar del Plata"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#142620] via-black/50 to-black/35" />
      <div className="absolute inset-0 bg-gradient-to-br from-english-900/40 via-transparent to-bloom-900/20" />

      <div className="relative z-10 flex min-h-[min(72vh,820px)] flex-col items-center justify-end px-6 pb-16 pt-12 text-center md:pb-20">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.75, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="max-w-3xl"
        >
          <p className="font-sans text-xs md:text-sm tracking-[0.35em] font-semibold mb-4 text-bloom-gold/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
            NUESTRA HISTORIA
          </p>
          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase mb-8 leading-[1.08] text-white [text-shadow:0_4px_40px_rgba(0,0,0,0.55),0_2px_12px_rgba(0,0,0,0.4)]">
            Familia, café
            <br />
            <span className="text-bloom-gold">y vocación</span>
          </h1>
          <p className="font-sans max-w-2xl mx-auto text-white/92 leading-relaxed text-base md:text-lg font-medium [text-shadow:0_2px_20px_rgba(0,0,0,0.45)]">
            {STORY_P1}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function StoryBody() {
  return (
    <section className="py-16 md:py-24 bg-bloom-page text-piedra">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="relative rounded-2xl md:rounded-3xl bg-white border border-bloom-200/80 p-8 md:p-12 shadow-[0_16px_48px_-12px_rgba(61,59,47,0.12),0_4px_16px_rgba(61,59,47,0.06)]">
          <div className="absolute left-0 top-10 bottom-10 w-1 rounded-full bg-gradient-to-b from-bloom-gold via-bloom-600 to-bloom-gold/40 md:top-12 md:bottom-12" aria-hidden />
          <p className="font-sans text-lg md:text-xl leading-relaxed text-piedra/90 pl-5 md:pl-6">
            {STORY_P2}
          </p>
        </div>
      </div>
    </section>
  );
}

function LocationCard({ fachadaSrc }: { fachadaSrc: string }) {
  return (
    <section className="py-12 md:py-20 bg-crema text-piedra">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="font-sans text-2xl md:text-3xl font-black tracking-wide uppercase text-chocolate drop-shadow-sm">
            Dónde estamos
          </h2>
          <div className="w-14 h-1 bg-bloom-600/80 mx-auto mt-4 rounded-full" />
        </div>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-2xl md:rounded-3xl bg-white shadow-[0_20px_56px_-12px_rgba(61,59,47,0.18),0_8px_24px_rgba(61,59,47,0.08)] ring-1 ring-black/[0.06]"
        >
          <div className="relative aspect-[16/10] w-full bg-neutral-100">
            <IconPhoto
              src={fachadaSrc}
              alt="Bloom · Almirante Brown, Mar del Plata"
              fill
              className="object-cover object-center"
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
          <div className="p-6 md:p-8 text-center md:text-left md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <h3 className="font-sans text-xl font-black tracking-wide text-piedra mb-1">Bloom · Mar del Plata</h3>
              <p className="text-neutral-500 text-sm font-medium">IconCoffee &amp; more · Cafetería y restó</p>
            </div>
            <a
              href="https://maps.google.com/?q=Almirante+Brown+2005+Mar+del+Plata"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 mt-4 md:mt-0 rounded-full bg-bloom-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-bloom-700 transition-colors"
            >
              <IconMapPin size={18} />
              Almirante Brown 2005
            </a>
          </div>
        </motion.article>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-piedra text-crema py-14 border-t border-white/5">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <p className="font-sans text-xl font-black tracking-[0.2em] mb-1">BLOOM</p>
          <p className="text-gris text-sm">IconCoffee &amp; more · Mar del Plata</p>
        </div>
        <div className="flex gap-6">
          <Link
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-crema/80 hover:text-bloom-gold transition-colors"
            aria-label="IconBrandInstagram"
          >
            <IconBrandInstagram size={22} />
          </Link>
        </div>
        <p className="text-xs text-gris">© {new Date().getFullYear()} Bloom</p>
      </div>
    </footer>
  );
}

export default function AboutPage() {
  const fachadaSrc = useFachadaImageUrl();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-crema selection:bg-chocolate selection:text-crema">
      <FoodKingMobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <SiteHeader scrolled={scrolled} onMobileNavOpen={() => setMobileNavOpen(true)} activeNav="about" />
      <Hero fachadaSrc={fachadaSrc} />
      <StoryBody />
      <LocationCard fachadaSrc={fachadaSrc} />
      <Footer />
    </main>
  );
}
