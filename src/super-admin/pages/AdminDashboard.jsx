import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { superAdminApi } from "../superAdminApi.js";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await superAdminApi.metrics();
        if (!cancelled) setData(m);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) return <div className="text-sm text-rose-600">{err}</div>;
  if (!data) return <div className="text-sm text-slate-500">Loading metrics…</div>;

  return (
    <div className="space-y-8" dir="ltr">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Global dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Cross-tenant overview (read-only aggregates).</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[
          ["Total clinics", data.totalClinics],
          ["Active", data.activeClinics],
          ["Suspended", data.suspendedClinics],
          ["Trial", data.trialClinics],
          ["Users (all clinics)", data.totalUsers],
          ["Patients", data.totalPatients],
          ["Appointments today", data.appointmentsToday],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm h-72">
          <div className="text-sm font-semibold text-slate-800 mb-2">Appointments (7 days)</div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.activitySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0f172a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm h-72">
          <div className="text-sm font-semibold text-slate-800 mb-2">Clinics by status</div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.clinicsByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="value" fill="#334155" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
