// Íconos minimalistas animados (trazo fino + animación CSS), en el estilo
// de animatedicons.co/minimalistic. Las animaciones viven en menu-pwa.css.

type IconProps = { size?: number; className?: string };

export function TakeAwayIcon({ size = 44, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`anim-icon anim-bag ${className}`}
      aria-hidden="true"
    >
      <g className="anim-bag-body">
        <path d="M10 16h28l-2.5 24a3 3 0 0 1-3 2.7H15.5a3 3 0 0 1-3-2.7L10 16z" />
        <path className="anim-bag-handle" d="M17 20v-6a7 7 0 0 1 14 0v6" />
      </g>
      <path className="anim-bag-check" d="M18.5 30l4 4 7-8" />
    </svg>
  );
}

export function SalonIcon({ size = 44, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`anim-icon anim-cup ${className}`}
      aria-hidden="true"
    >
      <path className="anim-steam anim-steam-1" d="M18 6c-2 2.5 2 4.5 0 7" />
      <path className="anim-steam anim-steam-2" d="M24 5c-2 2.5 2 4.5 0 7" />
      <path className="anim-steam anim-steam-3" d="M30 6c-2 2.5 2 4.5 0 7" />
      <path d="M11 18h26v9a11 11 0 0 1-11 11h-4a11 11 0 0 1-11-11v-9z" />
      <path d="M37 21h2.5a4.5 4.5 0 0 1 0 9H36" />
      <path d="M8 43h32" />
    </svg>
  );
}

export function DishIcon({ size = 44, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`anim-icon anim-dish ${className}`}
      aria-hidden="true"
    >
      <g className="anim-dish-lid">
        <path d="M8 32a16 16 0 0 1 32 0" />
        <path d="M24 13v3" />
        <circle cx="24" cy="11" r="2" />
      </g>
      <path d="M5 36h38" />
    </svg>
  );
}
