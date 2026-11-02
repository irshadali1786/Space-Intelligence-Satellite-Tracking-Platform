import { Link } from "react-router-dom";
import { fmt } from "../lib/api";

// Spec-sheet row: label ····· value
const Row = ({ k, v }) => (
  <div className="spec-row">
    <span className="shrink-0 whitespace-nowrap text-muted">{k}</span>
    <span className="leader" aria-hidden="true" />
    <span className="num min-w-0 text-right text-[13px] text-ink">{v}</span>
  </div>
);

const Group = ({ title, children }) => (
  <div className="mb-5">
    <div className="spec-group-title">{title}</div>
    {children}
  </div>
);

/** Selected-satellite panel. `pos` is a calculated position, `sat` has the latest element. */
export default function InfoPanel({ sat, pos, onWatch, watched }) {
  if (!sat) return (
    <div className="empty flex flex-col items-center gap-3.5 py-10">
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" className="text-amber" aria-hidden="true">
        <circle cx="24" cy="24" r="9" /><circle cx="24" cy="24" r="1.5" fill="currentColor" />
        <path d="M24 3v10M24 35v10M3 24h10M35 24h10" /><circle cx="24" cy="24" r="19" opacity="0.35" />
      </svg>
      Click a marker on the globe or search to select a satellite.
    </div>
  );
  const el = sat.element;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="badge">{sat.category}</span>
        <span className="num text-[11px] uppercase tracking-[0.14em] text-muted">NORAD {sat.norad_id}</span>
      </div>
      <h3 className="h-edit mb-5 mt-3 text-[30px] font-semibold leading-[1.02] tracking-[0.03em]">{sat.name}</h3>
      {pos && (
        <Group title="Position">
          <Row k="Latitude" v={fmt.num(pos.latitude_deg, 3) + "°"} />
          <Row k="Longitude" v={fmt.num(pos.longitude_deg, 3) + "°"} />
          <Row k="Altitude" v={fmt.km(pos.altitude_km)} />
          <Row k="Velocity" v={fmt.num(pos.velocity_kms, 2) + " km/s"} />
        </Group>
      )}
      {el && (
        <Group title="Orbit">
          <Row k="Inclination" v={fmt.num(el.inclination_deg, 2) + "°"} />
          <Row k="Period" v={fmt.num(el.period_min, 1) + " min"} />
          <Row k="Eccentricity" v={fmt.num(el.eccentricity, 5)} />
          <Row k="TLE epoch" v={fmt.time(el.epoch)} />
        </Group>
      )}
      <div className="border-l border-amber/50 pl-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-muted">Calculated with SGP4 · not a live radar observation</div>
      <div className="mt-5 flex flex-wrap gap-2.5">
        <Link className="btn-quiet" to={`/app/satellite/${sat.satellite_id}`}>Open profile</Link>
        {onWatch && <button className={`btn-quiet ${watched ? "" : "btn-amber"}`} onClick={onWatch}>{watched ? "Remove from watchlist" : "Add to watchlist"}</button>}
      </div>
    </div>
  );
}
