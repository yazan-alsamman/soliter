/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, clearStoredAuth, initAuthSession, setStoredAuth } from "../services/apiClient.js";

export const ROLES = {
  RECEPTIONIST: "receptionist",
  DOCTOR: "doctor",
  ADMIN: "admin",
};

export const ROLE_LABEL_AR = {
  [ROLES.RECEPTIONIST]: "موظف الاستقبال",
  [ROLES.DOCTOR]: "طبيب",
  [ROLES.ADMIN]: "مدير النظام",
};

const PERMS = {
  [ROLES.RECEPTIONIST]: {
    dashboard: true,
    appointments: { view: true, create: true, edit: true },
    patients: { view: true, create: true, edit: true, notes: false },
    billing: { view: true, create: true, reports: false },
    inventory: false,
    reports: false,
    settings: true,
    procedures: { view: false, manage: false },
    users: { manage: false },
    aiBooking: true,
    /** طابور طلبات الحجز من بوابة المرضى */
    bookingRequests: true,
  },
  [ROLES.DOCTOR]: {
    dashboard: true,
    appointments: { view: true, create: false, edit: false },
    patients: { view: true, create: false, edit: false, notes: true },
    billing: false,
    inventory: false,
    reports: false,
    settings: true,
    procedures: { view: true, manage: true },
    users: { manage: false },
    aiBooking: false,
    bookingRequests: false,
  },
  [ROLES.ADMIN]: {
    dashboard: true,
    appointments: { view: true, create: true, edit: true },
    patients: { view: true, create: true, edit: true, notes: true },
    billing: { view: true, create: true, reports: true },
    inventory: true,
    reports: true,
    settings: true,
    procedures: { view: true, manage: false },
    users: { manage: true },
    aiBooking: true,
    bookingRequests: true,
  },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [{ user: sessionUser, token: sessionToken }, setSession] = useState(initAuthSession);
  const user = sessionUser;
  const role = user?.role || ROLES.RECEPTIONIST;
  const perms = useMemo(() => {
    const defaults = PERMS[role] || {};
    if (user?.access && typeof user.access === "object" && !Array.isArray(user.access)) {
      return { ...defaults, ...user.access };
    }
    return defaults;
  }, [user?.access, role]);

  useEffect(() => {
    const onExpired = () => {
      setSession({ user: null, token: "" });
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("mediflow_tenant_id");
      }
    };
    window.addEventListener("mediflow:auth-expired", onExpired);
    return () => window.removeEventListener("mediflow:auth-expired", onExpired);
  }, []);

  // Proactively validate the token when the user returns to the tab after ≥5 minutes.
  // This prevents a stale/expired token from causing a mid-action 401 logout.
  const lastValidatedRef = useRef(Date.now());
  useEffect(() => {
    if (!sessionToken) return;
    const FIVE_MINUTES = 5 * 60 * 1000;
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastValidatedRef.current < FIVE_MINUTES) return;
      lastValidatedRef.current = Date.now();
      try {
        await api.getAccountMe();
      } catch (err) {
        if (err?.status === 401) {
          window.dispatchEvent(new CustomEvent("mediflow:auth-expired"));
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sessionToken]);

  const login = async (credentials) => {
    try {
      const fromStorage =
        typeof localStorage !== "undefined" ? localStorage.getItem("mediflow_tenant_id") : "";
      const fromEnv = import.meta.env.VITE_TENANT_ID;
      const explicit = credentials.tenantId;
      let raw = "";
      if (explicit !== undefined && explicit !== null) {
        raw = String(explicit).trim();
      } else {
        raw = (fromStorage || fromEnv || "").toString().trim();
      }
      const tenantId = raw || undefined;
      const payload = {
        email: String(credentials.email || credentials.username || "").trim().toLowerCase(),
        password: credentials.password,
        tenantId,
      };
      const result = await api.login(payload);
      if (result.user?.tenantId && typeof localStorage !== "undefined") {
        localStorage.setItem("mediflow_tenant_id", result.user.tenantId);
      }
      setStoredAuth(result.accessToken, result.user);
      setSession({ user: result.user, token: result.accessToken });
      return { ok: true, user: result.user };
    } catch (error) {
      return { ok: false, message: error.message || "تعذر تسجيل الدخول" };
    }
  };

  const logout = () => {
    clearStoredAuth();
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("mediflow_tenant_id");
    }
    setSession({ user: null, token: "" });
  };

  const refreshProfile = useCallback(async () => {
    if (!sessionToken) return { ok: false, message: "غير مسجّل" };
    try {
      const me = await api.getAccountMe();
      setStoredAuth(sessionToken, me);
      setSession({ user: me, token: sessionToken });
      return { ok: true, user: me };
    } catch (error) {
      return { ok: false, message: error.message || "تعذر تحديث الملف" };
    }
  }, [sessionToken]);

  const value = useMemo(
    () => ({
      role,
      user:
        user
          ? {
              ...user,
              title: user.title || ROLE_LABEL_AR[user.role] || "عضو الفريق",
              initials:
                user.initials ||
                String(user.name || "")
                  .trim()
                  .split(/\s+/)
                  .map((part) => part[0] || "")
                  .slice(0, 2)
                  .join("") ||
                "؟",
            }
          : {
              name: "زائر",
              title: "بدون جلسة",
              initials: "ز",
              doctorCode: null,
              role: ROLES.RECEPTIONIST,
            },
      perms,
      isAuthenticated: Boolean(user && sessionToken),
      login,
      logout,
      refreshProfile,
      can: (path) => {
        const parts = path.split(".");
        let cur = perms;
        for (const p of parts) {
          if (cur == null) return false;
          if (typeof cur === "boolean") return cur;
          cur = cur[p];
        }
        return Boolean(cur);
      },
    }),
    [role, user, perms, sessionToken, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
