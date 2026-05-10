import { Link } from "react-router-dom";
import { ClockIcon } from "@heroicons/react/24/outline";
import { PORTAL_OFFERS } from "../data/mockPortalData.js";

function fmtRemaining(ms) {
  const d = Math.ceil(ms / 86400000);
  if (d <= 0) return "ينتهي اليوم";
  return `${d} يوم متبقي`;
}

export default function PortalOffers() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">العروض والباقات</h1>
        <p className="mt-2 text-slate-600">جلسات وباقات محددة المدة. الشروط تظهر على كل بطاقة.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {PORTAL_OFFERS.map((o) => {
          const left = o.endsAt - Date.now();
          return (
            <div
              key={o.id}
              className="rounded-[1.5rem] border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white p-6 shadow-md shadow-amber-900/5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900 leading-snug">{o.title}</h2>
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-lg">
                  <ClockIcon className="w-4 h-4" />
                  {fmtRemaining(left)}
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#b45309]">{o.price.toLocaleString("ar-SY")}</span>
                <span className="text-sm text-slate-400 line-through">{o.was.toLocaleString("ar-SY")}</span>
                <span className="text-xs text-slate-500">ل.س</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-700">{o.sessions} جلسات / دفعة واحدة</p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{o.terms}</p>
              <Link
                to="/portal/request"
                state={{ offerId: o.id }}
                className="mt-6 inline-flex justify-center w-full py-3 rounded-xl bg-[#0e7490] text-white font-bold hover:bg-[#0f766e]"
              >
                أرسل طلباً لهذا العرض
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
