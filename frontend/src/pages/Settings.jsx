import { useEffect, useState } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Settings() {
  const [health, setHealth] = useState("checking…");
  useEffect(() => {
    fetch(BASE + "/health").then((r) => r.json()).then((j) => setHealth(j.status)).catch(() => setHealth("unreachable"));
  }, []);
  return (
    <div className="page mx-0 max-w-3xl">
      <header className="page-head">
        <div>
          <div className="eyebrow">Settings</div>
          <h1 className="page-title mt-3">About this installation</h1>
        </div>
      </header>
      <dl className="card divide-y divide-gold/10 px-5 text-[13px] sm:px-7">
        {[["API base URL", BASE], ["API status", health], ["Data source", "CelesTrak public TLE (GP) data"],
          ["Position method", "SGP4 propagation (calculated, not live radar)"], ["Database", "MySQL 8 (SQLAlchemy ORM)"]].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"><dt className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-gold">{k}</dt><dd className="num break-all text-ink sm:text-right">{v}</dd></div>
        ))}
      </dl>
      <p className="mt-7 border-l border-amber/50 pl-4 text-[13px] leading-relaxed text-muted">
        Change the API URL by setting <span className="num text-goldhi">VITE_API_URL</span> in <span className="num text-goldhi">frontend/.env</span> and restarting Vite.
        API documentation is served by the backend at <a className="text-amberhi underline decoration-amber/40 underline-offset-2 hover:decoration-amberhi" href={BASE + "/docs"} target="_blank" rel="noreferrer">/docs</a>.
      </p>
    </div>
  );
}
