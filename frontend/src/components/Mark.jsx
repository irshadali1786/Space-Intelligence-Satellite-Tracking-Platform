/**
 * ORBITX brand mark — decorative only.
 * Gold targeting ring, tilted orbit ellipse, hollow core and an amber satellite.
 */
export default function Mark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="orbitx-gold" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFF3C4" />
          <stop offset="0.45" stopColor="#D4A63C" />
          <stop offset="1" stopColor="#7A5818" />
        </linearGradient>
      </defs>
      {/* outer instrument ring with four index ticks */}
      <circle cx="24" cy="24" r="21" stroke="url(#orbitx-gold)" strokeWidth="1.1" opacity="0.9" />
      <path d="M24 0.5v5M24 42.5v5M0.5 24h5M42.5 24h5" stroke="url(#orbitx-gold)" strokeWidth="1.4" />
      {/* orbit */}
      <ellipse cx="24" cy="24" rx="18" ry="7" transform="rotate(-30 24 24)" stroke="#E9A23B" strokeWidth="1.3" />
      {/* core */}
      <circle cx="24" cy="24" r="6.5" fill="#050505" stroke="url(#orbitx-gold)" strokeWidth="1.3" />
      <circle cx="24" cy="24" r="2" fill="url(#orbitx-gold)" />
      {/* satellite */}
      <circle cx="37.6" cy="16.2" r="2.6" fill="#FFC266" />
      <circle cx="37.6" cy="16.2" r="5" stroke="#E9A23B" strokeWidth="0.7" opacity="0.5" />
    </svg>
  );
}
