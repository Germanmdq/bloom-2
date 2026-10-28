"use client";

import { useEffect, useRef } from "react";

type Props = { src: string; poster?: string; className?: string; label?: string };

/**
 * Video decorativo que arranca solo, sin sonido y en loop (también en iPhone).
 * React no refleja `muted` como atributo del DOM, y Safari/iOS solo permite autoplay si el
 * elemento nace muteado: por eso se fuerza por ref y se reintenta ante bloqueo o regreso a la pestaña.
 */
export default function AutoplayVideo({ src, poster, className, label }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    const tryPlay = () => {
      if (v.paused) v.play().catch(() => {});
    };
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
    };
  }, []);

  return (
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
  );
}
