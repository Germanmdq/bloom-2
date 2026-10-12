type IconProps = { size?: number; className?: string };

export function TakeAwayIcon({ size = 44, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10 16h28l-2.5 24a3 3 0 0 1-3 2.7H15.5a3 3 0 0 1-3-2.7L10 16z" />
      <path d="M17 20v-6a7 7 0 0 1 14 0v6" />
      <path d="M18.5 30l4 4 7-8" />
    </svg>
  );
}

export function SalonIcon({ size = 44, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 6c-2 2.5 2 4.5 0 7M24 5c-2 2.5 2 4.5 0 7M30 6c-2 2.5 2 4.5 0 7" />
      <path d="M11 18h26v9a11 11 0 0 1-11 11h-4a11 11 0 0 1-11-11v-9zM37 21h2.5a4.5 4.5 0 0 1 0 9H36M8 43h32" />
    </svg>
  );
}
