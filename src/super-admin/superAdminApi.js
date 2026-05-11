import { translateUserFacingMessage } from "../utils/userFacingError.js";
import { getApiBaseUrl } from "../utils/resolveApiBaseUrl.js";
export const SUPER_TOKEN_KEY = "mediflow_super_token";
export const SUPER_USER_KEY = "mediflow_super_user";

export function getSuperToken() {
  return localStorage.getItem(SUPER_TOKEN_KEY) || "";
}

export function setSuperAuth(token, user) {
  if (token) localStorage.setItem(SUPER_TOKEN_KEY, token);
  if (user) localStorage.setItem(SUPER_USER_KEY, JSON.stringify(user));
}

export function clearSuperAuth() {
  localStorage.removeItem(SUPER_TOKEN_KEY);
  localStorage.removeItem(SUPER_USER_KEY);
}

export function getSuperUser() {
  try {
    const raw = localStorage.getItem(SUPER_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getSuperToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (e) {
    const raw = e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
    throw new Error(translateUserFacingMessage(raw, {}));
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let code = "REQUEST_ERROR";
    try {
      const payload = await response.json();
      const data = payload?.error || payload;
      message = data?.message || data?.error || message;
      code = data?.code || code;
    } catch {
      // ignore
    }
    const raw = typeof message === "string" ? message : JSON.stringify(message);
    const err = new Error(translateUserFacingMessage(raw, { status: response.status, code }));
    err.status = response.status;
    err.code = code;
    throw err;
  }

  if (response.status === 204) return null;
  const payload = await response.json();
  if (payload && typeof payload === "object" && "success" in payload && payload.success === false) {
    const e = payload.error || {};
    const raw = typeof e.message === "string" ? e.message : "Request failed";
    const err = new Error(translateUserFacingMessage(raw, { status: e.status, code: e.code }));
    err.status = e.status;
    err.code = e.code;
    throw err;
  }
  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    return payload.data;
  }
  return payload;
}

export const superAdminApi = {
  login: (body) => request("/super-admin/auth/login", { method: "POST", body }),
  metrics: () => request("/super-admin/metrics"),
  health: () => request("/super-admin/health"),
  auditLogs: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    ).toString();
    return request(q ? `/super-admin/audit-logs?${q}` : "/super-admin/audit-logs");
  },
  listTenants: (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    ).toString();
    return request(q ? `/super-admin/tenants?${q}` : "/super-admin/tenants");
  },
  getTenant: (id) => request(`/super-admin/tenants/${encodeURIComponent(id)}`),
  createTenant: (body) => request("/super-admin/tenants", { method: "POST", body }),
  patchTenant: (id, body) =>
    request(`/super-admin/tenants/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  suspendTenant: (id) =>
    request(`/super-admin/tenants/${encodeURIComponent(id)}/suspend`, { method: "POST" }),
  reactivateTenant: (id) =>
    request(`/super-admin/tenants/${encodeURIComponent(id)}/reactivate`, { method: "POST" }),
  deleteTenant: (id) => request(`/super-admin/tenants/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
