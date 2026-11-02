import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmt } from "../lib/api";

const PAGE = 25;

export default function Explorer() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [cats, setCats] = useState([]);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => { api.categories().then(setCats).catch((e) => setError(e.message)); }, []);
  useEffect(() => { setPage(0); }, [q, category]);
  useEffect(() => {
    const t = setTimeout(() => {
      const p = q.trim()
        ? api.search(q.trim(), category || undefined).then((r) => { setRows(r); setTotal(r.length); })
        : api.satellites({ category: category || undefined, limit: PAGE, offset: page * PAGE }).then((r) => { setRows(r.items); setTotal(r.total); });
      p.then(() => setError(null)).catch((e) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [q, category, page]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Explorer</div>
          <h1 className="page-title mt-3">Satellite catalogue</h1>
        </div>
      </header>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gold" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-5-5" /></svg>
          <input className="input w-full pl-9" placeholder="Name or NORAD ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-full sm:w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.category} value={c.category}>{c.category} ({c.count})</option>)}
        </select>
      </div>
      {error && <div className="callout-warn mb-4">{error}</div>}
      <div className="card overflow-hidden">
        <div className="tbl-scroll">
          <table className="tbl min-w-[760px]">
            <thead><tr>
              <th>Name</th><th>NORAD</th><th>Category</th>
              <th className="text-right">Inclination</th><th className="text-right">Period</th>
              <th className="text-right">Perigee</th><th className="text-right">Apogee</th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.satellite_id}>
                  <td><Link className="font-display text-[17px] font-medium uppercase tracking-[0.05em] text-ink transition-colors hover:text-amberhi" to={`/app/satellite/${s.satellite_id}`}>{s.name}</Link></td>
                  <td className="num text-gold/90">{s.norad_id}</td><td><span className="badge">{s.category}</span></td>
                  <td className="num text-right">{fmt.num(s.element?.inclination_deg, 2)}°</td>
                  <td className="num text-right">{fmt.num(s.element?.period_min, 1)} min</td>
                  <td className="num text-right">{fmt.km(s.element?.perigee_km)}</td>
                  <td className="num text-right">{fmt.km(s.element?.apogee_km)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && !error && <div className="empty m-4">No satellites found. Run the CelesTrak ingest script first.</div>}
        {!q.trim() && total > PAGE && (
          <div className="flex items-center justify-between gap-4 border-t border-gold/20 bg-black/40 px-4 py-3 text-[13px] text-muted">
            <button className="btn-quiet" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="num text-[11px] tracking-[0.14em] text-goldhi">{page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}</span>
            <button className="btn-quiet" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
