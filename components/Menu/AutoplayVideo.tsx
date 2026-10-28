"use client";

import { useEffect, useRef, useState } from "react";

type Props = { src: string; poster?: string; className?: string; label?: string };

/**
 * Video decorativo que arranca solo, sin sonido y en loop (también en iPhone).
 * React no refleja `muted` como atributo del DOM, y Safari/iOS solo permite autoplay si el
 * elemento nace muteado: por eso se fuerza por ref y se reintenta ante bloqueo o regreso a la pestaña.
 */
export default function AutoplayVideo({ src, poster, className, label }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    const tryPlay = () => {
      if (v.paused) v.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    };
    const onPlaying = () => setBlocked(false);
    v.addEventListener("playing", onPlaying);
    tryPlay();
    const onVisible = () => document.visibilityState === "visible" && tryPlay();
    // Modo ahorro de batería / primer toque: si el navegador bloqueó el autoplay, arranca con la primera interacción.
    const onInteract = () => tryPlay();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("touchstart", onInteract, { once: true, passive: true });
    window.addEventListener("click", onInteract, { once: true });
    v.addEventListener("canplay", tryPlay);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("click", onInteract);
      v.removeEventListener("canplay", tryPlay);
      v.removeEventListener("playing", onPlaying);
    };
  }, []);

  return (
    <>
    <video
      ref={ref}
      className={className}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      controls={false}
      aria-label={label}
    >
      <source src={src} type="video/mp4" />
    </video>
    {blocked && (
      // Con el autoplay bloqueado (ahorro de batería en iPhone) queda la imagen de portada y un toque lo inicia.
      <button
        type="button"
        onClick={() => ref.current?.play().then(() => setBlocked(false)).catch(() => {})}
        className="absolute inset-0 grid place-items-center bg-black/10"
        aria-label="Reproducir video"
      >
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/80 text-2xl text-[#1a3028] shadow-lg">▶</span>
      </button>
    )}
    </>
  );
}
