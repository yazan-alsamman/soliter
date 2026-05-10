import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { syncDb } from './syncDb.js';
import { enqueueOutbox, flushOutbox, pullRemoteChanges } from './syncEngine.js';
import { getStoredToken, probeBackendReachable } from '../services/apiClient.js';

/** @type {import('react').Context<null | ReturnType<typeof buildSyncValue>>} */
const SyncContext = createContext(null);

function buildSyncValue() {
  return {
    syncDb,
    enqueueOutbox,
    flushOutbox,
    pullRemoteChanges,
  };
}

/**
 * Offline-first sync primitives + lightweight UI state (expand with Dexie live hooks later).
 */
export function SyncProvider({ children }) {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  /** Backend actually reachable (fetch OK). False when Wi‑Fi drops but `navigator.onLine` stays true. */
  const [apiReachable, setApiReachable] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastError, setLastError] = useState(/** @type {string | null} */ (null));
  const [lastSyncedAt, setLastSyncedAt] = useState(/** @type {string | null} */ (null));
  const [syncing, setSyncing] = useState(false);

  const refreshCounts = useCallback(async () => {
    const pending = await syncDb.outbox.where('status').equals('pending').count();
    const failed = await syncDb.outbox.where('status').equals('failed').count();
    setPendingCount(pending);
    setFailedCount(failed);
  }, []);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    const up = () => setBrowserOnline(true);
    const down = () => {
      setBrowserOnline(false);
      setApiReachable(false);
    };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const runReachabilityProbe = useCallback(async () => {
    if (!getStoredToken()) {
      setApiReachable(true);
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setApiReachable(false);
      return;
    }
    const ok = await probeBackendReachable();
    setApiReachable(ok);
  }, []);

  useEffect(() => {
    void runReachabilityProbe();
    const id = window.setInterval(() => void runReachabilityProbe(), 8000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void runReachabilityProbe();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [runReachabilityProbe]);

  useEffect(() => {
    const onBrowserOnline = () => void runReachabilityProbe();
    window.addEventListener('online', onBrowserOnline);
    return () => window.removeEventListener('online', onBrowserOnline);
  }, [runReachabilityProbe]);

  const online =
    !getStoredToken() ? browserOnline : browserOnline && apiReachable;

  const syncNow = useCallback(async () => {
    const token = getStoredToken();
    if (!token || !online) return { ok: false, reason: 'offline_or_logged_out' };
    setSyncing(true);
    setLastError(null);
    try {
      await pullRemoteChanges();
      const push = await flushOutbox();
      setLastSyncedAt(new Date().toISOString());
      setApiReachable(true);
      await refreshCounts();
      return { ok: true, push };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      void runReachabilityProbe();
      return { ok: false, error: msg };
    } finally {
      setSyncing(false);
    }
  }, [online, refreshCounts, runReachabilityProbe]);

  useEffect(() => {
    const onUp = () => {
      void syncNow();
    };
    window.addEventListener('online', onUp);
    return () => window.removeEventListener('online', onUp);
  }, [syncNow]);

  useEffect(() => {
    if (!online || !getStoredToken()) return undefined;
    const t = window.setInterval(() => {
      void syncNow();
    }, 120000);
    return () => window.clearInterval(t);
  }, [online, syncNow]);

  const value = useMemo(
    () => ({
      ...buildSyncValue(),
      online,
      pendingCount,
      failedCount,
      lastError,
      lastSyncedAt,
      syncing,
      syncHealth:
        failedCount > 0 ? 'degraded' : !online ? 'offline' : syncing ? 'syncing' : 'ok',
      refreshCounts,
      syncNow,
    }),
    [
      online,
      pendingCount,
      failedCount,
      lastError,
      lastSyncedAt,
      syncing,
      refreshCounts,
      syncNow,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
