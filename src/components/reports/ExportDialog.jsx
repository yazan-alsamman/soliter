import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

const SECTIONS = [
  { id: "kpis",         label: "المؤشرات الرئيسية",  hint: "ملخص KPIs",                        icon: ChartBarIcon,                tone: "primary" },
  { id: "revenue",      label: "اتجاه الإيرادات",      hint: "الإيرادات الشهرية",                 icon: CurrencyDollarIcon,          tone: "success" },
  { id: "departments",  label: "حجم الأقسام",         hint: "توزيع المواعيد على الأقسام",         icon: ClipboardDocumentListIcon,   tone: "primary" },
  { id: "doctors",      label: "أداء الأطباء",        hint: "مرتبين حسب الإيراد",                icon: UserGroupIcon,               tone: "primary" },
  { id: "payments",     label: "توزيع المدفوعات",     hint: "مدفوع / جزئي / معلق",              icon: CurrencyDollarIcon,          tone: "warn" },
  { id: "services",     label: "أكثر الخدمات طلباً",   hint: "Top services",                       icon: ClipboardDocumentListIcon,   tone: "primary" },
  { id: "outstanding",  label: "الأرصدة المعلقة",      hint: "Unpaid / partial",                   icon: ExclamationTriangleIcon,     tone: "danger" },
  { id: "patientFlow",  label: "مسار المرضى",         hint: "Excel only",                          icon: UserGroupIcon,               tone: "primary",  excelOnly: true },
];

const DATA_DUMPS = [
  { id: "appointments", label: "بيانات المواعيد",   hint: "كل المواعيد ضمن النطاق",   icon: CalendarDaysIcon,         excelOnly: true },
  { id: "invoices",     label: "بيانات الفواتير",   hint: "Invoices raw export",         icon: CurrencyDollarIcon,       excelOnly: true },
  { id: "patients",     label: "بيانات المرضى",     hint: "Patients raw export",         icon: UserGroupIcon,            excelOnly: true },
];

function defaultSelection() {
  const s = {};
  SECTIONS.forEach((sec) => { s[sec.id] = true; });
  DATA_DUMPS.forEach((d) => { s[d.id] = false; });
  return s;
}

