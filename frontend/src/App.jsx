import { useEffect, useState } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import LiveTracking from "./pages/LiveTracking.jsx";
import Explorer from "./pages/Explorer.jsx";
import SatelliteDetails from "./pages/SatelliteDetails.jsx";
import OrbitHistory from "./pages/OrbitHistory.jsx";
import Analytics from "./pages/Analytics.jsx";
import Proximity from "./pages/Proximity.jsx";
import Watchlist from "./pages/Watchlist.jsx";
import Settings from "./pages/Settings.jsx";

function Shell() {
  // Presentation state only: whether the mobile navigation drawer is open.
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setNavOpen(false); }, [pathname]);

  return (
    <div className="flex h-full">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setNavOpen(true)} />
        <main className="app-bg min-h-0 flex-1 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="tracking" element={<LiveTracking />} />
        <Route path="explorer" element={<Explorer />} />
        <Route path="satellite/:id" element={<SatelliteDetails />} />
        <Route path="history" element={<OrbitHistory />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="proximity" element={<Proximity />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
