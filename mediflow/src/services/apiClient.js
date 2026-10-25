import { translateUserFacingMessage } from "../utils/userFacingError.js";
import { getApiBaseUrl } from "../utils/resolveApiBaseUrl.js";

/** Base URL for manual fetch (reachability probe). Same rules as `request()`. */
export { getApiBaseUrl };

const TOKEN_KEY = "mediflow_token";
const USER_KEY = "mediflow_user";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setStoredAuth(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Aligns persisted user/token; clears inconsistent rows from older builds or manual edits. */
export function initAuthSession() {
  const user = getStoredUser();
  const token = getStoredToken();
  if (user && !token) {
    clearStoredAuth();
    return { user: null, token: "" };
  }
  if (token && !user) {
    localStorage.removeItem(TOKEN_KEY);
    return { user: null, token: "" };
  }
  return { user, token };
}

function unwrapEnvelope(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if ("success" in payload && "data" in payload) {
    if (payload.success === false) {
      const err = payload.error || {};
      const raw = Array.isArray(err.message) ? err.message.join(", ") : err.message || "Request failed";
      const status = err.status || 500;
      const code = err.code || "REQUEST_ERROR";
      const error = new Error(translateUserFacingMessage(raw, { status, code }));
      error.status = status;
      error.code = code;
      throw error;
    }
    return payload.data;
  }
  return payload;
}

/**
 * True if the backend responds (not just `navigator.onLine`, which often lies on Windows).
 * Uses GET /sync/status with a short timeout — same auth headers as normal API calls.
 */
export async function probeBackendReachable() {
  const token = getStoredToken();
  if (!token) return true;
  const user = getStoredUser();
  const ctrl = new AbortController();
  const tid = window.setTimeout(() => ctrl.abort(), 4500);
  try {
    const res = await fetch(`${getApiBaseUrl()}/sync/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(user?.tenantId ? { "X-Tenant-Id": user.tenantId } : {}),
        Authorization: `Bearer ${token}`,
      },
      signal: ctrl.signal,
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(tid);
  }
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const user = getStoredUser();
  const sendBearer = Boolean(token && path !== "/auth/login");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(user?.tenantId ? { "X-Tenant-Id": user.tenantId } : {}),
    ...(sendBearer ? { Authorization: `Bearer ${token}` } : {}),
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

  if (response.status === 401 && sendBearer) {
    clearStoredAuth();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mediflow:auth-expired"));
    }
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
    const rawMsg = Array.isArray(message) ? message.join(", ") : message;
    const error = new Error(translateUserFacingMessage(rawMsg, { status: response.status, code }));
    error.status = response.status;
    error.code = code;
    throw error;
  }

  if (response.status === 204) return null;
  const payload = await response.json();
  return unwrapEnvelope(payload);
}

/** NDJSON stream from POST /ai/copilot/stream (MediFlow copilot tokens). */
export async function* copilotAskStream(payload) {
  const token = getStoredToken();
  const user = getStoredUser();
  const sendBearer = Boolean(token);
  let response;
  try {
    response = await fetch(`${getApiBaseUrl()}/ai/copilot/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(user?.tenantId ? { "X-Tenant-Id": user.tenantId } : {}),
        ...(sendBearer ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const raw = e && typeof e === "object" && "message" in e ? String(e.message) : String(e);
    throw new Error(translateUserFacingMessage(raw, {}));
  }

  if (response.status === 401 && sendBearer) {
    clearStoredAuth();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mediflow:auth-expired"));
    }
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let code = "REQUEST_ERROR";
    try {
      const payloadJson = await response.json();
      const data = payloadJson?.error || payloadJson;
      message = data?.message || data?.error || message;
      code = data?.code || code;
    } catch {
      try {
        const t = await response.text();
        if (t) message = t.slice(0, 400);
      } catch {
        // ignore
      }
    }
    const rawMsg = Array.isArray(message) ? message.join(", ") : message;
    const error = new Error(translateUserFacingMessage(rawMsg, { status: response.status, code }));
    error.status = response.status;
    error.code = code;
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("المتصفح لا يدعم البث من الخادم.");

  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    for (;;) {
      const nl = buf.indexOf("\n");
      if (nl < 0) break;
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        yield JSON.parse(line);
      } catch {
        // Malformed NDJSON line (e.g. partial chunk from network hiccup) — skip it
        // rather than crashing the entire stream generator.
      }
    }
  }
}

export const api = {
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  getUsers: () => request("/users"),
  createUser: (payload) => request("/users", { method: "POST", body: payload }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: "PATCH", body: payload }),
  toggleUserActive: (id) => request(`/users/${id}/toggle-active`, { method: "PATCH" }),

  getPatients: (params = null) => {
    if (!params) return request("/patients");
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    ).toString();
    return request(query ? `/patients?${query}` : "/patients");
  },
  createPatient: (payload) => request("/patients", { method: "POST", body: payload }),
  getPatient: (id) => request(`/patients/${encodeURIComponent(id)}`),
  updatePatient: (id, payload) => request(`/patients/${id}`, { method: "PATCH", body: payload }),
  getPatientPackages: (id) => request(`/patients/${id}/packages`),
  createPatientPackage: (id, payload) => request(`/patients/${id}/packages`, { method: "POST", body: payload }),
  deletePatient: (id) => request(`/patients/${id}`, { method: "DELETE" }),

  getServices: (doctorId = null) => request(doctorId ? `/services?doctorId=${encodeURIComponent(doctorId)}` : "/services"),
  createService: (payload) => request("/services", { method: "POST", body: payload }),
  updateService: (id, payload) => request(`/services/${id}`, { method: "PATCH", body: payload }),
  deleteService: (id) => request(`/services/${id}`, { method: "DELETE" }),

  getSchedules: () => request("/schedules"),
  upsertSchedule: (payload) => request("/schedules", { method: "POST", body: payload }),
  deleteSchedule: (doctorId, dayOfWeek) =>
    request(`/schedules/${encodeURIComponent(doctorId)}/${dayOfWeek}`, { method: "DELETE" }),

  getAppointments: (params = null) => {
    if (!params) return request("/appointments");
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    ).toString();
    return request(query ? `/appointments?${query}` : "/appointments");
  },
  createAppointment: (payload) => request("/appointments", { method: "POST", body: payload }),
  updateAppointment: (id, payload) => request(`/appointments/${id}`, { method: "PATCH", body: payload }),
  updateAppointmentStatus: (id, payload) =>
    request(`/appointments/${id}/status`, { method: "PATCH", body: payload }),
  requestReceptionAssistance: (id) =>
    request(`/appointments/${encodeURIComponent(id)}/request-reception`, { method: "POST", body: {} }),
  finalizeAppointmentSession: (id, payload) =>
    request(`/appointments/${id}/session-finalize`, { method: "PATCH", body: payload }),
  createNextSession: (id, payload) =>
    request(`/appointments/${id}/next-session`, { method: "POST", body: payload }),
  addAppointmentMedia: (id, payload) =>
    request(`/appointments/${id}/media`, { method: "POST", body: payload }),
  getAppointmentAvailability: (params) => {
    const query = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    ).toString();
    return request(query ? `/appointments/availability?${query}` : "/appointments/availability");
  },
  deleteAppointment: (id) => request(`/appointments/${id}`, { method: "DELETE" }),

  getInvoices: (params = null) => {
    if (!params) return request("/invoices");
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    ).toString();
    return request(query ? `/invoices?${query}` : "/invoices");
  },
  payInvoice: (id, payload = {}) => request(`/invoices/${id}/pay`, { method: "PATCH", body: payload }),

  getNotifications: (params = null) => {
    if (!params) return request("/notifications");
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    ).toString();
    return request(query ? `/notifications?${query}` : "/notifications");
  },
  markNotificationRead: (id) => request(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "PATCH" }),

  /** Offline-first: incremental pull (Patient/Appointment changes). */
  syncChanges: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    ).toString();
    return request(query ? `/sync/changes?${query}` : "/sync/changes");
  },
  /** Push outbox operations (partial success per op). */
  syncBatch: (payload) => request("/sync/batch", { method: "POST", body: payload }),
  syncStatus: () => request("/sync/status"),

  getAccountMe: () => request("/account/me"),
  patchAccountProfile: (payload) => request("/account/profile", { method: "PATCH", body: payload }),
  patchAccountPassword: (payload) => request("/account/password", { method: "PATCH", body: payload }),

  /** Structured booking fields from natural-language Arabic text via Google Gemini (backend). */
  parseBookingWithAi: (payload) =>
    request("/ai/booking-parse", { method: "POST", body: payload }),

  /** MediFlow copilot — NL → intent + tools + Gemini/OpenAI (backend LlmGateway). */
  copilotAsk: (payload) => request("/ai/copilot", { method: "POST", body: payload }),
  /** Same copilot pipeline with streamed final tokens (NDJSON). */
  copilotAskStream,
};

export { request };
