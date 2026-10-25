import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SparklesIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XMarkIcon,
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { DAYS_AR, fmtTime } from "../../data/strings.js";
import { useAppointments } from "../../context/AppointmentsContext.jsx";
import { api } from "../../services/apiClient.js";
import { formatUserFacingError } from "../../utils/userFacingError.js";
import { COLOR_MAP, colorFromDoctorId } from "../../utils/doctorColors.js";

/** Quarter-hour slots 08:00–21:45 (matches calendar grid). */
const TIME_SLOT_OPTIONS = (() => {
  const out = [];
  for (let h = 8; h <= 21.75 + 1e-9; h += 0.25) out.push(Math.round(h * 4) / 4);
  return out;
})();

const DEFAULT_VISIT_TYPES = [
  "فحص عام",
  "متابعة",
  "استشارة",
  "استشارة جراحية",
  "جلسة علاج طبيعي",
  "تنظيف أسنان",
  "بوتوكس تجميلي",
  "حقن تجميلي",
  "خلع سن",
  "حشو",
  "تقويم أسنان",
  "ألم حاد",
  "متابعة ما بعد العملية",
  "فحص دوري",
  "تحاليل",
  "أخرى",
];

const INPUT_PLACEHOLDER =
  "مثال: «موعد لراما الكاتب بوتوكس تجميلي مع د. رامي الإثنين 4 العصر» — اضغط تحليل. يدعم اللهجات والأرقام العربية والغداً/بعد غد.";

