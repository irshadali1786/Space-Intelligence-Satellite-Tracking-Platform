import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** Polls calculated positions for the globe and tracks the selected satellite + its orbit path. */
export function useLive({ category, limit = 300, intervalMs = 5000 } = {}) {
  const [positions, setPositions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [path, setPath] = useState([]);
  const [error, setError] = useState(null);

  // Poll without overlap: the next poll is scheduled only after the previous one finished.
  useEffect(() => {
    let alive = true, timer, ctrl;
    const load = async () => {
      ctrl = new AbortController();
      try {
        const p = await api.positionsNow({ category, limit }, ctrl.signal);
        if (alive) { setPositions(p); setError(null); }
      } catch (e) {
        if (alive && e.name !== "AbortError") setError(e.message);
      }
      if (alive) timer = setTimeout(load, intervalMs);
    };
    load();
    return () => { alive = false; clearTimeout(timer); ctrl && ctrl.abort(); };
  }, [category, limit, intervalMs]);

  useEffect(() => {
    if (!selectedId) { setSelected(null); setPath([]); return; }
    const ctrl = new AbortController();
    const quiet = (e) => { if (e.name !== "AbortError") setError(e.message); };
    api.satellite(selectedId, ctrl.signal).then(setSelected).catch(quiet);
    api.track(selectedId, { minutes: 100, step_seconds: 60 }, ctrl.signal).then(setPath).catch((e) => { if (e.name !== "AbortError") setPath([]); });
    return () => ctrl.abort();
  }, [selectedId]);

  const selectedPos = positions.find((p) => p.satellite_id === selectedId);
  const select = useCallback((id) => setSelectedId(id), []);
  return { positions, selectedId, select, selected, selectedPos, path, error };
}

export function useWatchlist() {
  const [items, setItems] = useState([]);
  const refresh = useCallback(() => api.watchlist().then(setItems).catch(() => {}), []);
  useEffect(() => { refresh(); }, [refresh]);
  const find = (satId) => items.find((w) => w.satellite.satellite_id === satId);
  const toggle = async (satId) => {
    const w = find(satId);
    if (w) await api.removeWatch(w.watchlist_id); else await api.addWatch(satId);
    await refresh();
  };
  return { items, refresh, find, toggle };
}
