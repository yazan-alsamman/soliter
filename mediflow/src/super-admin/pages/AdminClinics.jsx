import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { adminBasePath } from "../adminPaths.js";
import { superAdminApi } from "../superAdminApi.js";
import { fmtDateTimeLatn, fmtNumberAr } from "../../data/strings.js";

export default function AdminClinics() {
  const { pathname } = useLocation();
  const adminBase = useMemo(() => adminBasePath(pathname), [pathname]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await superAdminApi.listTenants({
        search: search.trim() || undefined,
        status: status || undefined,
        take: 50,
      });
      setRows(res.items || []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn) => {
    setMsg("");
    try {
      await fn();
      await load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="space-y-4" dir="ltr">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clinics</h1>
          <p className="text-sm text-slate-500">{fmtNumberAr(total)} total</p>
        </div>
        <Link
          to={`${adminBase}/create-clinic`}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Create clinic
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Search by name"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[200px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="trial">trial</option>
          <option value="suspended">suspended</option>
        </select>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          onClick={() => load()}
        >
          Refresh
        </button>
      </div>
      {msg ? <div className="text-sm text-rose-600">{msg}</div> : null}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Patients</th>
              <th className="px-4 py-3">Last activity</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-slate-500">
                  No clinics found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.status}</td>
                  <td className="px-4 py-3 text-slate-600">{r.plan}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtNumberAr(r.userCount)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtNumberAr(r.patientCount)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.lastActivityAt ? fmtDateTimeLatn(r.lastActivityAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      onClick={() =>
                        act(() => superAdminApi.suspendTenant(r.id))
                      }
                    >
                      Suspend
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      onClick={() =>
                        act(() => superAdminApi.reactivateTenant(r.id))
                      }
                    >
                      Activate
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-rose-600 hover:text-rose-800"
                      onClick={() => {
                        if (window.confirm("هل تريد أرشفة هذه العيادة (حذف ناعم)؟")) {
                          act(() => superAdminApi.deleteTenant(r.id));
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
