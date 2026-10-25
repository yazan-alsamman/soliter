import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/apiClient.js";
import { fmtDateInvoice } from "../data/strings.js";
import { useAuth } from "./AuthContext.jsx";

const BillingContext = createContext(null);
const takeItems = (payload) => (Array.isArray(payload) ? payload : payload?.items || []);
const mapInvoice = (row) => ({
  id: row.id,
  patient: row.patient?.name || row.patientName || "—",
  patientId: row.patientId || null,
  appointmentId: row.appointmentId || null,
  date: row.createdAt ? fmtDateInvoice(row.createdAt) : "اليوم",
  amount: Number(row.finalAmount ?? row.totalAmount ?? 0),
  paidAmount: Number(row.totalPaid ?? (row.status === "paid" ? row.finalAmount ?? row.totalAmount : 0)),
  balance: Number(row.balance ?? 0),
  status: ["draft", "paid", "partial"].includes(row.status) ? row.status : "draft",
  services: row.services || [],
  payments: row.payments || [],
  paymentMethod: row.payments?.[row.payments.length - 1]?.method || null,
});

export function BillingProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setInvoices([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        // limit:100 ensures we see more than the default 50-record cap on initial load
        const rows = await api.getInvoices({ limit: 100 });
        if (!cancelled) setInvoices(takeItems(rows).map(mapInvoice));
      } catch {
        if (!cancelled) setInvoices([]);
      }
    };
    load();
    // Polling is now handled by PollingCoordinator (single 15s interval shared
    // across all contexts — avoids thundering herd on tab focus).
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const addInvoice = (payload) => {
    const newInvoice = {
      id: `local-${Date.now()}`,
      patient: payload.patient,
      date: payload.date || "اليوم",
      amount: Number(payload.amount) || 0,
      status: payload.status || "unpaid",
    };
    setInvoices((arr) => [newInvoice, ...arr]);
    return newInvoice;
  };

  const updateInvoice = (id, patch) => {
    setInvoices((arr) => arr.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)));
  };

  const ensureDraftInvoiceForAppointment = (payload) => {
    return invoices.find((inv) => inv.appointmentId === payload.appointmentId) || null;
  };

  const recordPayment = async (id, patch) => {
    const paid = await api.payInvoice(id, {
      paidAmount: Number(patch.paidAmount) || undefined,
      method: patch.method || patch.paymentMethod || undefined,
      reference: patch.reference || undefined,
    });
    const mapped = mapInvoice(paid);
    setInvoices((arr) => arr.map((inv) => (inv.id === id ? mapped : inv)));
    return mapped;
  };

  const deleteInvoice = (id) => {
    setInvoices((arr) => arr.filter((inv) => inv.id !== id));
  };

  const refreshInvoices = useCallback(async () => {
    try {
      const rows = await api.getInvoices({ limit: 100 });
      setInvoices(takeItems(rows).map(mapInvoice));
    } catch {
      // ignore transient refresh errors — PollingCoordinator will retry
    }
  }, []);

  const value = useMemo(
    () => ({ invoices, addInvoice, updateInvoice, deleteInvoice, ensureDraftInvoiceForAppointment, recordPayment, refreshInvoices }),
    [invoices, refreshInvoices]
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within BillingProvider");
  return ctx;
}
