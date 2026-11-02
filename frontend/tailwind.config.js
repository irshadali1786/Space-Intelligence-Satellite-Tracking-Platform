/** @type {import('tailwindcss').Config} */
// ORBITX · "Obsidian / Amber / Gold" mission-control design tokens.
// Token names are kept stable so every existing utility class resolves to the new palette.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // obsidian surfaces, darkest -> lightest
        obsidian: "#050505",
        coal: "#0A0A09",
        panel: "#0E0D0B",
        raised: "#17140F",
        // warm amber (signal / live) and metallic gold (structure / chrome)
        amber: "#E9A23B",
        amberhi: "#FFC266",
        gold: "#C9A24B",
        goldhi: "#F1D88F",
        bronze: "#8A6420",
        // text
        ivory: "#D9CFB8",
        ink: "#F6EFDD",
        muted: "#8C846F",
        // hairlines
        line: "#2A2418",
        line2: "#4A3D22",
        // signal red (alerts only)
        warn: "#EF5B3F",
      },
      fontFamily: {
        // kept so legacy `font-serif` resolves to the new display face
        serif: ['"Barlow Condensed"', "Impact", "sans-serif"],
        display: ['"Barlow Condensed"', "Impact", "sans-serif"],
        brand: ['"Michroma"', '"Barlow"', "sans-serif"],
        sans: ['"Barlow"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 0 0 1px rgba(201,162,75,0.05) inset, 0 24px 48px -28px rgba(0,0,0,0.9)",
        pop: "0 24px 60px -16px rgba(0,0,0,0.95), 0 0 0 1px rgba(201,162,75,0.28)",
        glow: "0 0 24px -4px rgba(233,162,59,0.45)",
      },
    },
  },
  plugins: [],
};
