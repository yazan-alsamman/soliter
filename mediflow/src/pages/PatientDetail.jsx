import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  HeartIcon,
  PencilSquareIcon,
  CameraIcon,
  MicrophoneIcon,
  ListBulletIcon,
  BoldIcon,
  ItalicIcon,
  BookmarkSquareIcon,
  SparklesIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { usePatients } from "../context/PatientsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useProcedures } from "../context/ProceduresContext.jsx";
import { useAppointments } from "../context/AppointmentsContext.jsx";
import { fmtPatientFileId, fmtTime, isSameLocalCalendarDay } from "../data/strings.js";
import Chip from "../components/ui/Chip.jsx";

const HISTORY = [
  { date: "15 نيسان 2026", title: "استئصال الزائدة الدودية بالمنظار", body: "أُجريت العملية بنجاح بواسطة د. السعيد. تم اتباع بروتوكول التعافي السريع. لم تُسجّل أي مضاعفات في موقع الجراحة.", tag: "مكتمل" },
  { date: "08 آذار 2026", title: "مراجعة فحص الأيض الشامل", body: "تم تشخيص نقص فيتامين د (18 نانوغرام/مل). وُصف كوليكالسيفيرول 50,000 وحدة دولية أسبوعياً لمدة 8 أسابيع.", tag: null },
  { date: "20 شباط 2026", title: "تطعيم الإنفلونزا السنوي", body: "تم إعطاء الجرعة المعيارية رباعية التكافؤ في العضد الأيسر. لا توجد أعراض جانبية.", tag: null },
  { date: "14 كانون الثاني 2026", title: "تعديل الوصفة الطبية", body: "تم إيقاف السيتيريزين. بدء استخدام بخاخ الفلوتيكازون الأنفي للحساسية الموسمية.", tag: null },
];

const TABS = [
  { id: "overview", label: "نظرة عامة" },
  { id: "billing", label: "الفوترة" },
  { id: "history", label: "السجل الطبي" },
];

