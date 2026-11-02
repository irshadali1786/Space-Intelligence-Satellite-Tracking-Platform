const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options) {
  const res = await fetch(BASE + path, options);
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.status === 204 ? null : res.json();
}

const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o || {}).forEach(([k, v]) => v !== undefined && v !== null && v !== "" && p.set(k, v));
  const s = p.toString();
  return s ? "?" + s : "";
};

export const api = {
  satellites: (params) => request("/satellites" + qs(params)),
  search: (q, category) => request("/satellites/search" + qs({ q, category })),
  categories: () => request("/satellites/categories"),
  positionsNow: (params, signal) => request("/satellites/positions/now" + qs(params), { signal }),
  satellite: (id, signal) => request(`/satellites/${id}`, { signal }),
  track: (id, params, signal) => request(`/satellites/${id}/positions` + qs(params), { signal }),
  limits: () => request("/meta/limits"),
  history: (id, params) => request(`/satellites/${id}/history` + qs(params)),
  recordHistory: (id, params) => request(`/satellites/${id}/history/record` + qs(params), { method: "POST" }),
  analytics: () => request("/analytics"),
  compare: (ids) => request("/analytics/compare" + qs({ ids: ids.join(",") })),
  proximity: (params) => request("/proximity" + qs(params)),
  watchlist: () => request("/watchlist"),
  addWatch: (satellite_id, note) =>
    request("/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ satellite_id, note }) }),
  removeWatch: (id) => request(`/watchlist/${id}`, { method: "DELETE" }),
};

export const fmt = {
  km: (v) => (v == null ? "—" : Math.round(v).toLocaleString() + " km"),
  num: (v, d = 2) => (v == null ? "—" : Number(v).toFixed(d)),
  time: (t) => (t ? new Date(t.endsWith("Z") ? t : t + "Z").toUTCString().slice(5, 25) + " UTC" : "—"),
};
