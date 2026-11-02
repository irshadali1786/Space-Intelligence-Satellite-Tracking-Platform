import { Link } from "react-router-dom";
import SatelliteSearch from "../components/SatelliteSearch.jsx";
import { api, fmt } from "../lib/api";
import { useWatchlist } from "../lib/useLive";

export default function Watchlist() {
  const wl = useWatchlist();
  const add = async (s) => { try { await api.addWatch(s.satellite_id); await wl.refresh(); } catch (e) { alert(e.message); } };
  const remove = async (id) => { await api.removeWatch(id); await wl.refresh(); };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Watchlist</div>
          <h1 className="page-title mt-3">Saved satellites</h1>
        </div>
      </header>
      <div className="mb-6 w-full sm:w-96"><SatelliteSearch placeholder="Add satellite to watchlist" onPick={add} /></div>
      {wl.items.length === 0 && <div className="empty">Nothing saved yet.</div>}
      {wl.items.length > 0 && (
        <ul className="card indexed divide-y divide-gold/10">
          {wl.items.map((w) => (
            <li key={w.watchlist_id} className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-amber/[0.05] sm:flex-row sm:items-center sm:px-6">
              <div className="min-w-0 flex-1">
                <Link to={`/app/satellite/${w.satellite.satellite_id}`} className="font-display text-[24px] font-medium uppercase tracking-[0.05em] text-ink transition-colors hover:text-amberhi">{w.satellite.name}</Link>
                <div className="num mt-1 text-[11px] uppercase tracking-[0.08em] text-muted">NORAD {w.satellite.norad_id} · {w.satellite.category} · period {fmt.num(w.satellite.element?.period_min, 1)} min · added {fmt.time(w.added_at)}</div>
              </div>
              <button className="btn-quiet shrink-0 self-start sm:self-auto" onClick={() => remove(w.watchlist_id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
