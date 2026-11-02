import { NavLink } from "react-router-dom";
import Mark from "./Mark.jsx";

const Icon = ({ d }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
    <path d={d} />
  </svg>
);

// Same routes as before, grouped for scanning.
const sections = [
  ["Monitor", [
    ["/app", "Overview", "M3 3h8v8H3zM13 3h8v5h-8zM13 11h8v10h-8zM3 14h8v7H3z"],
    ["/app/tracking", "Live Tracking", "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 1v4M12 19v4M1 12h4M19 12h4M12 12h.01"],
    ["/app/explorer", "Explorer", "M10.5 10.5m-6.5 0a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"],
  ]],
  ["Analyse", [
    ["/app/history", "Orbit History", "M21 12a9 9 0 1 1-3-6.7M21 3v5h-5M12 7v5l3 2"],
    ["/app/analytics", "Analytics", "M3 21h18M6 18v-6M11 18V5M16 18V9M21 18v-3"],
    ["/app/proximity", "Proximity", "M5 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M19 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M8 12h8M12 9v6"],
  ]],
  ["Workspace", [
    ["/app/watchlist", "Watchlist", "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0"],
    ["/app/settings", "Settings", "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 3v6M9 9v6M17 15v6"],
  ]],
];

const NOTE = "Positions are calculated with SGP4 from CelesTrak TLEs. Not live radar.";

/**
 * `open` / `onClose` only drive the mobile drawer (below the lg breakpoint).
 * On large screens the sidebar is a slim, always-visible command rail.
 */
export default function Sidebar({ open = false, onClose = () => {} }) {
  return (
    <>
      {/* backdrop for the mobile drawer */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/75 backdrop-blur-[3px] transition-opacity duration-200 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-gold/20 bg-[#070706] py-5 transition-transform duration-200 ease-out
          lg:static lg:z-auto lg:w-[104px] lg:translate-x-0 ${open ? "translate-x-0 shadow-pop" : "-translate-x-full"}`}
        style={{ backgroundImage: "linear-gradient(180deg, rgba(233,162,59,0.07), transparent 28%)" }}
      >
        <NavLink to="/" onClick={onClose} aria-label="ORBITX home" className="mb-6 flex items-center gap-3.5 px-6 lg:mb-5 lg:flex-col lg:gap-2.5 lg:px-0">
          <Mark size={42} />
          <div className="lg:text-center">
            <div className="font-brand text-[13px] leading-none tracking-[0.28em] text-ink lg:text-[10px] lg:tracking-[0.22em]">ORBIT<span className="metal">X</span></div>
            <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-muted lg:hidden">Space Intelligence</div>
          </div>
        </NavLink>
        <div className="mx-5 mb-3 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        <nav className="flex-1 overflow-y-auto overflow-x-hidden" aria-label="Primary">
          {sections.map(([title, items], i) => (
            <div key={title} className="mb-1">
              {i > 0 && <div className="mx-6 my-2.5 hidden h-px bg-gold/15 lg:block" />}
              <div className="mb-1.5 mt-3 px-6 font-mono text-[9.5px] font-medium uppercase tracking-[0.28em] text-gold/70 lg:hidden">{title}</div>
              <div className="flex flex-col">
                {items.map(([to, label, d]) => (
                  <NavLink key={to} to={to} end={to === "/app"} onClick={onClose}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-4 px-6 py-3 transition-[background-color] duration-150
                       lg:flex-col lg:justify-center lg:gap-1.5 lg:px-1 lg:py-3.5 ${
                        isActive ? "bg-gradient-to-r from-amber/[0.16] to-transparent" : "hover:bg-gold/[0.05]"}`}>
                    {({ isActive }) => (
                      <>
                        <span className={`absolute inset-y-1.5 left-0 w-[2px] bg-amber transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}
                          style={{ boxShadow: "0 0 12px 1px rgba(233,162,59,0.75)" }} />
                        <span className={`transition-colors duration-150 ${isActive ? "text-amberhi" : "text-muted group-hover:text-goldhi"}`}
                          style={isActive ? { filter: "drop-shadow(0 0 6px rgba(233,162,59,0.7))" } : undefined}><Icon d={d} /></span>
                        <span className={`font-display text-[15px] font-medium uppercase leading-[1.05] tracking-[0.14em] transition-colors duration-150 lg:text-center lg:text-[12.5px] lg:tracking-[0.12em] ${
                          isActive ? "text-ink" : "text-ivory/70 group-hover:text-ink"}`}>{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* data-provenance note: full text in the drawer, compact chip on the rail */}
        <div className="mx-5 mt-3 border border-gold/20 bg-black/40 p-3 font-mono text-[10.5px] leading-relaxed text-muted lg:hidden">
          Positions are <span className="text-goldhi">calculated</span> with SGP4 from CelesTrak TLEs. Not live radar.
        </div>
        <div className="mx-auto mt-3 hidden flex-col items-center gap-1.5 lg:flex" title={NOTE}>
          <span className="h-px w-8 bg-gold/30" />
          <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.24em] text-gold/80">SGP4</span>
        </div>
      </aside>
    </>
  );
}
