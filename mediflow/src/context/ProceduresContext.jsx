/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/apiClient.js";
import { useAuth } from "./AuthContext.jsx";

const ProceduresContext = createContext(null);
const takeItems = (payload) => (Array.isArray(payload) ? payload : payload?.items || []);
const mapProcedure = (row) => ({
  id: row.id,
  doctorId: row.doctorId || null,
  name: row.name,
  price: Number(row.price) || 0,
  duration: Number(row.durationMinutes || 60) / 60,
  category: row.category || "general",
  aliases: row.aliases || [],
  active: row.active !== false,
});

export function ProceduresProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [procedures, setProcedures] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setProcedures([]);
      return;
    }
    let cancelled = false;
    api
      .getServices()
      .then((rows) => {
        if (!cancelled) setProcedures(takeItems(rows || []).map(mapProcedure));
      })
      .catch(() => {
        if (!cancelled) setProcedures([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const createProcedure = async (doctorId, payload) => {
    try {
      const created = await api.createService({
        doctorId,
        name: payload.name,
        price: Number(payload.price),
        durationMinutes: Math.max(1, Math.round(Number(payload.duration) * 60)),
        category: payload.category || "general",
        aliases: String(payload.aliases || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        active: payload.active ?? true,
      });
      const mapped = mapProcedure(created);
      setProcedures((prev) => [mapped, ...prev]);
      return { ok: true, procedure: mapped };
    } catch (error) {
      return { ok: false, message: error.message || "تعذر إنشاء الإجراء" };
    }
  };

  const updateProcedure = async (id, patch) => {
    try {
      const updated = await api.updateService(id, {
        name: patch.name,
        price: patch.price != null ? Number(patch.price) : undefined,
        durationMinutes: patch.duration != null ? Math.max(1, Math.round(Number(patch.duration) * 60)) : undefined,
        category: patch.category,
        aliases: patch.aliases,
        active: patch.active,
        doctorId: patch.doctorId,
      });
      const mapped = mapProcedure(updated);
      setProcedures((prev) => prev.map((p) => (p.id === id ? mapped : p)));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message || "تعذر تحديث الإجراء" };
    }
  };

  const deleteProcedure = async (id) => {
    await api.deleteService(id);
    setProcedures((prev) => prev.filter((p) => p.id !== id));
  };

  const getProceduresByDoctor = (doctorId, includeInactive = false) =>
    procedures.filter((p) => p.doctorId === doctorId && (includeInactive || p.active));

  const value = useMemo(
    () => ({
      procedures,
      createProcedure,
      updateProcedure,
      deleteProcedure,
      getProceduresByDoctor,
    }),
    [procedures]
  );

  return <ProceduresContext.Provider value={value}>{children}</ProceduresContext.Provider>;
}

export function useProcedures() {
  const ctx = useContext(ProceduresContext);
  if (!ctx) throw new Error("useProcedures must be used within ProceduresProvider");
  return ctx;
}