function timeSlotGroupLabel(h) {
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const TIME_GROUPS = [
  { key: "morning", title: "صباحاً 6–12" },
  { key: "afternoon", title: "ظهراً 12–5" },
  { key: "evening", title: "مساءً 5–10" },
];

export default function AiBookingCard({
  onMagicPreview,
  onMagicClear,
  onDraftChange,
  inputId = "ai-booking-input",
  doctors = null,
  patients = null,
  doctorsLoading = false,
  doctorsError = "",
  /** Sunday-based week anchor — passed to createAppointment */
  calendarWeekStart = null,
  /** Extra visit labels from clinic procedures */
  visitTypeOptions = null,
}) {
  const doctorsList = Array.isArray(doctors) ? doctors : [];
  const patientsList = Array.isArray(patients) ? patients : [];
  const visitExtras = Array.isArray(visitTypeOptions) ? visitTypeOptions : [];

  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [successFx, setSuccessFx] = useState(false);
  const [parseError, setParseError] = useState("");
  const { addAppointment } = useAppointments();
  const [aiActive, setAiActive] = useState(false);

  useEffect(() => {
    onDraftChange?.(text);
    setParseError("");
  }, [text, onDraftChange]);

  const canAnalyze =
    Boolean(text.trim()) && doctorsList.length > 0 && !parsing && !doctorsLoading;

  const onAnalyze = async () => {
    if (!text.trim() || doctorsList.length === 0) return;
    setParsing(true);
    setAiActive(true);
    setParseError("");
    try {
      const parsed = await api.parseBookingWithAi({
        text: text.trim(),
        referenceDateIso: new Date().toISOString(),
        doctors: doctorsList.map((d) => ({ id: d.id, name: d.name, dept: d.dept })),
        patients: patientsList.map((p) => ({ name: p.name })),
      });
      setPreview(parsed);
      setPreviewNonce((n) => n + 1);
      onMagicPreview?.(parsed);
    } catch (err) {
      const msg =
        formatUserFacingError(err) ||
        "تعذر تحليل النص عبر الذكاء الاصطناعي. تحقق من المفتاح والشبكة ثم أعد المحاولة.";
      setParseError(msg);
    } finally {
      setParsing(false);
      setAiActive(false);
    }
  };

  const dismissPreview = () => {
    setPreview(null);
    onMagicClear?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ai-card rounded-2xl shadow-card overflow-hidden border border-surface-high/80"
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-3 flex-wrap">
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/85 text-white grid place-items-center shadow-card overflow-hidden shrink-0"
          >
            <SparklesIcon className="w-5 h-5" />
          </motion.div>
          <div className="flex-1 min-w-[200px]">
            <h3 className="h3">الحجز الذكي بالذكاء الاصطناعي</h3>
            <p className="text-sm text-ink-variant mt-1 leading-relaxed">
              اكتب بحرية بالعربية: المريض، الطبيب، نوع الزيارة، اليوم والوقت. يُرسل النص للخادم للتحليل ثم تعدّل النتيجة هنا
              دون نوافذ منبثقة.
            </p>
          </div>
        </div>

        {doctorsLoading && (
          <p className="mt-3 text-xs text-ink-mute font-medium">جارٍ تحميل قائمة الأطباء من النظام…</p>
        )}
        {!doctorsLoading && doctorsError && (
          <p className="mt-3 text-xs text-danger font-medium">{doctorsError}</p>
        )}
        {!doctorsLoading && !doctorsError && doctorsList.length === 0 && (
          <p className="mt-3 text-xs text-warn font-medium">
            لا يوجد أطباء في النظام أو لا تملك صلاحية عرضهم. أضف مستخدمين بدور طبيب أو راجع الصلاحيات.
          </p>
        )}

        <div className="mt-4 flex items-stretch gap-2 flex-wrap md:flex-nowrap">
          <div className="flex-1 min-w-[260px] relative">
            <textarea
              id={inputId}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onAnalyze();
                }
              }}
              rows={3}
              placeholder={INPUT_PLACEHOLDER}
              className={`w-full rounded-xl border border-surface-high magic-input px-4 py-3 text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary focus:shadow-glow transition resize-none ${
                parsing ? "ai-processing-border" : ""
              }`}
            />
            {parseError && (
              <p className="mt-2 text-xs text-danger font-medium leading-relaxed">{parseError}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={!canAnalyze}
            className="btn-primary h-auto py-3 px-5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 rounded-xl"
          >
            {parsing ? (
              <>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse [animation-delay:140ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse [animation-delay:280ms]" />
                </span>
                يعالج الطلب
              </>
            ) : (
              <>
                تحليل بالذكاء الاصطناعي
                <ArrowLeftIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        {aiActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 h-1 rounded-full overflow-hidden bg-primary-soft/70"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-secondary to-primary"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
            />
          </motion.div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {preview && (
          <SmartBookingPreview
            key={previewNonce}
            preview={preview}
            doctors={doctorsList}
            visitExtras={visitExtras}
            calendarWeekStart={calendarWeekStart}
            onDismiss={dismissPreview}
            onLiveEdit={onMagicPreview}
            onConfirm={async (edited) => {
              const result = await addAppointment(
                {
                  patient: edited.patient,
                  doctor: edited.doctorId,
                  day: edited.day,
                  start: edited.start,
                  duration: edited.duration,
                  reason: edited.reason,
                  visitType: edited.visitType || edited.reason,
                  urgent: edited.urgent,
                },
                {
                  weekStart: calendarWeekStart,
                  ...(edited.confirmOptions || {}),
                }
              );
              if (!result?.ok) return result;
              dismissPreview();
              setText("");
              setParseError("");
              setSuccessFx(true);
              setTimeout(() => setSuccessFx(false), 1600);
              return result;
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successFx && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-secondary/25 bg-secondary-soft/30 px-5 py-3 flex items-center gap-2"
          >
            <CheckCircleIcon className="w-5 h-5 text-secondary shrink-0" />
            <span className="text-sm font-semibold text-ink">تم إنشاء الموعد بنجاح</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SmartBookingPreview({
  preview,
  doctors,
  visitExtras,
  calendarWeekStart,
  onDismiss,
  onConfirm,
  onLiveEdit,
}) {
  const [form, setForm] = useState(preview);
  const [overrideConflict, setOverrideConflict] = useState(false);
  const [repeatOverbookConfirm, setRepeatOverbookConfirm] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    setForm(preview);
    setOverrideConflict(false);
    setRepeatOverbookConfirm(false);
    setSubmitError("");
  }, [preview]);

  const doctorName = doctors.find((d) => d.id === form.doctorId)?.name || form.doctorName;
  const doctorColorKey =
    doctors.find((d) => d.id === form.doctorId)?.color || colorFromDoctorId(form.doctorId);
  const doctorSwatch = COLOR_MAP[doctorColorKey] || COLOR_MAP.blue;
  const { getConflictsForDraft } = useAppointments();
  const conflictInfo = useMemo(
    () =>
      getConflictsForDraft({
        day: form.day,
        start: form.start,
        duration: form.duration,
        doctor: form.doctorId,
        visitType: form.visitType || form.reason,
        reason: form.reason,
      }),
    [form, getConflictsForDraft]
  );
  const hasConflict = conflictInfo.conflicts.length > 0;

  useEffect(() => {
    onLiveEdit?.(form);
  }, [form, onLiveEdit]);

  const visitTypes = useMemo(() => {
    const merged = [...DEFAULT_VISIT_TYPES, ...visitExtras];
    const v = (form.visitType || form.reason || "").trim();
    if (v && !merged.includes(v)) merged.unshift(v);
    return [...new Set(merged.filter(Boolean))];
  }, [visitExtras, form.visitType, form.reason]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="border-t border-surface-high bg-surface-low/25"
    >
      <div className="p-5 md:p-6 flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="flex-1 min-w-0 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-bold text-ink">نتيجة التحليل — راجع وعدّل</h4>
                <p className="text-xs text-ink-mute mt-0.5">كل الحقول داخل البطاقة؛ اختر الوقت من الشبكة أدناه.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="btn-ghost h-9 px-3 text-xs gap-1.5 rounded-lg border border-surface-high"
            >
              <XMarkIcon className="w-4 h-4" />
              إلغاء المعاينة
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FieldBlock icon={UserIcon} label="المريض" confidence={preview.conf.patient}>
              <input
                className="input h-10 rounded-xl"
                value={form.patient}
                onChange={(e) => setForm((f) => ({ ...f, patient: e.target.value }))}
              />
            </FieldBlock>
            <FieldBlock icon={UserIcon} label="الطبيب" confidence={preview.conf.doctor}>
              <div className="flex flex-wrap gap-2">
                {doctors.map((d) => {
                  const key = d.color || colorFromDoctorId(d.id);
                  const c = COLOR_MAP[key] || COLOR_MAP.blue;
                  const active = form.doctorId === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, doctorId: d.id }))}
                      className={`inline-flex items-center gap-2 min-h-10 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                        active
                          ? `${c.bg} ${c.border} ${c.text} shadow-sm ring-2 ring-current`
                          : "border-surface-high bg-surface-low/70 text-ink hover:border-primary/35 hover:bg-primary-soft/25"
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/60 shadow-sm ${c.bar}`} />
                      <span className="truncate">{d.name}</span>
                    </button>
                  );
                })}
              </div>
            </FieldBlock>
            <FieldBlock icon={ClipboardDocumentListIcon} label="سبب الزيارة" confidence={preview.conf.reason}>
              <input
                className="input h-10 rounded-xl"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </FieldBlock>
            <FieldBlock icon={ClipboardDocumentListIcon} label="نوع الزيارة" confidence={preview.conf.reason}>
              <select
                className="input h-10 rounded-xl"
                value={form.visitType || form.reason}
                onChange={(e) => setForm((f) => ({ ...f, visitType: e.target.value }))}
              >
                {visitTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FieldBlock>
            <FieldBlock icon={CalendarDaysIcon} label="اليوم" confidence={preview.conf.day}>
              <select
                className="input h-10 rounded-xl"
                value={form.day}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setForm((f) => ({ ...f, day: d, dayLabel: DAYS_AR[d]?.label || f.dayLabel }));
                }}
              >
                {DAYS_AR.map((d, idx) => (
                  <option key={d.key} value={idx}>
                    {d.label}
                  </option>
                ))}
              </select>
            </FieldBlock>
            <FieldBlock icon={ClockIcon} label="المدة" confidence={preview.conf.time}>
              <select
                className="input h-10 rounded-xl"
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
              >
                <option value={0.5}>30 دقيقة</option>
                <option value={1}>ساعة</option>
                <option value={1.5}>ساعة ونصف</option>
                <option value={2}>ساعتان</option>
              </select>
            </FieldBlock>
          </div>

          <div className="rounded-2xl border border-surface-high bg-surface-base/80 p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-ink">اختر وقت البدء</span>
              </div>
              <span className="text-xs font-semibold text-primary tabular-nums">{fmtTime(form.start)}</span>
            </div>
            <TimeSlotGrid value={form.start} onChange={(h) => setForm((f) => ({ ...f, start: h }))} />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-surface-high bg-surface-base/60 px-4 py-3">
            <input
              type="checkbox"
              className="w-4 h-4 accent-danger rounded"
              checked={form.urgent}
              onChange={(e) => setForm((f) => ({ ...f, urgent: e.target.checked }))}
            />
            <span className="text-sm text-ink font-medium">حالة عاجلة</span>
          </label>

          {hasConflict ? (
            <div className="p-4 rounded-2xl border border-danger/35 bg-danger-soft/50 text-sm text-ink-variant space-y-3">
              <div className="flex gap-2">
                <CheckCircleIcon className="w-5 h-5 text-danger shrink-0" />
                <div>
                  هذا الوقت محجوز لـ {doctorName}. يمكن المتابعة كحجز فوق الطاقة بعد التأكيد.
                </div>
              </div>
              {conflictInfo.suggestedStart != null && (
                <button
                  type="button"
                  className="btn-ghost h-9 px-3 text-xs rounded-lg"
                  onClick={() => {
                    setForm((f) => ({ ...f, start: conflictInfo.suggestedStart }));
                    setSubmitError("");
                  }}
                >
                  أقرب وقت متاح: {fmtTime(conflictInfo.suggestedStart)}
                </button>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-warn"
                  checked={overrideConflict}
                  onChange={(e) => setOverrideConflict(e.target.checked)}
                />
                متابعة الحجز رغم التعارض
              </label>
              {overrideConflict && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-danger"
                    checked={repeatOverbookConfirm}
                    onChange={(e) => setRepeatOverbookConfirm(e.target.checked)}
                  />
                  أؤكد مجددًا عند تكرار overbooking بنفس الخانة
                </label>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-secondary-soft/60 to-primary-soft/30 border border-secondary/20 text-sm text-ink-variant flex gap-3">
              <CheckCircleIcon className="w-5 h-5 text-secondary shrink-0" />
              <span>
                لا يوجد تعارض محلي مع مواعيد الأسبوع الحالي لـ {doctorName}. قد يطبق الخادم جدول الطبيب عند الحفظ.
              </span>
            </div>
          )}

          {submitError && <div className="text-xs text-danger font-semibold">{submitError}</div>}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" onClick={onDismiss} className="btn-ghost rounded-xl">
              تجاهل
            </button>
            <button
              type="button"
              onClick={async () => {
                if (hasConflict && !overrideConflict) {
                  setSubmitError("يلزم تأكيد الحجز فوق الطاقة قبل الإرسال.");
                  return;
                }
                const result = await onConfirm({
                  ...form,
                  confirmOptions: {
                    allowOverride: hasConflict,
                    confirmRepeatedOverbook: repeatOverbookConfirm,
                  },
                });
                if (result?.ok === false) {
                  if (result.code === "REQUIRES_REPEAT_CONFIRMATION") {
                    setSubmitError("هذه الخانة مزدحمة بالفعل بـ overbooking. فعّل التأكيد الثاني.");
                  } else {
                    setSubmitError(result.message || "تعذر تثبيت الموعد.");
                  }
                }
              }}
              className="btn-primary rounded-xl px-6"
            >
              تأكيد وإنشاء الموعد
            </button>
          </div>
        </div>

        <aside className="lg:w-[min(100%,320px)] shrink-0 lg:sticky lg:top-4 self-stretch">
          <div className="h-full rounded-2xl border border-primary/20 bg-gradient-to-b from-primary-soft/50 via-surface-base to-surface-base p-5 shadow-sm flex flex-col gap-4">
            <div className="label-caps text-primary">ملخص سريع</div>
            <div className="space-y-3 text-sm">
              <SummaryRow label="المريض" value={form.patient} />
              <SummaryRow
                label="الطبيب"
                value={
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/50 ${doctorSwatch.bar}`}
                    />
                    <span className="break-words">{doctorName}</span>
                  </span>
                }
              />
              <SummaryRow label="اليوم" value={DAYS_AR[form.day]?.label || form.dayLabel} />
              <SummaryRow label="الوقت" value={fmtTime(form.start)} />
              <SummaryRow label="المدة" value={`${form.duration * 60} د`} />
              <SummaryRow label="السبب" value={form.reason} />
            </div>
            <div className="mt-auto pt-2 border-t border-surface-high/80">
              <p className="text-[11px] text-ink-mute leading-relaxed">
                الأسبوع المعروض في التقويم يبدأ من{" "}
                {calendarWeekStart
                  ? new Intl.DateTimeFormat("ar-SY-u-ca-gregory-nu-latn", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    }).format(calendarWeekStart)
                  : "اليوم"}
                .
              </p>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-ink-mute uppercase tracking-wide">{label}</div>
      <div className="text-ink font-semibold mt-0.5 leading-snug break-words">{value || "—"}</div>
    </div>
  );
}

function FieldBlock({ icon: Icon, label, confidence, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface-mid/50 text-ink-mute grid place-items-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <span className="label-caps truncate">{label}</span>
        </div>
        <ConfBadge level={confidence} />
      </div>
      {children}
    </div>
  );
}

function TimeSlotGrid({ value, onChange }) {
  return (
    <div className="max-h-[min(280px,42vh)] overflow-y-auto overscroll-contain pe-1 space-y-4">
      {TIME_GROUPS.map(({ key, title }) => {
        const slots = TIME_SLOT_OPTIONS.filter((h) => timeSlotGroupLabel(h) === key);
        if (!slots.length) return null;
        return (
          <div key={key}>
            <div className="text-[10px] font-bold text-ink-mute mb-2 tracking-wide">{title}</div>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((h) => {
                const active = Math.abs(h - value) < 0.001;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onChange(h)}
                    className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold transition-all border ${
                      active
                        ? "bg-primary text-white border-primary shadow-md scale-[1.02]"
                        : "bg-surface-low/80 text-ink border-surface-high hover:border-primary/40 hover:bg-primary-soft/30"
                    }`}
                  >
                    {fmtTime(h)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConfBadge({ level }) {
  if (level === "high") return <span className="chip bg-secondary-soft text-secondary text-[10px]">دقة عالية</span>;
  if (level === "medium") return <span className="chip bg-warn-soft text-warn text-[10px]">متوسطة</span>;
  return <span className="chip bg-surface-mid text-ink-mute text-[10px]">افتراضي</span>;
}
