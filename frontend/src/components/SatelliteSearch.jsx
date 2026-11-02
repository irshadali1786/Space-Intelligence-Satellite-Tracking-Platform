import { useEffect, useState } from "react";
import { api } from "../lib/api";

/** Search by name or NORAD ID. Calls onPick(satellite). */
export default function SatelliteSearch({ onPick, placeholder = "Search name or NORAD ID" }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      api.search(q.trim()).then((r) => { setResults(r); setError(null); }).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gold" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></svg>
      <input className="input w-full pl-9" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <div className="text-warn text-xs mt-1">{error}</div>}
      {results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1.5 max-h-64 overflow-auto border border-gold/40 bg-[#0B0A08] py-1 shadow-pop" style={{ borderRadius: 1 }}>
          {results.map((s) => (
            <li key={s.satellite_id}>
              <button className="flex w-full items-center justify-between gap-3 border-l-2 border-transparent px-3 py-2 text-left text-[13px] text-ivory transition-colors hover:border-amber hover:bg-amber/10 hover:text-ink"
                onClick={() => { onPick(s); setQ(""); setResults([]); }}>
                <span className="truncate">{s.name}</span><span className="num shrink-0 text-[11px] tracking-[0.1em] text-gold">{s.norad_id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
