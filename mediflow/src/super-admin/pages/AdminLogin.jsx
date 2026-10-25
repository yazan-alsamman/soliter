import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSuperAdminAuth } from "../SuperAdminAuthContext.jsx";
import { translateUserFacingMessage } from "../../utils/userFacingError.js";

export default function AdminLogin() {
  const { isAuthenticated, login } = useSuperAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("owner@mediflow.saas");
  const [password, setPassword] = useState("MediFlowSuper2026!");
  const [error, setError] = useState("");

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const res = await login({ email, password });
    if (!res.ok) {
      setError(translateUserFacingMessage(res.message || "", {}));
      return;
    }
    setError("");
    navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-100 p-4" dir="ltr">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-5"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">MediFlow SaaS</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Super admin</h1>
          <p className="text-sm text-slate-500 mt-1">Operator console — not for clinic staff.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error ? (
          <div className="text-sm text-rose-600" dir="auto">
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
