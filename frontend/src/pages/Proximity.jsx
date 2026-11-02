import { useEffect, useState } from "react";
import SatelliteSearch from "../components/SatelliteSearch.jsx";
import { api, fmt } from "../lib/api";

export default function Proximity() {
  const [picked, setPicked] = useState([]);
  const [threshold, setThreshold] = useState(50);
  const [window_, setWindow] = useState(0);
  const [res, setRes] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [limits, setLimits] = useState({ proximity_max_objects: 40, proximity_default_objects: 30 });
  useEffect(() => { api.limits().then(setLimits).catch(() => {}); }, []);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      setRes(await api.proximity({ ids: picked.map((s) => s.satellite_id).join(",") || undefined, threshold_km: threshold, window_minutes: window_ }));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Proximity analysis</div>
          <h1 className="page-title mt-3">Estimated close approaches</h1>
        </div>
      </header>
      <p className="callout-warn mb-6 max-w-2xl">Experimental estimate from SGP4 and public TLEs (error is typically kilometres). Not a certified collision prediction.</p>
      <div className="card card-pad mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-[26rem]"><SatelliteSearch placeholder={`Add satellite (empty = first ${limits.proximity_default_objects})`} onPick={(s) => !picked.find((p) => p.satellite_id === s.satellite_id) && picked.length < limits.proximity_max_objects && setPicked([...picked, s])} /></div>
          <label className="field-label">Threshold (km)<input type="number" min="1" max="5000" className="input w-28" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} /></label>
          <label className="field-label">Scan window (min, 0 = now)<input type="number" min="0" max="180" className="input w-28" value={window_} onChange={(e) => setWindow(Number(e.target.value))} /></label>
          <button className="btn" disabled={busy} onClick={run}>{busy ? "Calculating…" : "Run analysis"}</button>
        </div>
        <div className="mb-3 mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted"><span className="num text-goldhi">{picked.length}</span> / {limits.proximity_max_objects} selected</div>
        <div className="flex flex-wrap gap-2">{picked.map((s) => <button key={s.satellite_id} className="btn-quiet btn-amber" onClick={() => setPicked(picked.filter((p) => p !== s))}>{s.name} ×</button>)}</div>
      </div>
      {error && <div className="callout-warn mb-4">{error}</div>}
      {res && (
        <>
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted"><span className="num text-goldhi">{res.objects_compared}</span> objects compared · <span className="num text-goldhi">{res.pairs.filter((p) => p.below_threshold).length}</span> pairs within {res.threshold_km} km</div>
          <div className="card overflow-hidden">
            <div className="tbl-scroll">
              <table className="tbl min-w-[560px]">
                <thead><tr><th>Object A</th><th>Object B</th><th className="text-right">Min distance</th><th className="text-right">At (UTC)</th></tr></thead>
                <tbody>{res.pairs.slice(0, 30).map((p, i) => (
                  <tr key={i}>
                    <td>{p.satellite_a}</td><td>{p.satellite_b}</td>
                    <td className={`num text-right ${p.below_threshold ? "font-semibold text-warn" : ""}`}>{fmt.num(p.min_distance_km, 1)} km</td>
                    <td className="num text-right text-muted">{fmt.time(p.at)}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
