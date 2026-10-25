import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { usePatientPortalAuth } from "../context/PatientPortalAuthContext.jsx";

export default function PortalLogin() {
  const { isAuthenticated, loginWithOtp } = usePatientPortalAuth();
  const [phone, setPhone] = useState("0993001122");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [msg, setMsg] = useState("");

  if (isAuthenticated) return <Navigate to="/portal/dashboard" replace />;

  const sendOtp = (e) => {
    e.preventDefault();
    setMsg("");
    if (!/^09\d{8}$/.test(phone.replace(/\s/g, ""))) {
      setMsg("استخدم صيغة 09xxxxxxxx");
      return;
    }
    setStep("otp");
    setMsg("تجريبي: أدخل أي رمز 4–6 أرقام للمتابعة.");
  };

  const verify = (e) => {
    e.preventDefault();
    const r = loginWithOtp(phone, otp);
    if (!r.ok) setMsg(r.message || "تعذر التحقق");
    else setMsg("");
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">دخول المرضى</h1>
      <p className="mt-2 text-sm text-slate-600">
        توثيق تجريبي برقم الجوال وOTP. لاحقاً: SMS حقيقي، سياسات امتثال، وحصر الجلسات.
      </p>
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-900/5 space-y-4">
        {step === "phone" ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">رقم الجوال</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-base dir-ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xxxxxxxx"
                dir="ltr"
              />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-[#0e7490] text-white font-bold hover:bg-[#0f766e]">
              إرسال رمز التحقق
            </button>
            <p className="text-xs text-center text-slate-500">
              Google وباقي مزوّدي SSO يُضافون لاحقاً على الطبقة نفسها من السياسات.
            </p>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <button type="button" className="text-sm font-semibold text-[#0e7490]" onClick={() => setStep("phone")}>
              ← تغيير الرقم
            </button>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">رمز التحقق</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-lg tracking-widest dir-ltr"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="••••"
                dir="ltr"
              />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800">
              تأكيد الدخول
            </button>
          </form>
        )}
        {msg ? (
          <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2" dir="auto">
            {msg}
          </p>
        ) : null}
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">
        موظف؟{" "}
        <Link to="/login" className="font-bold text-[#0e7490] hover:underline">
          تسجيل دخول الموظفين
        </Link>
      </p>
    </div>
  );
}
