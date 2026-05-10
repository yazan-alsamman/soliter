import { useCallback, useEffect, useState } from "react";
import { superAdminApi } from "../superAdminApi.js";
import { fmtDateTimeLatn, fmtNumberAr } from "../../data/strings.js";

export default function AdminAudit() {
  const [action, setAction] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setMsg("");
    try {
      const res = await superAdminApi.auditLogs({
        action: action.trim() || undefined,
        take: 100,
      });
      setRows(res.items || []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setMsg(e.message);
    }
  }, [action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4" dir="ltr">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-500">{fmtNumberAr(total)} entries (latest 100)</p>
      </div>
      <div className="flex gap-2">
        <input
          placeholder="Filter by action (e.g. CLINIC_CREATED)"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex-1 max-w-md"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          onClick={() => load()}
        >
          Apply
        </button>
      </div>
      {msg ? <div className="text-sm text-rose-600">{msg}</div> : null}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Target tenant</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  {fmtDateTimeLatn(r.createdAt)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-800">{r.action}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.actor ? (
                    <div>
                      <div>{r.actor.email}</div>
                      <div className="text-xs text-slate-400">{r.actor.role}</div>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.targetTenantId || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
