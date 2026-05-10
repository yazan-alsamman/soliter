import { useMemo } from "react";
import { useThemeMode } from "../context/ThemeModeContext.jsx";

function readCssVar(name, fallback = "0 0 0") {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function rgb(value, alpha = 1) {
  return `rgb(${value} / ${alpha})`;
}

export function useChartTheme() {
  const { darkMode } = useThemeMode();

  return useMemo(() => {
    const grid = readCssVar("--chart-grid", darkMode ? "74 89 111" : "226 232 240");
    const axis = readCssVar("--chart-axis", darkMode ? "139 160 185" : "100 116 139");
    const tooltipBg = readCssVar("--chart-tooltip-bg", darkMode ? "22 29 41" : "255 255 255");
    const tooltipBorder = readCssVar("--chart-tooltip-border", darkMode ? "255 255 255" : "221 227 232");
    const seriesPrimary = readCssVar("--chart-series-primary", darkMode ? "76 180 196" : "14 116 144");
    const seriesSecondary = readCssVar("--chart-series-secondary", darkMode ? "128 151 180" : "191 199 209");
    const barSeries = readCssVar("--chart-series-bar", darkMode ? "82 145 214" : "47 126 203");
    const textPrimary = readCssVar("--ink-default", darkMode ? "226 232 240" : "15 23 42");
    const textMuted = readCssVar("--ink-mute", darkMode ? "133 152 175" : "107 114 128");

    return {
      cartesianGrid: rgb(grid, darkMode ? 0.6 : 0.9),
      axisTick: rgb(axis, 0.95),
      linePrimary: rgb(seriesPrimary, 1),
      lineSecondary: rgb(seriesSecondary, 0.92),
      barPrimary: rgb(barSeries, 1),
      tooltipStyle: {
        borderRadius: 12,
        border: `1px solid ${rgb(tooltipBorder, darkMode ? 0.12 : 1)}`,
        backgroundColor: rgb(tooltipBg, darkMode ? 0.96 : 1),
        color: rgb(textPrimary, 1),
        boxShadow: darkMode
          ? "0 10px 26px rgba(2,8,23,0.42)"
          : "0 4px 14px rgba(15,23,42,0.08)",
      },
      tooltipLabelStyle: {
        color: rgb(textPrimary, 1),
        fontWeight: 700,
      },
      tooltipItemStyle: {
        color: rgb(textMuted, 1),
        fontWeight: 600,
      },
      primaryDotFill: rgb(seriesPrimary, 1),
      linePrimaryDot: { r: 2.5, fill: rgb(seriesPrimary, 1), stroke: rgb(seriesPrimary, darkMode ? 0.35 : 0.2), strokeWidth: 0.75 },
      linePrimaryActiveDot: { r: 4, fill: rgb(seriesPrimary, 1), stroke: rgb(tooltipBg, 1), strokeWidth: 1.5 },
      lineSecondaryActiveDot: { r: 3.5, fill: rgb(seriesSecondary, 1), stroke: rgb(tooltipBg, 1), strokeWidth: 1.25 },
      tooltipWrapperStyle: {
        outline: "none",
        zIndex: 30,
      },
    };
  }, [darkMode]);
}
