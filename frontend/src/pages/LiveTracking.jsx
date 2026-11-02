import { useEffect, useState } from "react";
import Globe from "../components/Globe.jsx";
import SatelliteSearch from "../components/SatelliteSearch.jsx";
import InfoPanel from "../components/InfoPanel.jsx";
import { api } from "../lib/api";
import { useLive, useWatchlist } from "../lib/useLive";

export default function LiveTracking() {
  const [category, setCategory] = useState("");
  const [cats, setCats] = useState([]);
  const [rotate, setRotate] = useState(true);
  const live = useLive({ category: category || undefined, limit: 400, intervalMs: 3000 });
  const wl = useWatchlist();
  useEffect(() => { api.categories().then(setCats).catch(() => {}); }, []);

  return (
    <div className="app-bg flex min-h-full flex-col lg:h-full lg:flex-row">
      <div className="globe-stage h-[62vh] min-h-[420px] lg:h-auto lg:min-h-0 lg:flex-1">
        <Globe satellites={live.positions} selectedId={live.selectedId} onSelect={live.select} path={live.path} autoRotate={rotate && !live.selectedId} />
        <div className="card-glass absolute left-3 right-3 top-3 z-10 space-y-3 p-3.5 sm:left-6 sm:right-auto sm:top-6 sm:w-[340px]">
          <div className="eyebrow !text-[9.5px]">Target acquisition</div>
          <SatelliteSearch onPick={(s) => live.select(s.satellite_id)} />
          <div className="flex gap-2">
            <select className="input min-w-0 flex-1" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {cats.map((c) => <option key={c.category} value={c.category}>{c.category} ({c.count})</option>)}
            </select>
            <button className="btn-quiet shrink-0" onClick={() => setRotate((r) => !r)}>{rotate ? "Pause rotation" : "Resume rotation"}</button>
          </div>
        </div>
        <div className="hud-note pointer-events-none absolute bottom-4 left-5 right-5 z-10 flex flex-wrap items-center gap-x-2.5 sm:bottom-5 sm:left-6">
          <span className="dot dot-live" />
          <span><span className="num text-goldhi">{live.positions.length}</span> objects · calculated (SGP4) · refreshed every 3 s</span>
          {live.error && <span className="text-warn">· {live.error}</span>}
        </div>
      </div>
      <aside className="w-full flex-1 overflow-auto border-t border-gold/20 bg-[#070706] p-6 lg:w-[360px] lg:flex-none lg:border-l lg:border-t-0">
        <div className="card-title">Selected satellite</div>
        <InfoPanel sat={live.selected} pos={live.selectedPos}
          watched={!!wl.find(live.selectedId)} onWatch={live.selected && (() => wl.toggle(live.selectedId))} />
      </aside>
    </div>
  );
}
