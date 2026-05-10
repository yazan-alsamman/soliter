/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "mediflow_portal_session";

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.phone) return null;
    return parsed;
  } catch {
    return null;
  }
}

const PatientPortalAuthContext = createContext(null);

export function PatientPortalAuthProvider({ children }) {
  const [session, setSession] = useState(() => (typeof localStorage !== "undefined" ? loadSession() : null));

  const loginWithOtp = useCallback((phone, otp) => {
    if (!/^09\d{8}$/.test(phone.replace(/\s/g, ""))) return { ok: false, message: "رقم الجوال غير صالح (09xxxxxxxx)" };
    if (!/^\d{4,6}$/.test(otp)) return { ok: false, message: "رمز التحقق غير صالح" };
    const next = {
      phone: phone.replace(/\s/g, ""),
      name: "مريض تجريبي",
      verifiedAt: new Date().toISOString(),
    };
    setSession(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.phone),
      loginWithOtp,
      logout,
    }),
    [session, loginWithOtp, logout],
  );

  return <PatientPortalAuthContext.Provider value={value}>{children}</PatientPortalAuthContext.Provider>;
}

export function usePatientPortalAuth() {
  const ctx = useContext(PatientPortalAuthContext);
  if (!ctx) throw new Error("usePatientPortalAuth must be used within PatientPortalAuthProvider");
  return ctx;
}
