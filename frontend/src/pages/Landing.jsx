import { Link } from "react-router-dom";
import Globe from "../components/Globe.jsx";
import Mark from "../components/Mark.jsx";
import { useLive } from "../lib/useLive";

// Decorative concentric instrument rings behind the globe (no data, no behaviour).
const Rings = () => (
  <svg className="pointer-events-none absolute left-1/2 top-1/2 h-[135%] w-[135%] -translate-x-1/2 -translate-y-1/2" viewBox="0 0 800 800" fill="none" aria-hidden="true">
    <g className="spin-slow" style={{ transformOrigin: "400px 400px" }}>
      <circle cx="400" cy="400" r="300" stroke="rgba(201,162,75,0.22)" strokeWidth="1" strokeDasharray="2 10" />
      <circle cx="400" cy="400" r="352" stroke="rgba(201,162,75,0.12)" strokeWidth="1" />
      <path d="M400 40v18M400 742v18M40 400h18M742 400h18" stroke="rgba(241,216,143,0.55)" strokeWidth="1.5" />
    </g>
    <g className="spin-slower" style={{ transformOrigin: "400px 400px" }}>
      <ellipse cx="400" cy="400" rx="380" ry="120" transform="rotate(-24 400 400)" stroke="rgba(233,162,59,0.28)" strokeWidth="1" />
      <circle cx="716" cy="272" r="4" fill="#FFC266" />
      <circle cx="716" cy="272" r="9" stroke="rgba(233,162,59,0.45)" />
    </g>
  </svg>
);

export default function Landing() {
  const { positions } = useLive({ limit: 150, intervalMs: 10000 });
  return (
    <div className="relative h-full overflow-hidden bg-obsidian"
      style={{ backgroundImage:
        "radial-gradient(ellipse 60% 70% at 72% 50%, rgba(233,162,59,0.14), transparent 70%), linear-gradient(rgba(201,162,75,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,75,0.04) 1px, transparent 1px)",
        backgroundSize: "auto, 56px 56px, 56px 56px" }}>
      {/* globe + rings */}
      <div className="absolute inset-y-0 right-0 w-full opacity-55 md:right-[-8%] md:w-[72%] md:opacity-100">
        <Rings />
        <Globe satellites={positions} markerSize={0.014} cameraZ={3.0} />
      </div>

      {/* HUD frame */}
      <div className="pointer-events-none absolute inset-3 sm:inset-5" aria-hidden="true"
        style={{ background:
          "linear-gradient(#F1D88F,#F1D88F) top left/28px 1px no-repeat, linear-gradient(#F1D88F,#F1D88F) top left/1px 28px no-repeat," +
          "linear-gradient(#F1D88F,#F1D88F) top right/28px 1px no-repeat, linear-gradient(#F1D88F,#F1D88F) top right/1px 28px no-repeat," +
          "linear-gradient(#F1D88F,#F1D88F) bottom left/28px 1px no-repeat, linear-gradient(#F1D88F,#F1D88F) bottom left/1px 28px no-repeat," +
          "linear-gradient(#F1D88F,#F1D88F) bottom right/28px 1px no-repeat, linear-gradient(#F1D88F,#F1D88F) bottom right/1px 28px no-repeat" }} />

      <div className="pointer-events-none relative z-10 flex h-full max-w-5xl flex-col justify-between px-8 py-10 sm:px-14 md:px-20 md:py-16">
        <div className="flex items-center gap-4">
          <Mark size={44} />
          <div className="font-brand text-[17px] tracking-[0.3em] text-ink">ORBIT<span className="metal">X</span></div>
        </div>
        <div>
          <div className="eyebrow mb-6">Space Intelligence &amp; Satellite Tracking</div>
          <h1 className="h-edit mb-7 text-[52px] font-medium leading-[0.95] sm:text-[76px] md:text-[92px]">
            The sky above,<br /><span className="metal">held in a database.</span>
          </h1>
          <p className="mb-10 max-w-lg border-l border-amber/50 pl-5 text-[15px] leading-relaxed text-ivory/80">
            ORBITX propagates public CelesTrak orbital elements with SGP4, stores every calculated position
            in MySQL, and lets you explore, compare and replay satellite movement on a 3D Earth.
          </p>
          <Link to="/app" className="btn pointer-events-auto !px-9 !py-[14px] !text-[17px]">Explore dashboard</Link>
        </div>
        <div className="hud-note">Positions are calculated from TLEs, not live radar observations.</div>
      </div>
    </div>
  );
}
