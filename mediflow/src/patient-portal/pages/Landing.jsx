import { Link } from "react-router-dom";
import { ArrowRightIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { PORTAL_SERVICES, PORTAL_DOCTORS, PORTAL_OFFERS, PORTAL_TESTIMONIALS } from "../data/mockPortalData.js";

export default function PortalLanding() {
  const heroOffer = PORTAL_OFFERS[0];
  return (
    <div className="space-y-16">
      <section className="grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e0f2fe] text-[#0369a1] text-xs font-bold mb-4">
            <ShieldCheckIcon className="w-4 h-4" />
            حجز بطلب — تأكيد من الاستقبال
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
            عيادتك الرقمية <span className="text-[#0e7490]">بتجربة هادئة وموثوقة</span>
          </h1>
          <p className="mt-4 text-slate-600 text-lg leading-relaxed max-w-xl">
            اختر الخدمة والطبيب والوقت المناسب لك. نستلم طلبك، نقترح بدائل ذكية، ويؤكد فريق الاستقبال الموعد —
            دون ضغط أو تعقيد.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/portal/request"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0e7490] text-white font-bold shadow-lg shadow-teal-900/15 hover:bg-[#0f766e] transition-colors"
            >
              اطلب موعداً الآن
              <ArrowRightIcon className="w-5 h-5 rtl:rotate-180" />
            </Link>
            <Link
              to="/portal/services"
              className="inline-flex items-center px-6 py-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-800 hover:border-[#99f6e4] hover:bg-[#f0fdfa]"
            >
              تصفح الخدمات
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            نموذج طلب — لا يُنشئ موعداً نهائياً حتى موافقة العيادة.
          </p>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-100/80 to-indigo-100/60 rounded-[2rem] blur-2xl -z-10" />
          <div className="rounded-[1.75rem] border border-white/80 bg-white p-6 shadow-xl shadow-slate-900/10">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">عرض سريع</div>
            <div className="text-lg font-bold text-slate-900">{heroOffer.title}</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#0e7490]">{heroOffer.price.toLocaleString("ar-SY")}</span>
              <span className="text-sm text-slate-400 line-through">{heroOffer.was.toLocaleString("ar-SY")}</span>
              <span className="text-xs text-slate-500">ل.س</span>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">{heroOffer.terms}</p>
            <Link to="/portal/offers" className="mt-5 inline-block text-sm font-bold text-[#0e7490] hover:underline">
              كل العروض ←
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">خدمات مختارة</h2>
            <p className="text-sm text-slate-600 mt-1">مدة وأسعار تقريبية — التثبيت عند التأكيد</p>
          </div>
          <Link to="/portal/services" className="text-sm font-bold text-[#0e7490] hover:underline shrink-0">
            الكل
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PORTAL_SERVICES.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-cyan-100 transition-all"
            >
              <div className="text-xs font-semibold text-[#0e7490] uppercase">{s.category}</div>
              <h3 className="mt-2 font-bold text-slate-900">{s.name}</h3>
              <p className="mt-2 text-sm text-slate-600 line-clamp-2">{s.teaser}</p>
              <div className="mt-4 flex justify-between items-center text-sm">
                <span className="text-slate-500">{s.durationMin} دقيقة</span>
                <span className="font-bold text-slate-900">من {s.priceFrom.toLocaleString("ar-SY")}</span>
              </div>
              <Link to="/portal/request" state={{ serviceId: s.id }} className="mt-4 block text-center py-2 rounded-xl bg-slate-50 font-semibold text-[#0e7490] hover:bg-[#ecfeff]">
                أرسل طلباً
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        {PORTAL_DOCTORS.map((d) => (
          <div key={d.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 grid place-items-center text-lg font-black text-[#0e7490]">
              {d.name.replace(/^د\.\s*/, "").slice(0, 1)}
            </div>
            <h3 className="mt-4 font-bold text-slate-900">{d.name}</h3>
            <p className="text-sm text-[#0e7490] font-semibold mt-1">{d.title}</p>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">{d.bio}</p>
            <div className="mt-4 flex flex-wrap gap-1">
              {d.tags.map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] bg-slate-900 text-white p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
        <h2 className="text-2xl font-bold relative">آراء المرضى</h2>
        <div className="mt-8 grid sm:grid-cols-2 gap-6 relative">
          {PORTAL_TESTIMONIALS.map((t, i) => (
            <blockquote key={i} className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm">
              <p className="text-slate-100 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-4 text-sm text-cyan-200 font-semibold">
                {t.name} · {t.city}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>
    </div>
  );
}
