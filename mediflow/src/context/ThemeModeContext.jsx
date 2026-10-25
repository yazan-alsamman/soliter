/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";

const STORAGE_KEY = "mediflow-theme";

const ThemeModeContext = createContext({
  darkMode: false,
  revealActive: false,
  revealOrigin: { x: null, y: null },
  setDarkMode: () => {},
  toggleDarkMode: () => {},
});

function resolveInitialMode() {
  if (typeof window === "undefined") return false;
  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (savedTheme) return savedTheme === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeModeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(resolveInitialMode);
  const [revealActive, setRevealActive] = useState(false);
  const [revealOrigin, setRevealOrigin] = useState({ x: null, y: null });

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", darkMode);
    window.localStorage.setItem(STORAGE_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  const value = useMemo(() => {
    const toggleDarkMode = (origin) => {
      const canAnimate =
        typeof window !== "undefined" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (canAnimate) {
        const x = origin?.x ?? window.innerWidth * 0.9;
        const y = origin?.y ?? 64;
        document.documentElement.style.setProperty("--theme-reveal-x", `${x}px`);
        document.documentElement.style.setProperty("--theme-reveal-y", `${y}px`);

        if (typeof document.startViewTransition === "function") {
          document.startViewTransition(() => {
            flushSync(() => {
              setDarkMode((prev) => !prev);
            });
          });
          return;
        }

        if (origin?.x != null && origin?.y != null) {
          setRevealOrigin({ x: origin.x, y: origin.y });
        } else {
          setRevealOrigin({ x: window.innerWidth * 0.9, y: 64 });
        }
        setRevealActive(true);
        window.setTimeout(() => setRevealActive(false), 4300);
      }
      setDarkMode((prev) => !prev);
    };

    return {
      darkMode,
      revealActive,
      revealOrigin,
      setDarkMode,
      toggleDarkMode,
    };
  }, [darkMode, revealActive, revealOrigin]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
