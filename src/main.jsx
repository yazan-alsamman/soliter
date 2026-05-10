import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import rtlPlugin from "stylis-plugin-rtl";
import { ThemeModeProvider } from "./context/ThemeModeContext.jsx";
import { RootErrorBoundary } from "./components/RootErrorBoundary.jsx";
import ThemedApp from "./ThemedApp.jsx";
import "./index.css";

const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [rtlPlugin],
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CacheProvider value={cacheRtl}>
      <ThemeModeProvider>
        <RootErrorBoundary>
          <ThemedApp />
        </RootErrorBoundary>
      </ThemeModeProvider>
    </CacheProvider>
  </StrictMode>
);
