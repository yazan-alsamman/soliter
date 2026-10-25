import { Link } from "react-router-dom";
import { PORTAL_DOCTORS, PORTAL_SERVICES } from "../data/mockPortalData.js";

export default function PortalDoctors() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">الأطباء</h1>
        <p className="mt-2 text-slate-600">تعرّف على الفريق. الطلب يظل مراجعةً بشرية قبل التأكيد النهائي.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {PORTAL_DOCTORS.map((d) => {
          const svcs = PORTAL_SERVICES.filter((s) => s.doctorIds.includes(d.id));
          return (
            <div key={d.id} className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm flex flex-col">
              <div className="h-24 bg-gradient-to-l from-[#0e7490] to-[#06b6d4]" />
              <div className="px-6 -mt-10 pb-6 flex-1 flex flex-col">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg grid place-items-center text-2xl font-black text-[#0e7490]">
                  {d.name.replace(/^د\.\s*/, "").slice(0, 1)}
                </div>
                <h2 className="mt-4 text-lg font-bold text-slate-900">{d.name}</h2>
                <p className="text-sm font-semibold text-[#0e7490]">{d.title}</p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed flex-1">{d.bio}</p>
                <div className="mt-4">
                  <div className="text-xs font-bold text-slate-400 uppercase">خدمات شائعة</div>
                  <ul className="mt-2 text-sm text-slate-700 space-y-1">
                    {svcs.map((s) => (
                      <li key={s.id}>{s.name}</li>
                    ))}
                  </ul>
                </div>
                <Link
                  to="/portal/request"
                  state={{ doctorId: d.id }}
                  className="mt-6 block text-center py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  طلب مع هذا الطبيب
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
