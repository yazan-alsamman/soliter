import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  UserPlusIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext.jsx";
import { usePatients } from "../context/PatientsContext.jsx";
import { STATUS_AR, fmtPatientFileId } from "../data/strings.js";
import Chip from "../components/ui/Chip.jsx";
import StatCard from "../components/ui/StatCard.jsx";

const TABS = [
  { id: "all", label: "جميع المرضى" },
  { id: "active", label: "نشط" },
  { id: "inactive", label: "غير نشط" },
  { id: "new", label: "جديد" },
];

function avatarStyle(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  const accentHue = (hue + 24) % 360;
  return {
    background: `linear-gradient(140deg, hsla(${hue}, 92%, 78%, 0.45), hsla(${accentHue}, 88%, 66%, 0.35))`,
    borderColor: `hsla(${hue}, 78%, 46%, 0.36)`,
    color: `hsl(${hue}, 80%, 28%)`,
  };
}

export default function Patients() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { can } = useAuth();
  const { patients, addPatient, updatePatient, deletePatient, searchPatients } = usePatients();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef(null);

  // Debounced backend search — hits the actual DB instead of filtering the 50-item cache
  const handleQueryChange = useCallback((q) => {
    setQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPatients(q.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  }, [searchPatients]);

  // When switching tabs, clear search
  const handleTabChange = useCallback((t) => {
    setTab(t);
    setQuery("");
    setSearchResults(null);
  }, []);

  // Use backend search results when querying, else filter local list by tab only
  const filtered = useMemo(() => {
    if (searchResults !== null) return searchResults;
    return patients.filter((p) => (tab === "all" ? true : p.status === tab));
  }, [tab, patients, searchResults]);

  useEffect(() => {
    if (searchParams.get("create") !== "1" || !can("patients.create")) return;
    const frame = window.requestAnimationFrame(() => {
      setEditor({ mode: "create" });
    });
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    navigate(
      {
        search: next.toString() ? `?${next.toString()}` : "",
      },
      { replace: true }
    );
    return () => window.cancelAnimationFrame(frame);
  }, [can, navigate, searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <div className="label-caps text-primary">سجل المرضى</div>
          <h1 className="h1 mt-1">إدارة المرضى</h1>
          <p className="text-ink-variant mt-1 max-w-xl">
            إدارة بيانات التسجيل وسجل الزيارات والوثائق السريرية بكل سهولة.
          </p>
        </div>
        {can("patients.create") && (
          <button
            onClick={() => setEditor({ mode: "create" })}
            className="btn-primary self-start lg:self-auto"
          >
            <UserPlusIcon className="w-4 h-4" />
            إضافة مريض جديد
          </button>
        )}
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3 border-b border-surface-high">
          <div className="flex bg-surface-low p-1 rounded-full border border-surface-high">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className="relative px-3.5 h-8 text-xs font-semibold rounded-full"
              >
                {tab === t.id && (
                  <motion.span
                    layoutId="patient-tab"
                    className="absolute inset-0 bg-surface-base shadow-card rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`relative ${tab === t.id ? "text-primary" : "text-ink-mute"}`}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="ابحث بالاسم أو الهاتف…"
                className="input h-9 w-56 text-xs ps-3 pe-7"
              />
              {isSearching && (
                <span className="absolute end-2 top-1/2 -translate-y-1/2 text-ink-mute text-[10px]">⏳</span>
              )}
            </div>
            <button className="btn-ghost h-9 px-3 text-xs">
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              تصفية
            </button>
            <button className="btn-ghost h-9 px-3 text-xs">
              <ArrowDownTrayIcon className="w-4 h-4" />
              تصدير
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full lux-table">
            <thead>
              <tr className="text-start">
                <Th>رقم المريض</Th>
                <Th>الاسم</Th>
                <Th>آخر زيارة</Th>
                <Th>الموعد القادم</Th>
                <Th>الحالة</Th>
                <Th className="text-left ps-6">الإجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const av = avatarStyle(p.name);
                const hasAllergies = p.allergies?.length > 0;
                const hasApptToday = p.nextAppointment?.includes("اليوم");
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`border-t border-surface-low transition-colors ${
                      hasApptToday ? "bg-primary-soft/10" : "hover:bg-surface-low/60"
                    }`}
                  >
                    {/* ID with status border */}
                    <td
                      className={`px-5 py-4 font-semibold text-sm font-latin border-s-[3px] ps-4 ${
                        p.status === "active"
                          ? "text-primary border-primary/70"
                          : p.status === "new"
                          ? "text-secondary border-secondary/70"
                          : "text-ink-mute border-surface-high"
                      }`}
                    >
                      {fmtPatientFileId(p.id)}
                    </td>

                    {/* Name + quick view */}
                    <td className="px-5 py-4 relative">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full grid place-items-center font-semibold text-xs shrink-0 border"
                          style={av}
                        >
                          {initials(p.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-ink">{p.name}</span>
                            {hasAllergies && (
                              <span title={`حساسية: ${p.allergies.join("، ")}`}>
                                <ExclamationCircleIcon className="w-3.5 h-3.5 text-danger/70" />
                              </span>
                            )}
                            {hasApptToday && (
                              <span className="chip bg-primary-soft text-primary text-[9px] py-0.5 px-2 leading-tight">
                                اليوم
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-ink-mute">
                            {p.sex}، {p.age} سنة
                          </div>
                        </div>
                      </div>

                    </td>

                    <td className="px-5 py-4 text-sm text-ink-variant">{p.lastVisit}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-sm ${
                          hasApptToday ? "text-primary font-semibold" : "text-ink-variant"
                        }`}
                      >
                        {p.nextAppointment}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Chip tone={p.status}>{STATUS_AR[p.status]}</Chip>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-start">
                        <Link to={`/patients/${p.id}`}>
                          <IconBtn title="عرض">
                            <EyeIcon className="w-4 h-4" />
                          </IconBtn>
                        </Link>
                        {can("patients.edit") && (
                          <IconBtn
                            title="تعديل"
                            onClick={() => setEditor({ mode: "edit", patient: p })}
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </IconBtn>
                        )}
                        {can("patients.edit") && (
                          <IconBtn title="حذف" onClick={() => setDeleting(p)} danger>
                            <ArchiveBoxIcon className="w-4 h-4" />
                          </IconBtn>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <UserGroupIcon className="w-10 h-10 text-ink-line mx-auto mb-2" />
                    <div className="text-sm font-semibold text-ink">لا توجد نتائج مطابقة</div>
                    <div className="text-xs text-ink-mute mt-1">جرّب تغيير البحث أو الفلاتر.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 flex items-center justify-between text-xs text-ink-mute border-t border-surface-low">
          <span>عرض 1 إلى {filtered.length} من {patients.length} مريضاً</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className={`w-8 h-8 rounded-xl text-sm font-semibold transition-colors ${
                  p === 1
                    ? "bg-primary text-white shadow-[0_2px_8px_rgba(14,116,144,0.25)]"
                    : "hover:bg-surface-low text-ink-mute"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="إجمالي المرضى"
          value={String(patients.length)}
          hint="+12٪ هذا الشهر"
          icon={UserGroupIcon}
          tone="primary"
        />
        <StatCard
          label="نشط اليوم"
          value={String(patients.filter((p) => p.status === "active").length)}
          hint="حالات نشطة"
          icon={ShieldCheckIcon}
          tone="success"
        />
        <StatCard
          label="سجلات جديدة"
          value={String(patients.filter((p) => p.status === "new").length)}
          hint="تحتاج متابعة"
          icon={ClockIcon}
          tone="warn"
        />
      </div>

      {editor && (
        <PatientEditorModal
          mode={editor.mode}
          patient={editor.patient}
          onClose={() => setEditor(null)}
          onSave={async (payload) => {
            if (editor.mode === "create") await addPatient(payload);
            else await updatePatient(editor.patient.id, payload);
            setEditor(null);
          }}
        />
      )}

      {deleting && (
        <DeleteDialog
          title="حذف المريض؟"
          description={`سيتم حذف ملف ${deleting.name}. لا يمكن التراجع عن هذا الإجراء.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await deletePatient(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`px-5 py-3 label-caps text-start ${className}`}>{children}</th>
  );
}

function IconBtn({ title, children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 rounded-full grid place-items-center transition-colors border ${
        danger
          ? "text-ink-mute border-danger/15 bg-danger-soft/10 hover:bg-danger-soft/30 hover:text-danger"
          : "text-ink-mute border-surface-high bg-surface-low/35 hover:bg-surface-mid hover:text-primary"
      }`}
    >
      <span className="scale-110">{children}</span>
    </button>
  );
}

function initials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

function parseMedsMultiline(text) {
  if (!text?.trim()) return [];
  return text
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("|");
      const name = idx === -1 ? line.trim() : line.slice(0, idx).trim();
      const note = idx === -1 ? "" : line.slice(idx + 1).trim();
      if (!name) return null;
      return note ? { name, note } : { name };
    })
    .filter(Boolean);
}

function PatientEditorModal({ mode, patient, onClose, onSave }) {
  const emptyForm = () => ({
    name: "",
    phone: "",
    age: "",
    sex: "male",
    bloodType: "O+",
    status: "new",
    allergiesText: "",
    medsText: "",
    vitalsBp: "120/80",
    vitalsHr: "72",
    vitalsSpo2: "98",
    notes: "",
  });

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (mode === "create") {
      setForm(emptyForm());
      return;
    }
    if (patient) {
      setForm({
        name: patient.name || "",
        phone: patient.phone || "",
        age: patient.age != null ? String(patient.age) : "",
        sex: patient.sexKey || "male",
        bloodType: patient.bloodType || "O+",
        status: patient.status || "new",
        allergiesText: (patient.allergies || []).join("، "),
        medsText: (patient.meds || [])
          .map((m) => `${m.name}${m.note ? ` | ${m.note}` : ""}`)
          .join("\n"),
        vitalsBp: patient.vitals?.bp ?? "120/80",
        vitalsHr: String(patient.vitals?.hr ?? 72),
        vitalsSpo2: String(patient.vitals?.spo2 ?? 98),
        notes: patient.notes || "",
      });
    }
  }, [mode, patient]);

  const submit = async () => {
    if (isSaving) return;
    if (!form.name.trim()) return setError("اسم المريض مطلوب");
    if (mode === "create" && !form.phone.trim()) return setError("رقم الهاتف مطلوب");
    if (!form.age) return setError("العمر مطلوب");
    const allergies = form.allergiesText
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const medications = parseMedsMultiline(form.medsText);
    setError("");
    setIsSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        phone: form.phone.trim(),
        age: Number(form.age),
        sex: form.sex,
        bloodType: form.bloodType,
        status: form.status,
        allergies,
        medications,
        vitals: {
          bp: form.vitalsBp.trim(),
          hr: Number(form.vitalsHr) || 72,
          spo2: Number(form.vitalsSpo2) || 98,
        },
        notes: form.notes.trim(),
      });
    } catch (err) {
      setError(err?.message || "تعذّر حفظ البيانات");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="card-modal w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="h3 mb-5">
          {mode === "create" ? "إضافة مريض جديد" : "تعديل بيانات المريض"}
        </h3>
        <p className="text-xs text-ink-mute mb-4">
          يُستخرج الموعد القادم وآخر زيارة تلقائياً من جدول المواعيد المحفوظ.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="الاسم">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="رقم الهاتف">
            <input
              className="input"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="مثال: 0501234567"
            />
          </Field>
          <Field label="العمر">
            <input
              type="number"
              className="input"
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
            />
          </Field>
          <Field label="الجنس">
            <select
              className="input"
              value={form.sex}
              onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
            >
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
          </Field>
          <Field label="فصيلة الدم">
            <select
              className="input"
              value={form.bloodType}
              onChange={(e) => setForm((f) => ({ ...f, bloodType: e.target.value }))}
            >
              {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="الحالة">
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="new">جديد</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <Field label="ضغط الدم (mmHg)">
            <input
              className="input"
              value={form.vitalsBp}
              onChange={(e) => setForm((f) => ({ ...f, vitalsBp: e.target.value }))}
              placeholder="120/80"
            />
          </Field>
          <Field label="النبض">
            <input
              type="number"
              className="input"
              value={form.vitalsHr}
              onChange={(e) => setForm((f) => ({ ...f, vitalsHr: e.target.value }))}
            />
          </Field>
          <Field label="SpO₂ %">
            <input
              type="number"
              className="input"
              value={form.vitalsSpo2}
              onChange={(e) => setForm((f) => ({ ...f, vitalsSpo2: e.target.value }))}
            />
          </Field>
        </div>

        <div className="mt-3 space-y-3">
          <Field label="الحساسية (افصل بفاصلة)">
            <input
              className="input"
              value={form.allergiesText}
              onChange={(e) => setForm((f) => ({ ...f, allergiesText: e.target.value }))}
              placeholder="مثال: البنسلين، الغبار"
            />
          </Field>
          <Field label="الأدوية (سطر لكل دواء، اختياري: الاسم | ملاحظة)">
            <textarea
              className="input min-h-[88px]"
              value={form.medsText}
              onChange={(e) => setForm((f) => ({ ...f, medsText: e.target.value }))}
              placeholder={"ميتفورمين | 850mg مرتين يومياً\nأملوديبين"}
            />
          </Field>
          <Field label="ملاحظات عامة">
            <textarea
              className="input min-h-[72px]"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>
        </div>

        {error && <div className="text-xs text-danger mt-2">{error}</div>}
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-ghost" onClick={onClose} disabled={isSaving}>إلغاء</button>
          <button className="btn-primary disabled:opacity-50" onClick={submit} disabled={isSaving}>
            {isSaving ? "جارٍ الحفظ…" : mode === "create" ? "إضافة" : "حفظ التعديل"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteDialog({ title, description, onClose, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="card-modal w-full max-w-md p-6"
      >
        <h3 className="h3">{title}</h3>
        <p className="text-sm text-ink-variant mt-2">{description}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-danger" onClick={onConfirm}>تأكيد الحذف</button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label-caps mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
