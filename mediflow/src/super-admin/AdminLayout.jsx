import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSuperAdminAuth } from "./SuperAdminAuthContext.jsx";
import { superAdminApi } from "./superAdminApi.js";
import { adminBasePath } from "./adminPaths.js";
import { useEffect, useMemo, useState } from "react";

const nav = [
  { segment: "", label: "Dashboard", end: true, exact: false },
  { segment: "clinics", label: "Clinics", end: false, exact: true },
  { segment: "create-clinic", label: "Create clinic", end: false, exact: true },
  { segment: "subscriptions", label: "Subscriptions", end: false, exact: true },
  { segment: "audit", label: "Audit logs", end: false, exact: true },
  { segment: "health", label: "System health", end: false, exact: true },
];

export default function AdminLayout() {
  const { user, logout } = useSuperAdminAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = useMemo(() => adminBasePath(pathname), [pathname]);
  const [healthDot, setHealthDot] = useState("bg-emerald-500");

  const isNavActive = (segment, end, exact) => {
    const href = segment === "" ? base : `${base}/${segment}`;
    if (segment === "") {
      return pathname === base || pathname === `${base}/`;
    }
    if (exact || end) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const go = (segment) => {
    const href = segment === "" ? base : `${base}/${segment}`;
    navigate(href);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await superAdminApi.health();
        if (!cancelled) setHealthDot(h?.database?.status === "up" ? "bg-emerald-500" : "bg-rose-500");
      } catch {
        if (!cancelled) setHealthDot("bg-rose-500");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900" dir="ltr">
      <div className="flex min-h-screen">
        <aside className="w-56 shrink-0 border-r border-slate-200 bg-white px-3 py-6 flex flex-col gap-1">
          <div className="px-2 pb-4 border-b border-slate-100 mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">MediFlow</div>
            <div className="text-sm font-bold text-slate-800">Super Admin</div>
          </div>
          {nav.map((item) => (
            <button
              key={item.segment || "index"}
              type="button"
              className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition ${
                isNavActive(item.segment, item.end, item.exact)
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => go(item.segment)}
            >
              {item.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            type="button"
            className="text-left rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
            onClick={() => navigate("/login")}
          >
            Clinic app login
          </button>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className={`h-2 w-2 rounded-full ${healthDot}`} title="DB probe" />
              <span>System</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-700">{user?.email}</span>
              <button
                type="button"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
                onClick={() => {
                  logout();
                  navigate("/admin/login", { replace: true });
                }}
              >
                Log out
              </button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
