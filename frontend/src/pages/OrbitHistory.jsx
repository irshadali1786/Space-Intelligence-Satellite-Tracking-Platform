import { useState } from "react";
import Chart from "../components/PlotlyChart.jsx";
import SatelliteSearch from "../components/SatelliteSearch.jsx";
import { api, fmt } from "../lib/api";

const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function OrbitHistory() {
  const [sat, setSat] = useState(null);
  const [rows, setRows] = useState([]);
  const [start, setStart] = useState(toLocalInput(new Date(Date.now() - 6 * 3600e3)));
  const [end, setEnd] = useState(toLocalInput(new Date()));
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // datetime-local is local time; the API stores UTC
  const iso = (v) => new Date(v).toISOString().slice(0, 19);

  const load = async (s = sat) => {
    if (!s) return;
    try { setRows(await api.history(s.satellite_id, { start: iso(start), end: iso(end), limit: 5000 })); setMsg(null); }
    catch (e) { setMsg(e.message); }
  };
  const record = async () => {
    setBusy(true);
    try { const r = await api.recordHistory(sat.satellite_id, { hours_back: 6, step_minutes: 5 }); setMsg(`Stored ${r.inserted} new calculated positions.`); await load(); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Orbit history</div>
          <h1 className="page-title mt-3">Stored movement timeline</h1>
        </div>
      </header>
      <div className="card card-pad mb-6 flex flex-wrap items-end gap-4">
        <div className="w-full sm:w-72"><SatelliteSearch onPick={(s) => { setSat(s); setRows([]); load(s); }} /></div>
        <label className="field-label">From<input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="field-label">To<input type="datetime-local" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <button className="btn" disabled={!sat} onClick={() => load()}>Apply filter</button>
        <button className="btn-quiet !py-2" disabled={!sat || busy} onClick={record}>{busy ? "Calculating…" : "Calculate & store last 6 h"}</button>
      </div>
      {sat && <div className="mb-5 flex items-baseline gap-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted">Selected <span className="font-display text-[22px] font-semibold tracking-[0.05em] text-amberhi">{sat.name}</span> <span className="num text-gold">{sat.norad_id}</span></div>}
      {msg && <div className="mb-5 border border-gold/30 border-l-2 border-l-amber bg-gold/[0.05] px-4 py-2.5 font-mono text-[12px] text-ivory" style={{ borderRadius: 1 }}>{msg}</div>}
      {!sat && <div className="empty">Search for a satellite to view its stored history.</div>}
      {sat && rows.length === 0 && <div className="empty">No stored positions in this range. Use “Calculate &amp; store last 6 h” to generate them from the latest TLE.</div>}
      {rows.length > 0 && (
        <>
          <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="card card-pad">
              <div className="card-title">Altitude (km)</div>
              <Chart data={[{ type: "scatter", mode: "lines", x: rows.map((r) => r.recorded_at), y: rows.map((r) => r.altitude_km), line: { color: "#E9A23B", width: 1.8 } }]} />
            </div>
            <div className="card card-pad">
              <div className="card-title">Velocity (km/s)</div>
              <Chart data={[{ type: "scatter", mode: "lines", x: rows.map((r) => r.recorded_at), y: rows.map((r) => r.velocity_kms), line: { color: "#F1D88F", width: 1.8 } }]} />
            </div>
          </div>
          <div className="card card-pad mb-5">
            <div className="card-title">Ground track of stored positions</div>
            <Chart height={340} data={[{ type: "scattergeo", mode: "lines+markers", lat: rows.map((r) => r.latitude_deg), lon: rows.map((r) => r.longitude_deg), marker: { size: 3, color: "#E9A23B" }, line: { color: "#E9A23B", width: 0.8 } }]}
              layout={{ margin: { l: 0, r: 0, t: 0, b: 0 }, geo: { bgcolor: "rgba(0,0,0,0)", showland: true, landcolor: "#16130C", showocean: true, oceancolor: "#060605", coastlinecolor: "#7A5F26", showframe: false, lonaxis: { showgrid: true, gridcolor: "rgba(201,162,75,0.09)" }, lataxis: { showgrid: true, gridcolor: "rgba(201,162,75,0.09)" }, projection: { type: "natural earth" } } }} />
          </div>
          <div className="card overflow-hidden">
            <div className="max-h-72 overflow-auto">
              <table className="tbl num min-w-[520px] text-[12px]"><thead className="sticky top-0"><tr><th>Time (UTC)</th><th>Lat</th><th>Lon</th><th>Alt km</th><th>km/s</th></tr></thead>
                <tbody>{rows.slice().reverse().map((r, i) => (<tr key={i}><td>{fmt.time(r.recorded_at)}</td><td>{fmt.num(r.latitude_deg, 3)}</td><td>{fmt.num(r.longitude_deg, 3)}</td><td>{fmt.num(r.altitude_km, 1)}</td><td>{fmt.num(r.velocity_kms, 2)}</td></tr>))}</tbody></table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
