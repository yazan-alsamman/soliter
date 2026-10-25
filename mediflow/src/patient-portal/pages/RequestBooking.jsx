import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LightBulbIcon } from "@heroicons/react/24/outline";
import { PORTAL_SERVICES, PORTAL_DOCTORS } from "../data/mockPortalData.js";
import { usePatientPortalAuth } from "../context/PatientPortalAuthContext.jsx";

export default function RequestBooking() {
  const { isAuthenticated } = usePatientPortalAuth();
  const location = useLocation();
  const preset = location.state || {};

  const [serviceId, setServiceId] = useState(preset.serviceId || PORTAL_SERVICES[0].id);
  const [doctorId, setDoctorId] = useState(preset.doctorId || "");
  const [windowPref, setWindowPref] = useState("صباحاً");
  const [dayPref, setDayPref] = useState("الأسبوع القادم");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const aiHint = useMemo(() => {
    const svc = PORTAL_SERVICES.find((s) => s.id === serviceId);
    const dm = svc?.durationMinutes ?? svc?.durationMin ?? 45;
    return `اقتراح تجريبي: لخدمة «${svc?.name || ""}» نحتاج عادةً نحو ${dm} دقيقة متصلة. تُعرض أقرب الفجوات بعد الإرسال للاستقبال — دون تأكيد آلي.`;
  }, [serviceId]);

  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">طلب موعد</h1>
        <p className="mt-2 text-slate-600 text-sm">
          هذا نموذج <strong>طلب</strong> وليس تأكيداً فورياً. يصل لطابور الاستقبال للمراجعة والموافقة.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-8 text-center space-y-4">
          <div className="text-lg font-bold text-emerald-900">تم استلام طلبك</div>
          <p className="text-emerald-800 text-sm">
            سيُشعرك الاستقبال بعد المراجعة. يمكن للموظفين متابعة الطلب من صفحة «طلبات الحجز».
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link to="/portal/dashboard" className="px-5 py-2.5 rounded-xl bg-[#0e7490] text-white font-bold">
              لوحتي
            </Link>
            <Link to="/portal" className="px-5 py-2.5 rounded-xl border border-emerald-200 font-semibold text-emerald-900">
              الرئيسية
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-900/5 space-y-5">
          {!isAuthenticated ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              يُفضّل{" "}
              <Link className="font-bold underline" to="/portal/login">
                تسجيل الدخول
              </Link>{" "}
              لتتبع الطلب. يمكنك الإرسال كزائر في هذا النموذج التجريبي.
            </p>
          ) : null}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">الخدمة</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {PORTAL_SERVICES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ~{s.durationMin} د
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">تفضيل الطبيب</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">بدون تفضيل — يقرر الاستقبال</option>
              {PORTAL_DOCTORS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">الفترة</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
                value={windowPref}
                onChange={(e) => setWindowPref(e.target.value)}
              >
                <option>صباحاً</option>
                <option>بعد الظهر</option>
                <option>مساءً</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">اليوم المفضل</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 bg-white"
                value={dayPref}
                onChange={(e) => setDayPref(e.target.value)}
              >
                <option>الأسبوع القادم</option>
                <option>خلال يومين</option>
                <option>مرن — حسب توفر الطبيب</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">ملاحظات</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 min-h-[100px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="حساسية، أدوية، مواعيد عملك…"
            />
          </div>

          <div className="rounded-xl bg-[#f0fdfa] border border-teal-100 p-4 flex gap-3">
            <LightBulbIcon className="w-8 h-8 text-[#0e7490] shrink-0" />
            <div>
              <div className="text-xs font-bold text-[#0f766e] uppercase">مساعد ذكي — اقتراح فقط</div>
              <p className="mt-1 text-sm text-slate-700 leading-relaxed">{aiHint}</p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-[#0e7490] text-white font-bold text-lg hover:bg-[#0f766e] shadow-lg shadow-teal-900/10"
          >
            إرسال الطلب
          </button>
        </form>
      )}
    </div>
  );
}
