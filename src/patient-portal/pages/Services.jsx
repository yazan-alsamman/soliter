import { Link } from "react-router-dom";
import { PORTAL_SERVICES, PORTAL_DOCTORS } from "../data/mockPortalData.js";

export default function PortalServices() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">الخدمات</h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          أسعار ومدة تقريبية — يتم التثبيت عند تأكيد الاستقبال. لا يوجد حجز نهائي آلي من هذه الصفحة.
        </p>
      </div>
      <div className="grid gap-6">
        {PORTAL_SERVICES.map((s) => {
          const doctors = PORTAL_DOCTORS.filter((d) => s.doctorIds.includes(d.id));
          return (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col lg:flex-row lg:items-center gap-6"
            >
              <div className="flex-1">
                <span className="text-xs font-bold text-[#0e7490]">{s.category}</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{s.name}</h2>
                <p className="mt-2 text-slate-600">{s.teaser}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <span className="px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-700">{s.durationMin} دقيقة</span>
                  <span className="px-3 py-1 rounded-full bg-[#ecfeff] font-bold text-[#0e7490]">
                    من {s.priceFrom.toLocaleString("ar-SY")} ل.س
                  </span>
                </div>
              </div>
              <div className="lg:w-56 shrink-0">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">أطباء مرتبطون</div>
                <ul className="text-sm text-slate-700 space-y-1">
                  {doctors.map((d) => (
                    <li key={d.id}>{d.name}</li>
                  ))}
                </ul>
                <Link
                  to="/portal/request"
                  state={{ serviceId: s.id }}
                  className="mt-4 block text-center py-2.5 rounded-xl bg-[#0e7490] text-white font-bold hover:bg-[#0f766e]"
                >
                  طلب موعد
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
