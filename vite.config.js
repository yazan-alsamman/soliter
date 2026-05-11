import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:3000";

  // electron → relative paths required for file:// protocol
  // production → root URL (e.g. Hostinger); set VITE_BASE_PATH=/subdir/ for GH Pages subfolder
  const base =
    mode === "electron"
      ? "./"
      : env.VITE_BASE_PATH || (mode === "production" ? "/" : "/");

  return {
    base,
    plugins: [
      react(),
      {
        name: "inject-mediflow-api-meta",
        transformIndexHtml(html) {
          const raw = (env.VITE_API_BASE_URL || "").trim();
          const escaped = raw.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
          return html.replace(
            '<meta name="mediflow-api-base" content="" />',
            `<meta name="mediflow-api-base" content="${escaped}" />`,
          );
        },
      },
    ],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-redux", "recharts"],
    },
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
