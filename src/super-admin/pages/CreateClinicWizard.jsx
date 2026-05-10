import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { superAdminApi } from "../superAdminApi.js";
import { fmtClinicRef } from "../../data/strings.js";
import { formatUserFacingError } from "../../utils/userFacingError.js";

const steps = ["Clinic", "Admin", "Plan", "Review"];

export default function CreateClinicWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [clinicName, setClinicName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [plan, setPlan] = useState("basic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const draftRef = useRef({
    clinicName: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    plan: "basic",
  });

  useEffect(() => {
    draftRef.current = { clinicName, adminName, adminEmail, adminPassword, plan };
  }, [clinicName, adminName, adminEmail, adminPassword, plan]);

  const next = () => {
    setError("");
    if (step === 0 && clinicName.trim().length < 2) {
      setError("اسم العيادة مطلوب (حرفان على الأقل).");
      return;
    }
    if (step === 1) {
      if (adminName.trim().length < 2) {
        setError("اسم مسؤول العيادة مطلوب.");
        return;
      }
      if (!adminEmail.includes("@")) {
        setError("يرجى إدخال بريد إلكتروني صالح لمسؤول العيادة.");
        return;
      }
      if (adminPassword.length < 8) {
        setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const d = draftRef.current;
      const body = {
        clinicName: String(d.clinicName ?? "").trim(),
        adminName: String(d.adminName ?? "").trim(),
        adminEmail: String(d.adminEmail ?? "").trim().toLowerCase(),
        adminPassword: String(d.adminPassword ?? ""),
        plan: d.plan === "pro" ? "pro" : "basic",
      };
      const res = await superAdminApi.createTenant(body);
      setResult(res);
    } catch (e) {
      setError(formatUserFacingError(e));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-lg space-y-4" dir="ltr">
        <h1 className="text-xl font-bold text-slate-900">Clinic created</h1>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 space-y-1">
          <div>
            <span className="font-medium">Tenant:</span> {result.tenantName}
          </div>
          <div>
            <span className="font-medium">Admin email:</span> {result.adminEmail}
          </div>
          <div className="font-mono text-xs break-all space-y-1">
            <div>
              <span className="font-medium font-sans">Short:</span> {fmtClinicRef(result.tenantId)}
            </div>
            <div>
              <span className="font-medium font-sans">Tenant ID (full, clinic app login):</span> {result.tenantId}
            </div>
          </div>
          <div>
            <span className="font-medium">Plan:</span> {result.plan}
          </div>
          <p className="text-emerald-800 pt-2">{result.message}</p>
          <p className="text-emerald-900/90 text-xs pt-1">
            Staff log in at the clinic app: paste this Tenant ID on the login screen (optional if the email is
            unique), or leave defaults — the app resolves the correct clinic when the email is unique.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => navigate("../clinics")}
        >
          Back to clinics
        </button>
      </div>
    );
  }

  return (
    <form
      className="max-w-xl space-y-6"
      dir="ltr"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === steps.length - 1 && !busy) void submit();
      }}
    >
      <div>
        <h1 className="text-xl font-bold text-slate-900">Create clinic</h1>
        <p className="text-sm text-slate-500 mt-1">Provision tenant, admin, and default services.</p>
      </div>
      <div className="flex gap-2 text-xs font-medium text-slate-500">
        {steps.map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-lg border px-2 py-2 text-center ${
              i === step ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {step === 0 ? (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Clinic name</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            placeholder="e.g. Downtown Medical Center"
          />
        </div>
      ) : null}
      {step === 1 ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Admin full name</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Admin email</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Temporary password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
          </div>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Plan</label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="basic">basic</option>
            <option value="pro">pro</option>
          </select>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
          <div>
            <span className="font-medium">Clinic:</span> {clinicName}
          </div>
          <div>
            <span className="font-medium">Admin:</span> {adminName} ({adminEmail})
          </div>
          <div>
            <span className="font-medium">Plan:</span> {plan}
          </div>
          <p className="text-slate-500 pt-2">
            Backend will create the tenant, admin user, and two default services (consultation, basic treatment).
          </p>
        </div>
      ) : null}
      <div className="flex gap-2">
        {step > 0 ? (
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            onClick={back}
          >
            Back
          </button>
        ) : null}
        {step < steps.length - 1 ? (
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={next}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Provisioning…" : "Provision clinic"}
          </button>
        )}
      </div>
    </form>
  );
}
