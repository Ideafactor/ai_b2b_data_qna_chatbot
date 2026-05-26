"use client";

import dynamic from "next/dynamic";
import type { ChartConfig } from "@/types";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Props {
  config: ChartConfig;
}

function buildTraces(config: ChartConfig): Plotly.Data[] {
  const { chart_type, data, x_label, y_label } = config;

  if (!data || data.length === 0) return [];

  const xKey = x_label || Object.keys(data[0] || {})[0] || "x";
  const yKey = y_label || Object.keys(data[0] || {})[1] || "y";

  switch (chart_type) {
    case "bar":
      return [
        {
          type: "bar",
          x: data.map((d) => d[xKey]),
          y: data.map((d) => d[yKey]),
          marker: { color: "#3b82f6" },
        } as Plotly.Data,
      ];

    case "line":
      return [
        {
          type: "scatter",
          mode: "lines+markers",
          x: data.map((d) => d[xKey]),
          y: data.map((d) => d[yKey]),
          line: { color: "#3b82f6" },
          marker: { color: "#3b82f6" },
        } as Plotly.Data,
      ];

    case "pie":
      return [
        {
          type: "pie",
          labels: data.map((d) => d["label"] ?? d[xKey]),
          values: data.map((d) => d["value"] ?? d[yKey]),
        } as Plotly.Data,
      ];

    case "histogram":
      return [
        {
          type: "histogram",
          x: data.map((d) => d[xKey]),
          marker: { color: "#3b82f6" },
        } as Plotly.Data,
      ];

    case "table": {
      const cols = Object.keys(data[0] || {});
      return [
        {
          type: "table",
          header: { values: cols, fill: { color: "#f1f5f9" }, font: { size: 12 } },
          cells: {
            values: cols.map((c) => data.map((d) => d[c])),
            font: { size: 11 },
          },
        } as Plotly.Data,
      ];
    }

    default:
      return [];
  }
}

export default function ChartRenderer({ config }: Props) {
  const traces = buildTraces(config);
  if (traces.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden bg-white">
      <Plot
        data={traces}
        layout={{
          title: { text: config.title, font: { size: 13 } },
          height: 320,
          margin: { t: 40, r: 20, b: 40, l: 50 },
          paper_bgcolor: "white",
          plot_bgcolor: "white",
          font: { family: "Inter, sans-serif", size: 11 },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%" }}
      />
    </div>
  );
}
