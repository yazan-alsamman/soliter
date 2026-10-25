import { normalizeApiBase } from "./utils/resolveApiBaseUrl.js";

const base = import.meta.env.BASE_URL || "/";
const root = base.endsWith("/") ? base : `${base}/`;

try {
  const r = await fetch(`${root}config.json`, { cache: "no-store" });
  if (r.ok) {
    const j = await r.json();
    const b = normalizeApiBase(j?.apiBase != null ? String(j.apiBase) : "");
    if (b) window.__MEDIFLOW_API_BASE__ = b;
  }
} catch {
  /* optional runtime config next to index.html */
}

await import("./app-bootstrap.jsx");
