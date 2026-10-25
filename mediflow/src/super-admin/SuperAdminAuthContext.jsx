/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { superAdminApi, setSuperAuth, clearSuperAuth, getSuperUser } from "./superAdminApi.js";
import { formatUserFacingError } from "../utils/userFacingError.js";

const SuperAdminAuthContext = createContext(null);

export function SuperAdminAuthProvider({ children }) {
  const [user, setUser] = useState(() => getSuperUser());

  const isAuthenticated = Boolean(user);

  const login = useCallback(async (credentials) => {
    try {
      const result = await superAdminApi.login({
        email: String(credentials.email || "").trim().toLowerCase(),
        password: credentials.password,
      });
      setSuperAuth(result.accessToken, result.user);
      setUser(result.user);
      return { ok: true, user: result.user };
    } catch (e) {
      return { ok: false, message: formatUserFacingError(e) };
    }
  }, []);

  const logout = useCallback(() => {
    clearSuperAuth();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      logout,
    }),
    [user, isAuthenticated, login, logout]
  );

  return <SuperAdminAuthContext.Provider value={value}>{children}</SuperAdminAuthContext.Provider>;
}

export function useSuperAdminAuth() {
  const ctx = useContext(SuperAdminAuthContext);
  if (!ctx) throw new Error("useSuperAdminAuth must be used within SuperAdminAuthProvider");
  return ctx;
}
