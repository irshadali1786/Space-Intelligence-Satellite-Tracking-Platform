import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";

const Plot = createPlotlyComponent(Plotly);

// ORBITX chart palette: amber signal, metallic golds, bronze, signal red, steel.
const AXIS = {
  gridcolor: "rgba(201,162,75,0.10)", zerolinecolor: "rgba(201,162,75,0.35)", linecolor: "rgba(201,162,75,0.35)",
  griddash: "dot",
  tickfont: { family: "JetBrains Mono, monospace", size: 10, color: "#8C846F" },
  title: { font: { family: "JetBrains Mono, monospace", size: 10, color: "#C9A24B" }, standoff: 12 },
  ticks: "outside", ticklen: 4, tickcolor: "rgba(201,162,75,0.35)", automargin: true,
};

// Horizontal gridlines carry the reading; vertical ones just add noise on category/time axes.
const XAXIS = { ...AXIS, showgrid: false, zeroline: false };

export const baseLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: "Barlow, sans-serif", color: "#8C846F", size: 11 },
  margin: { l: 48, r: 14, t: 12, b: 38 },
  xaxis: XAXIS,
  yaxis: AXIS,
  bargap: 0.38,
  colorway: ["#E9A23B", "#F1D88F", "#8A6420", "#EF5B3F", "#8C846F", "#C9A24B"],
  hoverlabel: { bgcolor: "#0B0A08", bordercolor: "#E9A23B", font: { family: "JetBrains Mono, monospace", size: 11.5, color: "#F6EFDD" } },
  legend: { font: { family: "JetBrains Mono, monospace", size: 10, color: "#D9CFB8" }, bgcolor: "rgba(0,0,0,0)" },
};

// Pages pass axis titles as plain strings; fold them into the themed title object so the font stays consistent.
const axisFor = (override = {}, base = AXIS) => {
  const o = { ...override };
  if (typeof o.title === "string") o.title = { ...AXIS.title, text: o.title };
  return { ...base, ...o };
};

export default function Chart({ data, layout = {}, height = 260 }) {
  return (
    <Plot
      data={data}
      layout={{ ...baseLayout, ...layout, height, xaxis: axisFor(layout.xaxis, XAXIS), yaxis: axisFor(layout.yaxis) }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%" }}
      useResizeHandler
    />
  );
}
