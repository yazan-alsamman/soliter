import { useCallback, useEffect, useState } from "react";
import { superAdminApi } from "../superAdminApi.js";
import { fmtDateInvoice } from "../../data/strings.js";

export default function AdminSubscriptions() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setMsg("");
    try {
      const res = await superAdminApi.listTenants({ take: 100 });
      setRows(res.items || []);
    } catch (e) {
      setMsg(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id, body) => {
    setMsg("");
    try {
      await superAdminApi.patchTenant(id, body);
      await load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="space-y-4" dir="ltr">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Subscriptions</h1>
        <p className="text-sm text-slate-500">Light billing view — manual plan and subscription status.</p>
      </div>
      {msg ? <div className="text-sm text-rose-600">{msg}</div> : null}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Clinic</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Subscription</th>
              <th className="px-4 py-3">Next billing</th>
              <th className="px-4 py-3">Ops status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                    value={r.plan}
                    onChange={(e) => patch(r.id, { plan: e.target.value })}
                  >
                    <option value="basic">basic</option>
                    <option value="pro">pro</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                    value={r.subscriptionStatus}
                    onChange={(e) => patch(r.id, { subscriptionStatus: e.target.value })}
                  >
                    <option value="trial">trial</option>
                    <option value="active">active</option>
                    <option value="expired">expired</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {r.nextBillingDate ? fmtDateInvoice(r.nextBillingDate) : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
