import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Globe from "../components/Globe.jsx";
import Chart from "../components/PlotlyChart.jsx";
import InfoPanel from "../components/InfoPanel.jsx";
import { api } from "../lib/api";
import { useWatchlist } from "../lib/useLive";

export default function SatelliteDetails() {
  const { id } = useParams();
  const sid = Number(id);
  const [sat, setSat] = useState(null);
  const [path, setPath] = useState([]);
  const [now, setNow] = useState(null);
  const [error, setError] = useState(null);
  const wl = useWatchlist();

  useEffect(() => {
    api.satellite(sid).then(setSat).catch((e) => setError(e.message));
    api.track(sid, { minutes: 180, step_seconds: 60 }).then((p) => { setPath(p); setNow(p[0]); }).catch((e) => setError(e.message));
  }, [sid]);

  if (error) return <div className="page"><div className="callout-warn">{error} <Link className="underline" to="/app/explorer">Back</Link></div></div>;

  const marker = now && sat ? [{ satellite_id: sid, ...now }] : [];
  return (
    <div className="page">
      <Link to="/app/explorer" className="mb-6 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-gold transition-colors hover:text-amberhi">← Explorer</Link>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="card globe-stage h-[360px] sm:h-[460px] lg:col-span-7 lg:h-[540px]">
          <Globe satellites={marker} selectedId={sid} path={path} markerSize={0.03} cameraZ={3.4} />
        </div>
        <div className="card card-pad lg:col-span-5">
          <InfoPanel sat={sat} pos={now} watched={!!wl.find(sid)} onWatch={() => wl.toggle(sid)} />
        </div>
      </div>
      {path.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="card card-pad">
            <div className="card-title">Altitude over next 3 h (calculated)</div>
            <Chart data={[{ type: "scatter", mode: "lines", x: path.map((p) => p.time), y: path.map((p) => p.altitude_km), line: { color: "#E9A23B", width: 1.8 } }]}
              layout={{ yaxis: { title: "km" } }} />
          </div>
          <div className="card card-pad">
            <div className="card-title">Ground track</div>
            <Chart data={[{ type: "scattergeo", mode: "lines", lat: path.map((p) => p.latitude_deg), lon: path.map((p) => p.longitude_deg), line: { color: "#E9A23B", width: 1.5 } }]}
              layout={{ margin: { l: 0, r: 0, t: 0, b: 0 }, geo: { bgcolor: "rgba(0,0,0,0)", showland: true, landcolor: "#16130C", showocean: true, oceancolor: "#060605", coastlinecolor: "#7A5F26", countrycolor: "#3A2F17", showframe: false, lonaxis: { showgrid: true, gridcolor: "rgba(201,162,75,0.09)" }, lataxis: { showgrid: true, gridcolor: "rgba(201,162,75,0.09)" }, projection: { type: "natural earth" } } }} />
          </div>
        </div>
      )}
    </div>
  );
}
