import { createTheme } from "@mui/material/styles";

export function createAppTheme(mode = "light") {
  const isDark = mode === "dark";
  return createTheme({
    direction: "rtl",
    palette: {
      mode,
      primary: {
        main: isDark ? "#2f8ea0" : "#0e7490",
        light: isDark ? "#3ca1b6" : "#0891b2",
        dark: isDark ? "#266f7e" : "#0c5f75",
        contrastText: "#ffffff",
      },
      secondary: {
        main: isDark ? "#4a88d8" : "#2563eb",
        light: isDark ? "#8bb4ea" : "#dbeafe",
        contrastText: "#ffffff",
      },
      success: { main: isDark ? "#2f9f7a" : "#059669", light: isDark ? "#1d2f2c" : "#d1fae5", contrastText: "#ffffff" },
      error: { main: isDark ? "#c45757" : "#dc2626", light: isDark ? "#321b1f" : "#fee2e2" },
      warning: { main: isDark ? "#bd8750" : "#d97706", light: isDark ? "#332718" : "#fef3c7" },
      background: { default: isDark ? "#0b111b" : "#f0f5f9", paper: isDark ? "#161d29" : "#ffffff" },
      text: { primary: isDark ? "#e2e8f0" : "#0f172a", secondary: isDark ? "#a9b8ca" : "#374151" },
      divider: isDark ? "rgba(255,255,255,0.08)" : "#dde3e8",
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: "'29LT Azur', 'IBM Plex Sans Arabic', 'Inter', ui-sans-serif, system-ui, sans-serif",
      h1: { fontFamily: "'29LT Azur', 'Cairo', sans-serif", fontWeight: 700, lineHeight: 1.2 },
      h2: { fontFamily: "'29LT Azur', 'Cairo', sans-serif", fontWeight: 700, lineHeight: 1.24 },
      h3: { fontFamily: "'29LT Azur', 'Cairo', sans-serif", fontWeight: 700, lineHeight: 1.28 },
      h4: { fontFamily: "'29LT Azur', 'Cairo', sans-serif", fontWeight: 700, lineHeight: 1.3 },
      h5: { fontFamily: "'29LT Azur', 'Cairo', sans-serif", fontWeight: 600, lineHeight: 1.34 },
      h6: { fontFamily: "'29LT Azur', 'Cairo', sans-serif", fontWeight: 600, lineHeight: 1.36 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, height: 44, paddingLeft: 18, paddingRight: 18 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { fontSize: 12, borderRadius: 8 } },
      },
    },
  });
}
