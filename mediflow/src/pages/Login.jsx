import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fmtClinicRef } from "../data/strings.js";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("admin@sham.com");
  const [password, setPassword] = useState("SyriaDemo2026!");
  const [tenantId, setTenantId] = useState(() => {
    if (typeof localStorage === "undefined") return import.meta.env.VITE_TENANT_ID || "";
    return localStorage.getItem("mediflow_tenant_id") || import.meta.env.VITE_TENANT_ID || "";
  });
  const [error, setError] = useState("");

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    const result = await login({ email, password, tenantId });
    if (!result.ok) {
      setError(result.message || "تعذر تسجيل الدخول");
      return;
    }
    setError("");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-surface-low/60 p-4">
      <form onSubmit={submit} className="card-pad w-full max-w-md space-y-4">
        <div>
          <div className="label-caps text-primary">MediFlow</div>
          <h1 className="h2 mt-1">تسجيل الدخول</h1>
          <p className="text-sm text-ink-mute mt-1">نموذج محلي مؤقت قابل للاستبدال بواجهة API لاحقاً.</p>
        </div>
        <div>
          <label className="label-caps">البريد الإلكتروني</label>
          <input
            className="input mt-1.5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label-caps">كلمة المرور</label>
          <input
            className="input mt-1.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
        </div>
        <div>
          <label className="label-caps">معرّف العيادة (اختياري)</label>
          <input
            className="input mt-1.5 font-mono text-sm"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="UUID الكامل للعيادة"
            dir="ltr"
          />
          <p className="text-xs text-ink-mute mt-1">
            اتركه فارغاً إذا كان البريد يخص عيادة واحدة فقط. الصيغة المختصرة للعرض مثل{" "}
            <span className="font-mono" dir="ltr">
              clinic-xxxxxxxx
            </span>{" "}
            — للدخول يلزم لصق المعرف الكامل من لوحة Super Admin.
          </p>
          {tenantId.trim().length >= 32 ? (
            <p className="text-[11px] text-ink-variant mt-1 font-mono" dir="ltr">
              للعرض: {fmtClinicRef(tenantId.trim())}
            </p>
          ) : null}
        </div>
        {error ? (
          <div className="text-sm text-danger" dir="auto">
            {error}
          </div>
        ) : null}
        <button className="btn-primary w-full">دخول</button>
        <p className="text-center text-xs text-ink-mute pt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link to="/portal" className="font-semibold text-primary hover:underline">
            بوابة المرضى والحجز
          </Link>
          <span className="text-surface-high hidden sm:inline">|</span>
          <Link to="/admin/login" className="underline hover:text-primary">
            SaaS operator (super admin)
          </Link>
        </p>
      </form>
    </div>
  );
}
