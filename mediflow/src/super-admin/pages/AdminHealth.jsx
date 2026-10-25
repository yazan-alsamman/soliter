import { useEffect, useState } from "react";
import { superAdminApi } from "../superAdminApi.js";

export default function AdminHealth() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await superAdminApi.health();
        if (!cancelled) setData(h);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) return <div className="text-sm text-rose-600">{err}</div>;
  if (!data) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4 max-w-2xl" dir="ltr">
      <h1 className="text-xl font-bold text-slate-900">System health</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">API</span>
          <span className="font-medium text-emerald-700">{data.api.status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Database</span>
          <span className={`font-medium ${data.database.status === "up" ? "text-emerald-700" : "text-rose-700"}`}>
            {data.database.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Last backup (mock)</span>
          <span className="font-mono text-xs text-slate-800">{data.lastBackupAt}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Error log count (placeholder)</span>
          <span className="font-medium">{data.errorLogCount}</span>
        </div>
      </div>
    </div>
  );
}
