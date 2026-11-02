import { useEffect, useState } from "react";
import Globe from "../components/Globe.jsx";
import Chart from "../components/PlotlyChart.jsx";
import SatelliteSearch from "../components/SatelliteSearch.jsx";
import InfoPanel from "../components/InfoPanel.jsx";
import { api, fmt } from "../lib/api";
import { useLive, useWatchlist } from "../lib/useLive";

// Telemetry tile: value is real data; a skeleton is shown until the analytics call returns.
const Kpi = ({ label, value, sub, className = "" }) => (
  <div className={`card card-hover kpi ${className}`}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value metal mt-3">
      {value ?? <span className="skeleton inline-block h-9 w-28 align-middle" />}
    </div>
    {sub && <div className="kpi-sub mt-2.5">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const live = useLive({ limit: 250 });
  const wl = useWatchlist();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { api.analytics().then(setData).catch((e) => setError(e.message)); }, []);
  const t = data?.totals;

  const ORBIT_COLORS = ["#E9A23B", "#F1D88F", "#B8892F", "#6E5A3A"];
  const orbitTotal = data ? data.orbit_classes.reduce((a, o) => a + o.count, 0) : 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Overview</div>
          <h1 className="page-title mt-3">
            {t ? <><span className="metal">{t.satellites}</span> objects under observation</> : "Loading catalogue…"}
          </h1>
        </div>
        <div className="w-full sm:w-80"><SatelliteSearch onPick={(s) => live.select(s.satellite_id)} /></div>
      </header>
      {(error || live.error) && <div className="callout-warn mb-5">API error: {error || live.error}. Is the backend running and the database ingested?</div>}

      <section className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* telemetry column */}
        <div className="grid grid-cols-2 gap-3 xl:order-1 xl:col-span-3 xl:flex xl:h-[600px] xl:flex-col xl:gap-4 xl:[&>*]:flex-1">
          <Kpi className="col-span-2" label="Catalogued objects" value={t ? Number(t.satellites).toLocaleString() : null}
            sub={t ? `${Number(t.tle_records).toLocaleString()} TLE records` : null} />
          <Kpi label="Shown on globe" value={live.positions.length || data || live.error ? live.positions.length.toLocaleString() : null} sub="calculated positions" />
          <Kpi label="Mean altitude" value={t ? fmt.km(t.avg_altitude_km) : null} />
          <Kpi label="Lowest perigee" value={t ? fmt.km(t.min_perigee_km) : null} />
          <Kpi label="Highest apogee" value={t ? fmt.km(t.max_apogee_km) : null} />
        </div>

        {/* orbital viewport */}
        <div className="card globe-stage h-[420px] sm:h-[540px] xl:order-2 xl:col-span-6 xl:h-[600px]">
          <Globe satellites={live.positions} selectedId={live.selectedId} onSelect={live.select} path={live.path} />
          <div className="pointer-events-none absolute left-4 top-4 z-[4]"><span className="hud-chip"><span className="dot dot-live" /> Orbital view</span></div>
          <div className="hud-note pointer-events-none absolute bottom-4 left-5 right-5 z-[4]">Calculated positions · refreshed every 5 s</div>
        </div>

        {/* selected-satellite readout */}
        <div className="card card-pad xl:order-3 xl:col-span-3 xl:h-[600px] xl:overflow-auto">
          <div className="card-title">Selected satellite</div>
          <InfoPanel sat={live.selected} pos={live.selectedPos}
            watched={!!wl.find(live.selectedId)} onWatch={live.selected && (() => wl.toggle(live.selectedId))} />
        </div>
      </section>

      {data ? (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
          <div className="card card-pad xl:col-span-5">
            <div className="card-title">Orbit distribution</div>
            <Chart height={240} data={[{ type: "pie", hole: 0.7, labels: data.orbit_classes.map((o) => o.orbit_class), values: data.orbit_classes.map((o) => o.count),
              marker: { colors: ORBIT_COLORS, line: { color: "#050505", width: 3 } }, textinfo: "label+percent", insidetextfont: { family: "JetBrains Mono, monospace", size: 10, color: "#050505" }, outsidetextfont: { family: "JetBrains Mono, monospace", size: 10, color: "#D9CFB8" } }]}
              layout={{ showlegend: false, margin: { l: 10, r: 10, t: 10, b: 10 } }} />
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {data.orbit_classes.map((o, i) => (
                <li key={o.orbit_class} className="flex items-center justify-between border border-gold/15 bg-black/40 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em]">
                  <span className="flex items-center gap-2 text-ivory"><span className="h-2 w-2 rotate-45" style={{ background: ORBIT_COLORS[i % ORBIT_COLORS.length] }} />{o.orbit_class}</span>
                  <span className="num text-muted">{Number(o.count).toLocaleString()}{orbitTotal ? ` · ${((o.count / orbitTotal) * 100).toFixed(1)}%` : ""}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card card-pad xl:col-span-4">
            <div className="card-title">Categories</div>
            <Chart height={300} data={[{ type: "bar", orientation: "h", y: data.categories.map((c) => c.category), x: data.categories.map((c) => c.count), marker: { color: "#E9A23B" } }]}
              layout={{ margin: { l: 110, r: 10, t: 10, b: 30 }, yaxis: { autorange: "reversed" } }} />
          </div>
          <div className="card card-pad md:col-span-2 xl:col-span-3">
            <div className="card-title">Recent activity</div>
            {data.recent_activity.length === 0 && <div className="empty">No stored positions or alerts yet. Run record_positions.py.</div>}
            <ol className="ml-1.5 border-l border-gold/25">
              {data.recent_activity.map((a, i) => (
                <li key={i} className="relative pb-5 pl-5 last:pb-0">
                  <span className={`absolute -left-[4.5px] top-1.5 h-[8px] w-[8px] rotate-45 ${a.kind === "alert" ? "bg-warn" : "bg-amber"}`} style={{ boxShadow: `0 0 8px ${a.kind === "alert" ? "rgba(239,91,63,0.8)" : "rgba(233,162,59,0.8)"}` }} />
                  <div className="font-display text-[16px] font-medium uppercase leading-tight tracking-[0.06em] text-ink">{a.name}</div>
                  <div className="mt-0.5 text-[12px] text-muted">{a.detail}</div>
                  <div className="num mt-0.5 text-[10.5px] tracking-[0.06em] text-gold/80">{fmt.time(a.at)}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : !error && (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12" aria-busy="true">
          <div className="card h-[380px] xl:col-span-5"><div className="skeleton m-5 h-[calc(100%-2.5rem)]" /></div>
          <div className="card h-[380px] xl:col-span-4"><div className="skeleton m-5 h-[calc(100%-2.5rem)]" /></div>
          <div className="card h-[380px] md:col-span-2 xl:col-span-3"><div className="skeleton m-5 h-[calc(100%-2.5rem)]" /></div>
        </section>
      )}
    </div>
  );
}
