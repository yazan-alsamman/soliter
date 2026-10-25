import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/apiClient.js";
import { useAuth } from "./AuthContext.jsx";

const PatientsContext = createContext(null);
const takeItems = (payload) => (Array.isArray(payload) ? payload : payload?.items || []);

function mapPatient(row) {
  if (!row) return null;
  const vitalsRaw = row.vitals && typeof row.vitals === "object" ? row.vitals : {};
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    phone: row.phone || "",
    sexKey: row.sex === "female" ? "female" : "male",
    sex: row.sexLabel || (row.sex === "female" ? "أنثى" : "ذكر"),
    age: row.age ?? 0,
    bloodType: row.bloodType || "O+",
    status: row.status || "new",
    lastVisit: row.lastVisit || "—",
    nextAppointment: row.nextAppointment || "—",
    allergies: Array.isArray(row.allergies) ? row.allergies : [],
    meds: Array.isArray(row.meds) ? row.meds : [],
    notes: row.notes || "",
    vitals: {
      bp: vitalsRaw.bp ?? "120/80",
      hr: Number(vitalsRaw.hr) || 72,
      spo2: Number(vitalsRaw.spo2) || 98,
    },
    dob: row.dob || null,
  };
}

export function PatientsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPatients = useCallback(async () => {
    try {
      // limit:100 ensures we see more than the default 50-record cap
      const rows = await api.getPatients({ limit: 100 });
      setPatients(takeItems(rows).map(mapPatient));
    } catch {
      // ignore transient errors — PollingCoordinator will retry
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setPatients([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await api.getPatients({ limit: 100 });
        if (!cancelled) setPatients(takeItems(rows).map(mapPatient));
      } catch {
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    // Polling removed — PollingCoordinator handles the single shared 15s interval.
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const searchPatients = useCallback(async (q) => {
    const rows = await api.getPatients({ q, limit: 20 });
    return takeItems(rows).map(mapPatient);
  }, []);

  const fetchPatientById = useCallback(async (patientId) => {
    const row = await api.getPatient(patientId);
    return mapPatient(row);
  }, []);

  const addPatient = async (payload) => {
    const ageRaw = payload.age;
    const ageNum =
      ageRaw != null && ageRaw !== "" ? Number(ageRaw) : Number.NaN;
    const body = {
      name: payload.name,
      phone: payload.phone || payload.mobile || "000000",
      notes: payload.notes ?? "",
      sex: payload.sex === "female" ? "female" : "male",
      bloodType: payload.bloodType || "O+",
      status: payload.status || "new",
      allergies: payload.allergies || [],
      medications: payload.medications || [],
      ...(Number.isFinite(ageNum) ? { age: ageNum } : {}),
      ...(payload.vitals ? { vitals: payload.vitals } : {}),
      ...(payload.quickRegistration ? { quickRegistration: true } : {}),
    };
    const created = await api.createPatient(body);
    const mapped = mapPatient(created);
    setPatients((arr) => [mapped, ...arr]);
    return mapped;
  };

  const updatePatient = async (id, patch) => {
    const updated = await api.updatePatient(id, {
      name: patch.name,
      phone: patch.phone,
      notes: patch.notes ?? "",
      sex: patch.sex === "female" ? "female" : "male",
      bloodType: patch.bloodType,
      status: patch.status,
      age: patch.age != null ? Number(patch.age) : undefined,
      allergies: patch.allergies,
      medications: patch.medications,
      vitals: patch.vitals,
    });
    const mapped = mapPatient(updated);
    setPatients((arr) => arr.map((p) => (p.id === id ? mapped : p)));
    return mapped;
  };

  const deletePatient = async (id) => {
    await api.deletePatient(id);
    setPatients((arr) => arr.filter((p) => p.id !== id));
  };

  const getPatientPackages = useCallback(async (id) => {
    const rows = await api.getPatientPackages(id);
    return rows || [];
  }, []);

  const createPatientPackage = useCallback(async (id, payload) => {
    return api.createPatientPackage(id, payload);
  }, []);

  const value = useMemo(
    () => ({
      patients,
      addPatient,
      updatePatient,
      deletePatient,
      searchPatients,
      isLoading,
      refreshPatients,
      getPatientPackages,
      createPatientPackage,
      fetchPatientById,
    }),
    [patients, searchPatients, isLoading, refreshPatients, getPatientPackages, createPatientPackage, fetchPatientById]
  );

  return (
    <PatientsContext.Provider value={value}>{children}</PatientsContext.Provider>
  );
}

export function usePatients() {
  const ctx = useContext(PatientsContext);
  if (!ctx) throw new Error("usePatients must be used within PatientsProvider");
  return ctx;
}
