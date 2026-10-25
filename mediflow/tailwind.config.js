/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: ["class", ".theme-dark"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "rgb(var(--surface-default) / <alpha-value>)",
          dim: "rgb(var(--surface-dim) / <alpha-value>)",
          bright: "rgb(var(--surface-bright) / <alpha-value>)",
          base: "rgb(var(--surface-base) / <alpha-value>)",
          low: "rgb(var(--surface-low) / <alpha-value>)",
          mid: "rgb(var(--surface-mid) / <alpha-value>)",
          high: "rgb(var(--surface-high) / <alpha-value>)",
          highest: "rgb(var(--surface-highest) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink-default) / <alpha-value>)",
          variant: "rgb(var(--ink-variant) / <alpha-value>)",
          mute: "rgb(var(--ink-mute) / <alpha-value>)",
          line: "rgb(var(--ink-line) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          hover: "rgb(var(--primary-hover) / <alpha-value>)",
          soft: "rgb(var(--primary-soft) / <alpha-value>)",
          fg: "#ffffff",
          glow: "rgb(var(--primary) / 0.2)",
        },
        pulse: {
          DEFAULT: "rgb(var(--pulse) / <alpha-value>)",
          soft: "rgb(var(--pulse-soft) / <alpha-value>)",
          fg: "#ffffff",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          soft: "rgb(var(--secondary-soft) / <alpha-value>)",
          fg: "#ffffff",
        },
        tertiary: {
          DEFAULT: "rgb(var(--tertiary) / <alpha-value>)",
          soft: "rgb(var(--tertiary-soft) / <alpha-value>)",
          fg: "#ffffff",
        },
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          soft: "rgb(var(--success-soft) / <alpha-value>)",
          fg: "#ffffff",
        },
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          soft: "rgb(var(--danger-soft) / <alpha-value>)",
          fg: "#ffffff",
        },
        warn: {
          DEFAULT: "rgb(var(--warn) / <alpha-value>)",
          soft: "rgb(var(--warn-soft) / <alpha-value>)",
          fg: "#ffffff",
        },
        night: {
          DEFAULT: "#0f172a",
          surface: "#1e293b",
          border: "#2d3f55",
          text: "#e2e8f0",
          mute: "#94a3b8",
          dim: "#64748b",
        },
      },
      fontFamily: {
        display: ['"29LT Azur"', '"IBM Plex Sans Arabic"', "Cairo", "Manrope", "ui-sans-serif", "system-ui"],
        sans: ['"29LT Azur"', '"IBM Plex Sans Arabic"', "Inter", "ui-sans-serif", "system-ui"],
        latin: ["Inter", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
        "3xl": "2.5rem",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        pop: "0 16px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
        deep: "0 32px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)",
        focus: "0 0 0 3px rgba(14,116,144,0.28)",
        glow: "0 0 0 4px rgba(6,182,212,0.22), 0 8px 20px rgba(6,182,212,0.14)",
        "glow-md": "0 0 24px rgba(6,182,212,0.22), 0 0 8px rgba(6,182,212,0.12)",
        ambient: "0 4px 20px rgba(14,116,144,0.10), 0 1px 4px rgba(0,0,0,0.04)",
        night: "0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "blob-drift": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "25%": { transform: "translate(24px, -18px) scale(1.04)" },
          "50%": { transform: "translate(-16px, 22px) scale(0.97)" },
          "75%": { transform: "translate(20px, 8px) scale(1.02)" },
        },
        stamp: {
          "0%": { transform: "scale(1.2)", opacity: "0" },
          "60%": { transform: "scale(0.96)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "ring-out": {
          "0%": { transform: "scale(0.85)", opacity: "0.9" },
          "100%": { transform: "scale(1.45)", opacity: "0" },
        },
        "count-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ticker-in": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.35s ease-out both",
        "fade-in": "fade-in 0.25s ease-out both",
        "scale-in": "scale-in 0.22s ease-out both",
        "pulse-soft": "pulse-soft 2.2s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "blob-1": "blob-drift 22s ease-in-out infinite",
        "blob-2": "blob-drift 28s ease-in-out infinite reverse",
        "blob-3": "blob-drift 18s ease-in-out infinite",
        stamp: "stamp 0.45s cubic-bezier(0.36,0.07,0.19,0.97) both",
        "ring-out": "ring-out 1.6s ease-out infinite",
        "count-up": "count-up 0.4s ease-out both",
        "ticker-in": "ticker-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};
