import { useEffect, useState } from "react";
import Chart from "../components/PlotlyChart.jsx";
import SatelliteSearch from "../components/SatelliteSearch.jsx";
import { api } from "../lib/api";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState([]);
  const [cmp, setCmp] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => { api.analytics().then(setData).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (picked.length >= 2) api.compare(picked.map((s) => s.satellite_id)).then(setCmp).catch((e) => setError(e.message));
    else setCmp([]);
  }, [picked]);

  if (error) return <div className="page"><div className="callout-warn">{error}</div></div>;
  if (!data) return (
    <div className="page" aria-busy="true">
      <div className="skeleton mb-8 h-12 w-96 max-w-full" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card h-[340px]"><div className="skeleton m-5 h-[calc(100%-2.5rem)]" /></div>
        <div className="card h-[340px]"><div className="skeleton m-5 h-[calc(100%-2.5rem)]" /></div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Space analytics</div>
          <h1 className="page-title mt-3">What the catalogue looks like</h1>
        </div>
      </header>
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card card-pad">
          <div className="card-title">Altitude distribution (LEO, 200 km buckets)</div>
          <Chart data={[{ type: "bar", x: data.altitude_buckets.map((b) => `${b.bucket_km}`), y: data.altitude_buckets.map((b) => b.count), marker: { color: "#E9A23B" } }]}
            layout={{ xaxis: { title: "mean altitude, km" }, yaxis: { title: "satellites" } }} />
        </div>
        <div className="card card-pad">
          <div className="card-title">Category distribution</div>
          <Chart data={[{ type: "pie", hole: 0.66, labels: data.categories.map((c) => c.category), values: data.categories.map((c) => c.count),
            marker: { colors: ["#E9A23B", "#F1D88F", "#B8892F", "#8A6420", "#8C846F", "#4A4130"], line: { color: "#050505", width: 3 } } }]}
            layout={{ margin: { l: 10, r: 10, t: 10, b: 10 } }} />
        </div>
        <div className="card card-pad lg:col-span-2">
          <div className="card-title">Orbital period by category (min, range and average)</div>
          <Chart data={[
            { type: "bar", name: "Average", x: data.period_by_category.map((p) => p.category), y: data.period_by_category.map((p) => p.avg_period_min), marker: { color: "#E9A23B" } },
            { type: "scatter", mode: "markers", name: "Max", x: data.period_by_category.map((p) => p.category), y: data.period_by_category.map((p) => p.max_period_min), marker: { color: "#F1D88F", size: 9, symbol: "diamond" } },
            { type: "scatter", mode: "markers", name: "Min", x: data.period_by_category.map((p) => p.category), y: data.period_by_category.map((p) => p.min_period_min), marker: { color: "#EF5B3F", size: 9, symbol: "diamond" } },
          ]} layout={{ yaxis: { title: "minutes", type: "log" }, legend: { orientation: "h", y: 1.12 } }} />
        </div>
      </div>

      <div className="card card-pad">
        <div className="card-title">Satellite comparison</div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-72"><SatelliteSearch placeholder="Add satellite (2–6)" onPick={(s) => picked.length < 6 && !picked.find((p) => p.satellite_id === s.satellite_id) && setPicked([...picked, s])} /></div>
          {picked.map((s) => (
            <button key={s.satellite_id} className="btn-quiet btn-amber" onClick={() => setPicked(picked.filter((p) => p !== s))}>{s.name} ×</button>
          ))}
        </div>
        {picked.length < 2 && <div className="empty">Pick at least two satellites.</div>}
        {cmp.length > 0 && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Chart data={[{ type: "bar", x: cmp.map((c) => c.name), y: cmp.map((c) => c.period_min), marker: { color: "#E9A23B" } }]} layout={{ yaxis: { title: "period, min" } }} />
            <Chart data={[
              { type: "bar", name: "Perigee", x: cmp.map((c) => c.name), y: cmp.map((c) => c.perigee_km), marker: { color: "#8A6420" } },
              { type: "bar", name: "Apogee", x: cmp.map((c) => c.name), y: cmp.map((c) => c.apogee_km), marker: { color: "#E9A23B" } },
            ]} layout={{ barmode: "group", yaxis: { title: "altitude, km" }, legend: { orientation: "h", y: 1.12 } }} />
          </div>
        )}
      </div>
    </div>
  );
}
