import { useEffect, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useAppointments } from "./AppointmentsContext.jsx";
import { useBilling } from "./BillingContext.jsx";
import { usePatients } from "./PatientsContext.jsx";

/**
 * Single polling coordinator that replaces the separate setInterval timers
 * previously living inside AppointmentsContext, BillingContext, and PatientsContext.
 *
 * Benefits:
 * - One timer instead of four — no thundering herd when the browser tab regains focus
 * - Promise.allSettled means one failing refresh does not block the others
 * - Tab visibility aware: triggers an immediate refresh when the tab becomes visible
 *   (rather than waiting for the next interval tick with stale data)
 */
const POLL_INTERVAL_MS = 15_000;

export function PollingCoordinator() {
  const { isAuthenticated } = useAuth();
  const { refreshAppointments } = useAppointments();
  const { refreshInvoices }     = useBilling();
  const { refreshPatients }     = usePatients();

  // Keep refresh functions in a ref so the interval callback always calls the
  // latest version without needing to restart the interval on every render.
  const refreshRef = useRef({ refreshAppointments, refreshInvoices, refreshPatients });
  useEffect(() => {
    refreshRef.current = { refreshAppointments, refreshInvoices, refreshPatients };
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    const tick = () =>
      Promise.allSettled([
        refreshRef.current.refreshAppointments(),
        refreshRef.current.refreshInvoices(),
        refreshRef.current.refreshPatients(),
      ]);

    const timer = window.setInterval(tick, POLL_INTERVAL_MS);

    // Refresh immediately when the user returns to the tab so they don't wait
    // up to 15s for fresh data after switching away.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAuthenticated]);

  return null;
}
