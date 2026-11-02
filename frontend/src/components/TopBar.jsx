import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

// Presentation-only: maps the current route to a human title.
const TITLES = [
  [/^\/app\/?$/, "Overview"],
  [/^\/app\/tracking/, "Live Tracking"],
  [/^\/app\/explorer/, "Explorer"],
  [/^\/app\/satellite\//, "Satellite profile"],
  [/^\/app\/history/, "Orbit History"],
  [/^\/app\/analytics/, "Analytics"],
  [/^\/app\/proximity/, "Proximity"],
  [/^\/app\/watchlist/, "Watchlist"],
  [/^\/app\/settings/, "Settings"],
];

function UtcClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="num flex items-baseline gap-2 text-[17px] font-medium leading-none tracking-[0.08em] text-goldhi" style={{ textShadow: "0 0 14px rgba(233,162,59,0.45)" }}>
      {now.toISOString().slice(11, 19)}
      <span className="text-[9.5px] font-normal tracking-[0.24em] text-muted">UTC</span>
    </span>
  );
}

export default function TopBar({ onMenu }) {
  const { pathname } = useLocation();
  const title = (TITLES.find(([re]) => re.test(pathname)) || [])[1] || "ORBITX";
  return (
    <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-4 border-b border-gold/15 px-4 sm:px-6 lg:px-9"
      style={{ background: "linear-gradient(180deg, rgba(14,12,8,0.92), rgba(5,5,5,0.88))", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
      {/* bright gold index mark on the bottom rule */}
      <span aria-hidden="true" className="pointer-events-none absolute bottom-[-1px] left-0 h-px w-24 bg-gradient-to-r from-goldhi to-transparent" />
      <button type="button" onClick={onMenu} aria-label="Open navigation" className="btn-quiet !p-2 lg:hidden">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
      </button>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-3">
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.28em] text-muted sm:inline">Mission control</span>
        <svg className="hidden text-gold/60 sm:block" width="8" height="10" viewBox="0 0 8 10" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M1 1l5 4-5 4" /></svg>
        <span className="truncate font-display text-[19px] font-semibold uppercase leading-none tracking-[0.18em] text-ink">{title}</span>
      </nav>
      <div className="ml-auto flex items-center gap-4 sm:gap-5">
        <span className="hud-chip !border-amber/35 !text-amberhi">
          <span className="dot dot-live" /> <span className="hidden sm:inline">SGP4 · calculated positions</span><span className="sm:hidden">SGP4</span>
        </span>
        <span className="hidden h-6 w-px bg-gold/20 md:block" />
        <span className="hidden md:block"><UtcClock /></span>
      </div>
    </header>
  );
}