export default function PatientDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { patients, getPatientPackages, createPatientPackage, fetchPatientById } = usePatients();
  const { procedures } = useProcedures();
  const { items: appointments } = useAppointments();
  const [bootPatient, setBootPatient] = useState(null);

  useEffect(() => {
    if (!id) return;
    const local = patients.find((p) => p.id === id);
    if (local) {
      setBootPatient(null);
      return;
    }
    let cancelled = false;
    fetchPatientById(id)
      .then((p) => {
        if (!cancelled && p) setBootPatient(p);
      })
      .catch(() => {
        if (!cancelled) setBootPatient(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, patients, fetchPatientById]);

  const patient = patients.find((p) => p.id === id) || bootPatient;

  const [note, setNote] = useState("");
  const [tab, setTab] = useState("overview");
  const [aiState, setAiState] = useState("idle");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packageError, setPackageError] = useState("");
  const [packageForm, setPackageForm] = useState({
    serviceId: "",
    totalSessions: 6,
  });

  const patientApptsToday = useMemo(() => {
    if (!patient?.id) return [];
    const anchor = new Date();
    return appointments
      .filter(
        (a) =>
          a.patientId === patient.id &&
          a.appointmentStart &&
          isSameLocalCalendarDay(a.appointmentStart, anchor)
      )
      .sort((a, b) => a.start - b.start);
  }, [appointments, patient?.id]);

  useEffect(() => {
    if (!patient?.id) return;
    let cancelled = false;
    const loadPackages = async () => {
      setPackagesLoading(true);
      try {
        const rows = await getPatientPackages(patient.id);
        if (!cancelled) setPackages(rows || []);
      } catch (error) {
        if (!cancelled) setPackageError(error?.message || "تعذر تحميل الباقات");
      } finally {
        if (!cancelled) setPackagesLoading(false);
      }
    };
    loadPackages();
    return () => {
      cancelled = true;
    };
  }, [getPatientPackages, patient?.id]);

  const packageServices = procedures.filter((p) => p.active !== false);
  const createPackage = async () => {
    if (!patient?.id || !packageForm.serviceId) return;
    setPackageError("");
    try {
      const created = await createPatientPackage(patient.id, {
        serviceId: packageForm.serviceId,
        totalSessions: Number(packageForm.totalSessions) || 1,
      });
      setPackages((arr) => [created, ...arr]);
    } catch (error) {
      setPackageError(error?.message || "تعذر إنشاء الباقة");
    }
  };

  if (!patient) {
    return (
      <div className="card-pad text-center py-16 space-y-4">
        <p className="text-ink-mute">لم يُعثر على المريض أو لم تُحمّل البيانات بعد.</p>
        <Link to="/patients" className="btn-primary inline-flex">
          العودة لقائمة المرضى
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/patients" className="w-9 h-9 rounded-lg hover:bg-surface-low grid place-items-center">
          <ArrowRightIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="h2">{patient.name}</h1>
            <Chip tone="ok">مستقر</Chip>
          </div>
          <div className="text-sm text-ink-mute mt-1">
            العمر: {patient.age} <span className="mx-1.5">•</span> فصيلة الدم: {patient.bloodType}
            <span className="mx-1.5">•</span> رقم الملف:{" "}
            <span className="font-latin">{fmtPatientFileId(patient.id)}</span>
          </div>
        </div>
      </div>

      <div className="border-b border-surface-high flex gap-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative pb-3 text-sm font-semibold ${tab === t.id ? "text-primary" : "text-ink-mute"}`}
          >
            {t.label}
            {tab === t.id && (
              <motion.span
                layoutId="patient-detail-tab"
                className="absolute start-0 end-0 -bottom-px h-[3px] bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="card-pad">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h3 flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-primary" /> جدول اليوم للمريض
              </h2>
              <span className="label-caps">{can("patients.edit") ? "مزامنة مع المواعيد" : "عرض للقراءة فقط"}</span>
            </div>
            {patientApptsToday.length === 0 ? (
              <div className="text-sm text-ink-mute py-6 text-center">لا توجد مواعيد لهذا المريض اليوم.</div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {patientApptsToday.map((slot, i) => (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-4 rounded-lg border ${
                      slot.status === "in_consultation"
                        ? "border-primary bg-primary-soft/40"
                        : "border-surface-high bg-surface-low/60"
                    }`}
                  >
                    <div className="label-caps text-primary">
                      {slot.status === "in_consultation" ? "حالي" : fmtTime(slot.start)}
                    </div>
                    {slot.status === "in_consultation" && (
                      <div className="text-xs text-ink-mute font-semibold mt-0.5">{fmtTime(slot.start)}</div>
                    )}
                    <div className="mt-1 font-semibold text-ink">{slot.reason || slot.visitType || "زيارة"}</div>
                    <div className="text-xs text-ink-mute">{slot.status}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="card-pad">
              <div className="label-caps flex items-center gap-2 text-primary">
                <HeartIcon className="w-4 h-4" /> العلامات الحيوية
              </div>
              <Vital label="ضغط الدم" value={patient.vitals?.bp ?? "—"} unit="mmHg" />
              <Vital label="معدل النبض" value={patient.vitals?.hr ?? "—"} unit="نبضة/د" />
              <Vital label="الأكسجين (SpO₂)" value={patient.vitals?.spo2 ?? "—"} unit="%" />
            </div>
            <div className="card-pad">
              <div className="label-caps flex items-center gap-2 text-danger">
                <ExclamationTriangleIcon className="w-4 h-4" /> تنبيهات سريرية
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {patient.allergies?.length === 0 && (
                  <span className="text-sm text-ink-mute">لا توجد حساسيات معروفة.</span>
                )}
                {patient.allergies?.map((a) => (
                  <Chip key={a} tone="critical">
                    {a}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="card-pad">
              <div className="label-caps flex items-center gap-2 text-primary">
                <BeakerIcon className="w-4 h-4" /> الأدوية الفعّالة
              </div>
              <div className="mt-3 space-y-3">
                {patient.meds?.length === 0 && (
                  <div className="text-sm text-ink-mute">لا توجد وصفات فعّالة.</div>
                )}
                {patient.meds?.map((m, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <div className="text-sm font-semibold text-ink">{m.name}</div>
                      <div className="text-xs text-ink-mute">{m.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "billing" && (
        <div className="card-pad space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="h3">باقات الجلسات والفوترة</h3>
            <span className="label-caps">تتبع الجلسات والخدمات</span>
          </div>
          <p className="text-xs text-ink-mute">
            تُدار الفواتير المرتبطة بالمواعيد من صفحة المواعيد والفوترة بعد إنهاء المعاينة.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
            <select
              className="input"
              value={packageForm.serviceId}
              onChange={(e) => setPackageForm((f) => ({ ...f, serviceId: e.target.value }))}
            >
              <option value="">اختر الخدمة</option>
              {packageServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              min={1}
              max={60}
              value={packageForm.totalSessions}
              onChange={(e) => setPackageForm((f) => ({ ...f, totalSessions: e.target.value }))}
              placeholder="عدد الجلسات"
            />
            <button
              className="btn-primary"
              onClick={createPackage}
              disabled={!can("patients.edit") || !packageForm.serviceId}
            >
              إضافة باقة
            </button>
          </div>
          {packageError && <div className="text-xs text-danger font-semibold mb-3">{packageError}</div>}
          <div className="space-y-2">
            {packagesLoading && <div className="text-xs text-ink-mute">جارٍ تحميل الباقات...</div>}
            {!packagesLoading && packages.length === 0 && (
              <div className="text-xs text-ink-mute">لا توجد باقات مضافة لهذا المريض.</div>
            )}
            {packages.map((pkg) => (
              <div key={pkg.id} className="rounded-lg border border-surface-high bg-surface-low/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-ink">{pkg.service?.name || "خدمة"}</div>
                  <Chip tone={pkg.remainingSessions > 0 ? "ok" : "critical"}>
                    {pkg.remainingSessions}/{pkg.totalSessions}
                  </Chip>
                </div>
                <div className="text-xs text-ink-mute mt-1">
                  الحالة:{" "}
                  {pkg.status === "active" ? "نشطة" : pkg.status === "completed" ? "مكتملة" : "منتهية"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card-pad">
            <h3 className="h3 mb-4 flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-5 h-5 text-primary" /> السجل الطبي الزمني
            </h3>
            <ol className="relative border-s-2 border-surface-high me-3 space-y-5">
              {HISTORY.map((h, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="ps-5 relative"
                >
                  <span className="absolute -start-[9px] top-1.5 w-4 h-4 rounded-full bg-primary-soft border-4 border-surface-base" />
                  <div className="flex items-center gap-2">
                    <span className="label-caps">{h.date}</span>
                    {h.tag && <Chip tone="ok">{h.tag}</Chip>}
                  </div>
                  <div className="font-semibold text-ink mt-0.5">{h.title}</div>
                  <p className="text-sm text-ink-variant mt-1 leading-relaxed">{h.body}</p>
                </motion.li>
              ))}
            </ol>
          </div>

          <div className="card-pad">
            <div className="flex items-center justify-between mb-4">
              <h3 className="h3 flex items-center gap-2">
                <PencilSquareIcon className="w-5 h-5 text-primary" /> ملاحظات المعاينة السريرية
              </h3>
              <Chip tone="ok">حفظ تلقائي للمسودة</Chip>
            </div>

            <AiNoteHelper
              note={note}
              canUse={can("patients.notes")}
              state={aiState}
              suggestion={aiSuggestion}
              onGenerate={() => {
                if (!note.trim()) {
                  setAiState("error");
                  setAiSuggestion("أضف ملاحظات أولية أولًا ثم اطلب تحسين الصياغة.");
                  return;
                }
                setAiState("typing");
                setAiSuggestion("");
                setTimeout(() => {
                  const short = note.replace(/\s+/g, " ").trim();
                  const cleaned = short.length > 230 ? `${short.slice(0, 230)}...` : short;
                  setAiSuggestion(
                    `ملخص سريري منسّق:\n- الحالة العامة مستقرة.\n- ملخص الملاحظة: ${cleaned}\n- الخطة: متابعة خلال 7 أيام أو حسب الحاجة.`
                  );
                  setAiState("ready");
                }, 950);
              }}
              onApply={() => {
                if (!aiSuggestion.trim()) return;
                setNote(aiSuggestion);
              }}
              onReset={() => {
                setAiState("idle");
                setAiSuggestion("");
              }}
            />

            <div className="flex items-center gap-1 mb-3 text-ink-mute">
              <ToolBtn>
                <BoldIcon className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn>
                <ItalicIcon className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn>
                <ListBulletIcon className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn>
                <CameraIcon className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn>
                <MicrophoneIcon className="w-4 h-4" />
              </ToolBtn>
              <button className="ms-auto px-3 h-8 rounded-lg border border-surface-high text-xs font-semibold text-primary hover:bg-primary-soft/40">
                قوالب
              </button>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!can("patients.notes")}
              rows={9}
              placeholder={
                can("patients.notes")
                  ? "وثّق الملاحظات السريرية والتقييم وخطة المتابعة..."
                  : "للقراءة فقط — يستطيع الأطباء والمدراء فقط إضافة ملاحظات."
              }
              className="w-full rounded-lg border border-surface-high bg-surface-low/40 px-4 py-3 text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-primary transition resize-none disabled:opacity-60"
            />

            <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
              <div className="flex items-center gap-4 text-sm text-ink-mute">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary" />
                  أولوية عالية
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary" />
                  مشاركة مع البوابة
                </label>
              </div>
              <button
                disabled={!can("patients.notes")}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BookmarkSquareIcon className="w-4 h-4" />
                توقيع وحفظ الملاحظة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Vital({ label, value, unit }) {
  return (
    <div className="mt-4 flex items-baseline justify-between">
      <span className="text-sm text-ink-variant">{label}</span>
      <div>
        <span className="font-display font-bold text-2xl text-ink font-latin">{value}</span>
        <span className="ms-1 text-xs text-ink-mute font-semibold">{unit}</span>
      </div>
    </div>
  );
}

function ToolBtn({ children }) {
  return <button className="w-8 h-8 rounded-md hover:bg-surface-low grid place-items-center">{children}</button>;
}

function AiNoteHelper({ note, canUse, state, suggestion, onGenerate, onApply, onReset }) {
  const tone =
    state === "error"
      ? "border-danger/30 bg-danger-soft/20"
      : state === "ready"
        ? "border-secondary/30 bg-secondary-soft/20"
        : "border-primary/30 bg-primary-soft/20";
  return (
    <div className={`rounded-lg border ${tone} p-3 mb-3`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-ink">AI Note Helper</span>
          <span className="chip bg-surface-base/80 text-ink-mute">
            {state === "typing" ? "typing" : state === "ready" ? "ready" : state === "error" ? "error" : "idle"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button disabled={!canUse} onClick={onGenerate} className="btn-ghost h-8 px-3 text-xs disabled:opacity-50">
            تحسين الصياغة
          </button>
          <button
            disabled={!canUse || state !== "ready"}
            onClick={onApply}
            className="btn-primary h-8 px-3 text-xs disabled:opacity-50"
          >
            تطبيق
          </button>
          <button onClick={onReset} className="btn-ghost h-8 px-3 text-xs">
            مسح
          </button>
        </div>
      </div>
      {state === "typing" && (
        <div className="text-xs text-ink-mute mt-2">جارٍ توليد صياغة سريرية مختصرة...</div>
      )}
      {state === "error" && (
        <div className="flex items-center gap-1.5 text-xs text-danger mt-2">
          <ExclamationCircleIcon className="w-4 h-4" />
          {suggestion}
        </div>
      )}
      {state === "ready" && (
        <div className="mt-2 rounded-md bg-surface-base/70 border border-surface-high p-2.5 whitespace-pre-line text-xs text-ink-variant">
          {suggestion}
        </div>
      )}
      {state === "idle" && note.trim().length > 0 && (
        <div className="text-xs text-ink-mute mt-2">يمكنك تحسين الملاحظة الحالية بنقرة واحدة.</div>
      )}
    </div>
  );
}
