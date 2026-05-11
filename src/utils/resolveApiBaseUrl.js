/** Normalize API root (no trailing slash). */
export function normalizeApiBase(value) {
  if (value == null || typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "");
}

/**
 * API base for fetch(): dev uses same-origin `/api` (Vite proxy). Production uses, in order:
 * 1. `window.__MEDIFLOW_API_BASE__` (optional, set before app modules load)
 * 2. `<meta name="mediflow-api-base" content="https://.../api">` in index.html (build-injected or hand-edited)
 * 3. `VITE_API_BASE_URL` at build time
 * 4. Same-origin `/api` (only if your host also serves the API there)
 */
export function resolveApiBaseUrl() {
  if (typeof window !== "undefined") {
    const w = normalizeApiBase(window.__MEDIFLOW_API_BASE__);
    if (w) return w;
  }
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="mediflow-api-base"]')?.getAttribute("content");
    const m = normalizeApiBase(meta || "");
    if (m) return m;
  }
  const explicit = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || "");
  if (explicit) return explicit;
  if (import.meta.env.DEV) return "/api";
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base === "/" ? "" : base.replace(/\/$/, "");
  const joined = `${prefix}/api`.replace(/\/+/g, "/");
  return joined || "/api";
}

let memo = null;

export function getApiBaseUrl() {
  if (memo === null) memo = resolveApiBaseUrl();
  return memo;
}