export default function ExportDialog({ open, onClose, onExport, range }) {
  const [format, setFormat] = useState("pdf"); // 'pdf' | 'xlsx'
  const [selection, setSelection] = useState(defaultSelection);

  if (!open) return null;

  const toggle = (id) => setSelection((s) => ({ ...s, [id]: !s[id] }));
  const allOn = () => {
    const s = {};
    SECTIONS.forEach((sec) => { s[sec.id] = true; });
    DATA_DUMPS.forEach((d) => { s[d.id] = format === "xlsx"; });
    setSelection(s);
  };
  const allOff = () => {
    const s = {};
    [...SECTIONS, ...DATA_DUMPS].forEach((it) => { s[it.id] = false; });
    setSelection(s);
  };

  const enabledCount = Object.entries(selection).filter(
    ([id, on]) => {
      if (!on) return false;
      const item = [...SECTIONS, ...DATA_DUMPS].find((s) => s.id === id);
      if (!item) return false;
      if (format === "pdf" && item.excelOnly) return false;
      return true;
    }
  ).length;

  const handleExport = () => {
    onExport({ format, selection });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] grid place-items-center bg-ink/35 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-surface-base rounded-2xl shadow-pop max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-surface-high">
            <div>
              <h2 className="h3">تصدير التقرير</h2>
              <p className="text-xs text-ink-mute mt-0.5">
                اختر الصيغة والأقسام المراد تضمينها — {range || "الفترة المحددة"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 grid place-items-center text-ink-mute hover:text-ink-default rounded-xl hover:bg-surface-low transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Format toggle */}
            <div>
              <p className="label-caps mb-2">الصيغة</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setFormat("pdf")}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-start transition-all ${
                    format === "pdf"
                      ? "border-primary bg-primary-soft/40 shadow-sm"
                      : "border-surface-high hover:border-primary/30 hover:bg-surface-low"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg grid place-items-center ${
                      format === "pdf" ? "bg-primary text-white" : "bg-surface-low text-ink-mute"
                    }`}
                  >
                    <DocumentArrowDownIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-ink">PDF</div>
                    <div className="text-[11px] text-ink-mute">
                      تقرير منسّق للطباعة والمشاركة
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setFormat("xlsx")}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-start transition-all ${
                    format === "xlsx"
                      ? "border-primary bg-primary-soft/40 shadow-sm"
                      : "border-surface-high hover:border-primary/30 hover:bg-surface-low"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg grid place-items-center ${
                      format === "xlsx" ? "bg-primary text-white" : "bg-surface-low text-ink-mute"
                    }`}
                  >
                    <TableCellsIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-ink">Excel</div>
                    <div className="text-[11px] text-ink-mute">
                      ورقات متعددة قابلة للتعديل والتحليل
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Sections */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="label-caps">أقسام التقرير</p>
                <div className="flex items-center gap-1">
                  <button onClick={allOn} className="text-[11px] text-primary font-bold hover:underline">
                    تحديد الكل
                  </button>
                  <span className="text-ink-line">·</span>
                  <button onClick={allOff} className="text-[11px] text-ink-mute font-bold hover:underline">
                    إلغاء الكل
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  const disabled = sec.excelOnly && format === "pdf";
                  const on = !disabled && !!selection[sec.id];
                  return (
                    <button
                      key={sec.id}
                      onClick={() => !disabled && toggle(sec.id)}
                      disabled={disabled}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-start transition-all ${
                        disabled
                          ? "opacity-40 cursor-not-allowed border-surface-high"
                          : on
                          ? "border-primary bg-primary-soft/40"
                          : "border-surface-high hover:border-primary/35 hover:bg-surface-low"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                          on
                            ? "bg-primary border-primary"
                            : "border-ink-line bg-surface-base"
                        }`}
                      >
                        {on && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                      <Icon className="w-4 h-4 text-ink-mute shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-bold text-ink truncate">
                          {sec.label}
                          {sec.excelOnly && (
                            <span className="ms-1.5 text-[9px] font-bold text-warn bg-warn-soft px-1.5 py-0.5 rounded">
                              Excel
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-ink-mute truncate">{sec.hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Data dumps (Excel only) */}
            {format === "xlsx" && (
              <div>
                <p className="label-caps mb-2">بيانات خام إضافية</p>
                <p className="text-[10.5px] text-ink-mute mb-2">
                  ورقات تحتوي السجلات الكاملة — مفيدة للتحليل في برامج الجداول.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DATA_DUMPS.map((d) => {
                    const Icon = d.icon;
                    const on = !!selection[d.id];
                    return (
                      <button
                        key={d.id}
                        onClick={() => toggle(d.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-start transition-all ${
                          on
                            ? "border-primary bg-primary-soft/40"
                            : "border-surface-high hover:border-primary/35 hover:bg-surface-low"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            on
                              ? "bg-primary border-primary"
                              : "border-ink-line bg-surface-base"
                          }`}
                        >
                          {on && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </span>
                        <Icon className="w-4 h-4 text-ink-mute shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold text-ink truncate">{d.label}</div>
                          <div className="text-[10px] text-ink-mute truncate">{d.hint}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 p-4 border-t border-surface-high bg-surface-low/40">
            <span className="text-xs text-ink-mute">
              <span className="font-bold text-ink">{enabledCount}</span> قسم مُحدّد للتصدير
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="btn-ghost h-10 px-4 text-sm rounded-xl border border-surface-high"
              >
                إلغاء
              </button>
              <button
                onClick={handleExport}
                disabled={enabledCount === 0}
                className="btn-primary h-10 px-5 text-sm rounded-xl disabled:opacity-50"
              >
                {format === "pdf" ? <DocumentArrowDownIcon className="w-4 h-4" /> : <TableCellsIcon className="w-4 h-4" />}
                {format === "pdf" ? "تصدير PDF" : "تصدير Excel"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
