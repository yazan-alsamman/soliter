import { useState } from "react";
import {
  BOOKING_REQUEST_STATUS,
  useBookingRequests,
} from "../context/BookingRequestsContext.jsx";
import { SparklesIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

function badge(status) {
  if (status === BOOKING_REQUEST_STATUS.pending)
    return "bg-amber-100 text-amber-900 border-amber-200";
  if (status === BOOKING_REQUEST_STATUS.ai_reviewed)
    return "bg-violet-100 text-violet-900 border-violet-200";
  if (status === BOOKING_REQUEST_STATUS.approved)
    return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (status === BOOKING_REQUEST_STATUS.rejected) return "bg-rose-100 text-rose-900 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function labelStatus(status) {
  const map = {
    [BOOKING_REQUEST_STATUS.pending]: "بانتظار المراجعة",
    [BOOKING_REQUEST_STATUS.ai_reviewed]: "اقتراح ذكي جاهز",
    [BOOKING_REQUEST_STATUS.approved]: "تمت الموافقة",
    [BOOKING_REQUEST_STATUS.rejected]: "مرفوض",
  };
  return map[status] || status;
}

export default function BookingRequestsQueue() {
  const { requests, runAiSuggestion, approveRequest, rejectRequest } = useBookingRequests();
  const [filter, setFilter] = useState("active");

  const list = requests.filter((r) => {
    if (filter === "active")
      return r.status === BOOKING_REQUEST_STATUS.pending || r.status === BOOKING_REQUEST_STATUS.ai_reviewed;
    if (filter === "done")
      return r.status === BOOKING_REQUEST_STATUS.approved || r.status === BOOKING_REQUEST_STATUS.rejected;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="label-caps text-primary">استقبال — طابور الحجز</div>
          <h1 className="h2 mt-1">طلبات المواعيد من بوابة المرضى</h1>
          <p className="text-sm text-ink-mute mt-2 max-w-2xl leading-relaxed">
            نموذج تشغيلي: الطلبات تصل كـ «طلب» وليس موعداً نهائياً. استخدم اقتراح الذكاء الاصطناعي ثم وافق يدوياً أو ارفض مع سبب. لاحقاً: ربط كامل بالـ API وسجل تدقيق.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: "active", label: "النشطة" },
            { id: "done", label: "المغلقة" },
            { id: "all", label: "الكل" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                filter === t.id
                  ? "bg-primary text-white border-primary"
                  : "bg-surface-base border-surface-high text-ink-variant hover:bg-surface-low"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5">
        {list.length === 0 ? (
          <div className="card-pad text-center text-ink-mute py-16">لا توجد عناصر في هذا الفلتر.</div>
        ) : (
          list.map((r) => (
            <article
              key={r.id}
              className="card-pad border border-surface-high shadow-sm flex flex-col xl:flex-row gap-6"
            >
              <div className="flex-1 space-y-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${badge(r.status)}`}>
                    {labelStatus(r.status)}
                  </span>
                  <span className="text-xs text-ink-mute flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    {r.createdAt.toLocaleString("ar-SY")}
                  </span>
                </div>
                <div className="text-lg font-bold text-ink truncate">{r.patientName}</div>
                <div className="text-sm text-ink-variant dir-ltr">{r.phone}</div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-ink-mute">الخدمة:</span>{" "}
                    <span className="font-semibold text-ink">{r.serviceName}</span>
                  </div>
                  <div>
                    <span className="text-ink-mute">الطبيب المفضل:</span>{" "}
                    <span className="font-semibold text-ink">{r.doctorPreference}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-ink-mute">الوقت المفضل:</span>{" "}
                    <span className="font-semibold text-ink">{r.preferredWindow}</span>
                  </div>
                  {r.notes ? (
                    <div className="sm:col-span-2 text-ink-variant bg-surface-low/60 rounded-xl px-3 py-2">
                      {r.notes}
                    </div>
                  ) : null}
                </div>

                {(r.status === BOOKING_REQUEST_STATUS.pending || r.status === BOOKING_REQUEST_STATUS.ai_reviewed) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {r.status === BOOKING_REQUEST_STATUS.pending && (
                      <button
                        type="button"
                        className="btn-primary inline-flex items-center gap-2 text-sm py-2"
                        onClick={() => runAiSuggestion(r.id)}
                      >
                        <SparklesIcon className="w-4 h-4" />
                        تشغيل اقتراح AI
                      </button>
                    )}
                    {r.status === BOOKING_REQUEST_STATUS.ai_reviewed && r.aiSlots?.length ? (
                      <>
                        {r.aiSlots.map((slot, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={slot.conflict}
                            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border ${
                              slot.conflict
                                ? "opacity-40 cursor-not-allowed border-danger/30 text-danger"
                                : "border-primary/30 text-primary hover:bg-primary-soft"
                            }`}
                            onClick={() => !slot.conflict && approveRequest(r.id, slot.label)}
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            اعتماد: {slot.label}
                          </button>
                        ))}
                      </>
                    ) : null}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-danger/40 text-danger hover:bg-danger-soft"
                      onClick={() =>
                        rejectRequest(r.id, "لا يتوفر موعد ضمن التفضيلات — سيتم التواصل بالبدائل")
                      }
                    >
                      <XCircleIcon className="w-4 h-4" />
                      رفض
                    </button>
                  </div>
                )}
              </div>

              <aside className="xl:w-80 shrink-0 rounded-2xl bg-surface-low/50 border border-surface-high p-4 space-y-3">
                <div className="text-xs font-bold text-ink-mute uppercase">لوحة المساعد الذكي</div>
                {r.aiConfidence != null ? (
                  <div>
                    <div className="text-sm font-bold text-ink">ثقة النموذج</div>
                    <div className="mt-1 h-2 rounded-full bg-surface-high overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-violet-500 to-primary rounded-full"
                        style={{ width: `${Math.round(r.aiConfidence * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-ink-mute mt-1">{Math.round(r.aiConfidence * 100)}٪ — توضيح بشري مطلوب دائماً</div>
                  </div>
                ) : (
                  <p className="text-sm text-ink-variant">لم يُشغَّل الاقتراح بعد. يعمل على جداول العيادة المعرَّفة في النظام.</p>
                )}
                {r.aiExplanation ? (
                  <p className="text-sm text-ink leading-relaxed border-t border-surface-high pt-3">{r.aiExplanation}</p>
                ) : null}
                <div className="text-[11px] text-ink-mute leading-snug border-t border-surface-high pt-3">
                  تعارض محتمل · تحميل الطبيب · وقت الراحة · الطوارئ — تُعرض كتحذيرات عند ربط التقويم الحقيقي.
                </div>
              </aside>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
