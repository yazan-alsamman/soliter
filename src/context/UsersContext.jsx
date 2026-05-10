/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/apiClient.js";
import { useAuth } from "./AuthContext.jsx";

const UsersContext = createContext(null);
const takeItems = (payload) => (Array.isArray(payload) ? payload : payload?.items || []);
const normalizeInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .map((part) => part[0] || "")
    .slice(0, 2)
    .join("") || "؟";
const mapUser = (user) => ({
  ...user,
  username: user.email,
  active: user.active ?? true,
  initials: normalizeInitials(user.name),
  doctorId: user.doctorCode || null,
});

export function UsersProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setUsers([]);
      setError("");
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError("");
    api
      .getUsers()
      .then((list) => {
        if (!cancelled) {
          setUsers(takeItems(list || []).map(mapUser));
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setUsers([]);
          setError(err?.message || "تعذر تحميل بيانات المستخدمين");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const createUser = async (payload) => {
    try {
      const created = await api.createUser({
        name: payload.name,
        title: payload.title,
        email: payload.email,
        password: payload.tempPassword || "SyriaDemo2026!",
        role: payload.role,
        doctorCode: payload.role === "doctor" ? payload.doctorId || undefined : undefined,
      });
      const mapped = mapUser(created);
      setUsers((prev) => [mapped, ...prev]);
      return { ok: true, user: mapped };
    } catch (error) {
      return { ok: false, message: error.message || "تعذر إنشاء الحساب" };
    }
  };

  const updateUser = async (id, patch) => {
    try {
      const updated = await api.updateUser(id, {
        name: patch.name,
        title: patch.title,
        email: patch.email,
        role: patch.role,
        active: patch.active,
        doctorCode: patch.doctorId,
        ...(patch.access !== undefined ? { access: patch.access } : {}),
      });
      const mapped = mapUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === id ? mapped : u)));
      return { ok: true, user: mapped };
    } catch (error) {
      return { ok: false, message: error.message || "تعذر تحديث الحساب" };
    }
  };

  const toggleUserActive = async (id) => {
    try {
      const updated = await api.toggleUserActive(id);
      const mapped = mapUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === id ? mapped : u)));
      return { ok: true, user: mapped };
    } catch (error) {
      return { ok: false, message: error.message || "تعذر تغيير حالة الحساب" };
    }
  };

  const value = useMemo(
    () => ({ users, isLoading, error, createUser, updateUser, toggleUserActive }),
    [users, isLoading, error]
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsers must be used within UsersProvider");
  return ctx;
}
