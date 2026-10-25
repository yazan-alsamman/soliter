import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  XMarkIcon,
  EyeIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useBilling } from "../context/BillingContext.jsx";
import { useAppointments } from "../context/AppointmentsContext.jsx";
import Chip from "../components/ui/Chip.jsx";
import {
  DAYS_AR,
  fmtAppointmentRef,
  fmtInvoiceId,
  fmtNumberAr,
  fmtPatientFileId,
  fmtTime,
  LOCALE_AR_LATN,
  STATUS_AR,
} from "../data/strings.js";

// Amounts in the DB are stored in Syrian Pounds (SYP).
// SYP rate = 1 (no conversion); USD/USDT divide by the exchange rate.
const EXCHANGE_RATE = 13000; // 1 USD ≈ 13,000 SYP
const CURRENCY_MODES = [
  { id: "SYP", label: "ل.س", rate: 1, desc: "متغير" },
  { id: "USD", label: "$", rate: 1 / EXCHANGE_RATE, desc: "مرجعي" },
  { id: "USDT", label: "₮", rate: 1 / EXCHANGE_RATE, desc: "مستقر" },
];

const TABS = [
  { id: "all", label: "الكل" },
  { id: "draft", label: "غير مدفوعة" },
  { id: "partial", label: "دفع جزئي" },
  { id: "paid", label: "مدفوعة" },
];

const PAYMENT_METHOD_AR = {
  cash: "نقدي",
  card: "بطاقة",
  transfer: "تحويل",
  cheque: "شيك",
  insurance: "تأمين",
};

const PAYMENT_METHODS = [
  { id: "cash", label: "نقدي" },
  { id: "card", label: "بطاقة" },
  { id: "transfer", label: "تحويل" },
];

function formatMoneyByMode(amount, modeId) {
  const mode = CURRENCY_MODES.find((m) => m.id === modeId) ?? CURRENCY_MODES[0];
  const converted = (Number(amount) || 0) * mode.rate;
  if (mode.id === "SYP") {
    return `${converted.toLocaleString(LOCALE_AR_LATN, { maximumFractionDigits: 0 })} ل.س`;
  }
  return `${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${mode.label}`;
}

function exportRows(invoices, modeId, selectedCurrency) {
  return invoices.map((inv) => ({
    invoiceId: fmtInvoiceId(inv.id),
    patient: inv.patient,
    patientId: inv.patientId ? fmtPatientFileId(inv.patientId) : "—",
    date: inv.date,
    status: STATUS_AR[inv.status] || inv.status,
    amount: formatMoneyByMode(inv.amount, modeId),
    currency: selectedCurrency.label,
  }));
}

function downloadCsv(rows) {
  const headers = ["رقم الفاتورة", "المريض", "رقم الملف", "التاريخ", "الحالة", "المبلغ", "العملة"];
  const csvBody = rows.map((row) =>
    [row.invoiceId, row.patient, row.patientId, row.date, row.status, row.amount, row.currency]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  const csvContent = [headers.join(","), ...csvBody].join("\n");
  const blob = new Blob([`﻿${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `billing-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportPdfPreview(rows) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1000,height=800");
  if (!printWindow) return;
  const tableRows = rows
    .map(
      (row) => `<tr>
        <td>${row.invoiceId}</td><td>${row.patient}</td><td>${row.patientId}</td>
        <td>${row.date}</td><td>${row.status}</td><td>${row.amount}</td>
      </tr>`
    )
    .join("");
  printWindow.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <title>تقرير الفوترة</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 8px; font-size: 22px; }
          .meta { margin-bottom: 16px; color: #475569; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-size: 12px; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h1>تقرير الفوترة</h1>
        <div class="meta">تم الإنشاء في ${new Date().toLocaleString(LOCALE_AR_LATN)}</div>
        <table>
          <thead>
            <tr><th>رقم الفاتورة</th><th>المريض</th><th>رقم الملف</th><th>التاريخ</th><th>الحالة</th><th>المبلغ</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export default function Billing() {
  const { invoices, updateInvoice, deleteInvoice, recordPayment } = useBilling();
  const { items: appointments, setAppointmentStatus } = useAppointments();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [recentlyPaid, setRecentlyPaid] = useState(null);
  const [currencyMode, setCurrencyMode] = useState("SYP");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  const filtered = useMemo(() => {
    let list = invoices;
    if (tab !== "all") list = list.filter((i) => i.status === tab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) => i.patient.toLowerCase().includes(q) || fmtInvoiceId(i.id).includes(q)
      );
    }
    return list;
  }, [invoices, tab, search]);

  const handoffDrafts = useMemo(
    () =>
      invoices
        .filter((i) => i.status === "draft" && i.appointmentId)
        .map((inv) => ({
          ...inv,
          appointment: appointments.find((a) => a.id === inv.appointmentId),
        }))
        .sort(
          (a, b) =>
            (a.appointment?.day ?? 99) - (b.appointment?.day ?? 99) ||
            (a.appointment?.start ?? 99) - (b.appointment?.start ?? 99)
        ),
    [invoices, appointments]
  );

  const totalRevenue = useMemo(
    () => invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0),
    [invoices]
  );
  const totalUnpaid = useMemo(
    () => invoices.filter((i) => i.status === "draft").reduce((s, i) => s + i.amount, 0),
    [invoices]
  );
  const totalPartialBalance = useMemo(
    () => invoices.filter((i) => i.status === "partial").reduce((s, i) => s + (i.balance || 0), 0),
    [invoices]
  );

  const selectedCurrency = CURRENCY_MODES.find((m) => m.id === currencyMode) ?? CURRENCY_MODES[0];
  const rowsForExport = exportRows(filtered, currencyMode, selectedCurrency);

  const tabCounts = useMemo(
    () => ({
      all: invoices.length,
      draft: invoices.filter((i) => i.status === "draft").length,
      partial: invoices.filter((i) => i.status === "partial").length,
      paid: invoices.filter((i) => i.status === "paid").length,
    }),
    [invoices]
  );

  const handleConfirmPayment = async (inv, paymentData) => {
    setRecentlyPaid(inv.id);
    try {
      await recordPayment(inv.id, paymentData);
    } catch {
      updateInvoice(inv.id, { status: "paid" });
    }
    if (inv.appointmentId) {
      try {
        await setAppointmentStatus(inv.appointmentId, "paid");
      } catch {
        // appointment status update may fail silently
      }
    }
    setPayTarget(null);
    setDetailInvoice(null);
    setTimeout(() => setRecentlyPaid(null), 800);
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!exportRef.current?.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <div className="label-caps text-primary">الإيرادات والفواتير</div>
          <h1 className="h1 mt-1">الفوترة</h1>
          <p className="text-ink-variant mt-1 max-w-xl">
            إنشاء وإدارة فواتير المرضى وتتبع المدفوعات والأرصدة المستحقة.
          </p>
        </div>
        <div className="chip bg-primary-soft text-primary">
          الفواتير تُنشأ تلقائيًا عند إنهاء المعاينة
        </div>
      </div>

      {/* Currency switcher */}
      <div className="card-pad py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="label-caps">العملة المعروضة</span>
          <div className="flex bg-surface-low p-1 rounded-full border border-surface-high">
            {CURRENCY_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setCurrencyMode(mode.id)}
                className={`px-3 h-8 text-xs font-semibold rounded-full transition-colors ${
                  currencyMode === mode.id
                    ? "bg-surface-base text-primary shadow-card"
                    : "text-ink-mute hover:text-ink"
                }`}
              >
                {mode.id}
              </button>
            ))}
          </div>
        </div>
        <div className="text-sm text-ink-variant">
          سعر الصرف:{" "}
          <span className="font-semibold text-ink">
            {fmtNumberAr(EXCHANGE_RATE)} ل.س / $
          </span>
          <span className="ms-2 text-xs text-ink-mute">({selectedCurrency.desc})</span>
        </div>
      </div>

      {/* Draft handoff cards */}
      {handoffDrafts.length > 0 && (
        <div className="card-pad">
          <div className="flex items-center justify-between mb-3">
            <h2 className="h3">بانتظار الدفع من المعاينات</h2>
            <span className="chip bg-warn-soft text-warn">
              {fmtNumberAr(handoffDrafts.length)} فاتورة معلقة
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {handoffDrafts.slice(0, 6).map((inv) => (
              <div key={inv.id} className="rounded-xl border border-warn/30 bg-warn-soft/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-ink">{inv.patient}</div>
                    <div className="text-xs text-ink-mute mt-0.5">
                      {inv.appointment
                        ? `${DAYS_AR[inv.appointment.day]?.label} · ${fmtTime(inv.appointment.start)}`
                        : "موعد مرتبط"}
                    </div>
                  </div>
                  <Chip tone="draft">مسودة</Chip>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-display font-bold text-ink">
                    {formatMoneyByMode(inv.amount, currencyMode)}
                  </span>
                  <button
                    className="btn-primary h-8 px-3 text-xs"
                    onClick={() => setPayTarget(inv)}
                  >
                    تأكيد الدفع
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-px bg-surface-high rounded-2xl overflow-hidden shadow-card"
      >
        {/* Revenue */}
        <div className="bg-surface-base p-5 hover:bg-surface-low/30 transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-bold text-success uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            إجمالي المحصّل
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-display font-bold text-[26px] text-ink leading-none">
              {formatMoneyByMode(totalRevenue, currencyMode).split(" ").slice(0, -1).join(" ")}
            </span>
            <span className="text-sm text-ink-mute">{selectedCurrency.label}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-xs text-success">
            <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
            {fmtNumberAr(tabCounts.paid)} فاتورة مدفوعة
          </div>
        </div>

        {/* Unpaid */}
        <div className="bg-surface-base p-5 border-x border-surface-high hover:bg-surface-low/30 transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-bold text-warn uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-warn" />
            غير مدفوعة
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-display font-bold text-[26px] text-ink leading-none">
              {formatMoneyByMode(totalUnpaid, currencyMode).split(" ").slice(0, -1).join(" ")}
            </span>
            <span className="text-sm text-ink-mute">{selectedCurrency.label}</span>
          </div>
          <div className="mt-1.5 text-xs text-ink-mute">
            {fmtNumberAr(tabCounts.draft)} فاتورة مفتوحة
          </div>
        </div>

        {/* Partial balance */}
        <div
          className={`p-5 transition-colors ${
            totalPartialBalance > 0
              ? "bg-primary-soft/20 hover:bg-primary-soft/30"
              : "bg-surface-base hover:bg-surface-low/30"
          }`}
        >
          <div
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${
              totalPartialBalance > 0 ? "text-primary" : "text-ink-mute"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                totalPartialBalance > 0 ? "bg-primary" : "bg-ink-mute"
              }`}
            />
            رصيد جزئي متبقٍ
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className={`font-display font-bold text-[26px] leading-none ${
                totalPartialBalance > 0 ? "text-primary" : "text-ink"
              }`}
            >
              {formatMoneyByMode(totalPartialBalance, currencyMode).split(" ").slice(0, -1).join(" ")}
            </span>
            <span
              className={`text-sm ${
                totalPartialBalance > 0 ? "text-primary/60" : "text-ink-mute"
              }`}
            >
              {selectedCurrency.label}
            </span>
          </div>
          <div className={`mt-1.5 text-xs ${totalPartialBalance > 0 ? "text-primary/70" : "text-ink-mute"}`}>
            {tabCounts.partial > 0
              ? `${fmtNumberAr(tabCounts.partial)} دفع جزئي`
              : "لا توجد مدفوعات جزئية"}
          </div>
        </div>
      </motion.div>

      {/* Table card */}
      <div className="card">
        <div className="px-5 py-4 border-b border-surface-high flex flex-col gap-3">
          {/* Top row: tabs + export */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex bg-surface-low p-1 rounded-full border border-surface-high">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="relative px-3.5 h-8 text-xs font-semibold rounded-full"
                >
                  {tab === t.id && (
                    <motion.span
                      layoutId="billing-tab"
                      className="absolute inset-0 bg-surface-base shadow-card rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={`relative ${tab === t.id ? "text-primary" : "text-ink-mute"}`}>
                    {t.label}
                    {tabCounts[t.id] > 0 && (
                      <span
                        className={`ms-1.5 text-[10px] font-bold ${
                          tab === t.id ? "text-primary" : "text-ink-line"
                        }`}
                      >
                        {tabCounts[t.id]}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative" ref={exportRef}>
              <button
                className="btn-ghost h-9 px-3 text-xs"
                onClick={() => setExportOpen((prev) => !prev)}
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                تصدير
              </button>
              {exportOpen && (
                <div className="absolute z-30 end-0 mt-2 w-56 rounded-xl border border-surface-high bg-surface-base shadow-pop p-1.5">
                  <button
                    className="w-full text-start px-3 py-2.5 rounded-lg hover:bg-surface-low text-sm text-ink"
                    onClick={() => { exportPdfPreview(rowsForExport); setExportOpen(false); }}
                  >
                    تصدير كـ PDF
                  </button>
                  <button
                    className="w-full text-start px-3 py-2.5 rounded-lg hover:bg-surface-low text-sm text-ink"
                    onClick={() => { downloadCsv(rowsForExport); setExportOpen(false); }}
                  >
                    تصدير كـ Excel / CSV
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Search row */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute pointer-events-none" />
            <input
              type="search"
              placeholder="بحث باسم المريض أو رقم الفاتورة…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input ps-9 h-9 text-sm w-full max-w-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full lux-table">
            <thead>
              <tr>
                <Th>الفاتورة</Th>
                <Th>المريض</Th>
                <Th>التاريخ</Th>
                <Th className="text-end">المبلغ</Th>
                <Th>الحالة</Th>
                <Th className="text-left ps-6">الإجراءات</Th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((inv, i) => (
                  <motion.tr
                    key={inv.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-t border-surface-low transition-colors ${
                      inv.status === "draft"
                        ? "hover:bg-warn-soft/10"
                        : inv.status === "partial"
                        ? "hover:bg-primary-soft/10"
                        : inv.status === "paid"
                        ? "billing-row-paid"
                        : "hover:bg-surface-low/60"
                    }`}
                  >
                    <td
                      className={`px-5 py-4 font-semibold text-sm font-latin border-s-[3px] ps-4 ${
                        inv.status === "draft"
                          ? "text-warn border-warn"
                          : inv.status === "partial"
                          ? "text-primary border-primary"
                          : inv.status === "paid"
                          ? "text-success border-success/60"
                          : "text-ink-mute border-transparent"
                      } ${recentlyPaid === inv.id ? "paid-stamp" : ""}`}
                    >
                      {fmtInvoiceId(inv.id)}
                    </td>
                    <td className="px-5 py-4 text-sm text-ink font-medium">
                      <div>{inv.patient}</div>
                      {inv.patientId && (
                        <div className="text-[11px] text-ink-mute font-latin">
                          {fmtPatientFileId(inv.patientId)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-ink-variant">
                      <div>{inv.date}</div>
                      {inv.appointmentId && (
                        <div className="text-[10px] text-primary font-latin">
                          {fmtAppointmentRef(inv.appointmentId)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-end">
                      <div className="font-display font-bold text-sm text-ink">
                        {formatMoneyByMode(inv.amount, currencyMode)}
                      </div>
                      {inv.status === "partial" && inv.balance > 0 && (
                        <div className="text-[11px] text-primary mt-0.5">
                          متبقي: {formatMoneyByMode(inv.balance, currencyMode)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Chip tone={inv.status}>{STATUS_AR[inv.status] || inv.status}</Chip>
                    </td>
                    <td className="px-5 py-4 text-left">
                      <div className="flex items-center gap-1 justify-start">
                        <button
                          onClick={() => setDetailInvoice(inv)}
                          className="w-8 h-8 rounded-lg hover:bg-surface-mid grid place-items-center text-ink-mute hover:text-primary transition-colors"
                          title="عرض التفاصيل"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditor({ mode: "edit", invoice: inv })}
                          className="w-8 h-8 rounded-lg hover:bg-surface-mid grid place-items-center text-ink-mute hover:text-primary transition-colors"
                          title="تعديل"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(inv)}
                          className="w-8 h-8 rounded-lg hover:bg-danger-soft grid place-items-center text-ink-mute hover:text-danger transition-colors"
                          title="حذف"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                        {inv.status !== "paid" && (
                          <button
                            onClick={() => setPayTarget(inv)}
                            className="flex items-center gap-1 text-xs font-semibold text-success hover:bg-success-soft px-2 py-1 rounded-lg transition-colors"
                          >
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            دفع
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <DocumentTextIcon className="w-10 h-10 text-ink-line mx-auto mb-2" />
                    <div className="text-sm font-semibold text-ink">
                      {search ? "لا توجد نتائج للبحث" : "لا توجد فواتير في هذا التصنيف"}
                    </div>
                    <div className="text-xs text-ink-mute mt-1">
                      {search
                        ? "جرّب كلمات بحث مختلفة"
                        : "ستظهر الفواتير تلقائيًا بعد إنهاء المعاينة"}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {detailInvoice && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          currencyMode={currencyMode}
          onClose={() => setDetailInvoice(null)}
          onPay={(inv) => { setDetailInvoice(null); setPayTarget(inv); }}
          onEdit={(inv) => { setDetailInvoice(null); setEditor({ mode: "edit", invoice: inv }); }}
          onDelete={(inv) => { setDetailInvoice(null); setDeleting(inv); }}
        />
      )}

      {payTarget && (
        <PaymentModal
          invoice={payTarget}
          currencyMode={currencyMode}
          onClose={() => setPayTarget(null)}
          onConfirm={(paymentData) => handleConfirmPayment(payTarget, paymentData)}
        />
      )}

      {editor && (
        <InvoiceEditorModal
          mode={editor.mode}
          invoice={editor.invoice}
          onClose={() => setEditor(null)}
          onSave={(payload) => { updateInvoice(editor.invoice.id, payload); setEditor(null); }}
        />
      )}

      {deleting && (
        <DeleteDialog
          title="حذف الفاتورة؟"
          description={`سيتم حذف الفاتورة ${fmtInvoiceId(deleting.id)}. لا يمكن التراجع.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => { deleteInvoice(deleting.id); setDeleting(null); }}
        />
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`px-5 py-3 label-caps text-start ${className}`}>{children}</th>;
}

function InvoiceDetailModal({ invoice, currencyMode, onClose, onPay, onEdit, onDelete }) {
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
        className="card-modal w-full max-w-lg flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-surface-high">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-latin font-bold text-lg text-ink">{fmtInvoiceId(invoice.id)}</span>
              <Chip tone={invoice.status}>{STATUS_AR[invoice.status] || invoice.status}</Chip>
            </div>
            <div className="text-xs text-ink-mute mt-0.5">{invoice.date}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-mid grid place-items-center text-ink-mute hover:text-ink transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Patient info */}
          <div>
            <div className="label-caps mb-1">المريض</div>
            <div className="font-semibold text-ink">{invoice.patient}</div>
            {invoice.patientId && (
              <div className="text-xs text-ink-mute font-latin mt-0.5">
                {fmtPatientFileId(invoice.patientId)}
              </div>
            )}
            {invoice.appointmentId && (
              <div className="text-xs text-primary font-latin mt-0.5">
                {fmtAppointmentRef(invoice.appointmentId)}
              </div>
            )}
          </div>

          {/* Amount breakdown */}
          <div className="rounded-xl bg-surface-low p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-ink-mute">المبلغ الإجمالي</span>
              <span className="font-semibold text-ink">
                {formatMoneyByMode(invoice.amount, currencyMode)}
              </span>
            </div>
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-ink-mute">المدفوع</span>
                <span className="font-semibold text-success">
                  {formatMoneyByMode(invoice.paidAmount, currencyMode)}
                </span>
              </div>
            )}
            {(invoice.balance ?? 0) > 0 && (
              <div className="flex justify-between text-sm border-t border-surface-high pt-2.5 mt-2.5">
                <span className="font-bold text-ink">الرصيد المستحق</span>
                <span className="font-bold text-warn">
                  {formatMoneyByMode(invoice.balance, currencyMode)}
                </span>
              </div>
            )}
            {invoice.status === "paid" && (
              <div className="flex items-center gap-1.5 text-xs text-success pt-1">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                تم السداد بالكامل
              </div>
            )}
          </div>

          {/* Services */}
          {invoice.services?.length > 0 && (
            <div>
              <div className="label-caps mb-2">الخدمات</div>
              <div className="rounded-xl border border-surface-high divide-y divide-surface-high">
                {invoice.services.map((svc, i) => (
                  <div key={i} className="flex justify-between items-center px-4 py-2.5 text-sm">
                    <span className="text-ink">{svc.name || svc.serviceName || "خدمة"}</span>
                    <span className="font-semibold text-ink">
                      {formatMoneyByMode(Number(svc.unitPrice ?? svc.lineTotal ?? 0), currencyMode)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment history */}
          {invoice.payments?.length > 0 && (
            <div>
              <div className="label-caps mb-2">سجل المدفوعات</div>
              <div className="rounded-xl border border-surface-high divide-y divide-surface-high">
                {invoice.payments.map((pmt, i) => (
                  <div key={i} className="flex justify-between items-center px-4 py-2.5 text-sm">
                    <div>
                      <span className="text-ink">
                        {PAYMENT_METHOD_AR[pmt.method] || pmt.method || "نقدي"}
                      </span>
                      {pmt.reference && (
                        <span className="text-xs text-ink-mute ms-2">#{pmt.reference}</span>
                      )}
                    </div>
                    <span className="font-semibold text-success">
                      {formatMoneyByMode(Number(pmt.amount ?? 0), currencyMode)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-high p-4 flex items-center gap-2">
          {invoice.status !== "paid" && (
            <button
              className="btn-primary flex-1 gap-1.5"
              onClick={() => onPay(invoice)}
            >
              <BanknotesIcon className="w-4 h-4" />
              تسجيل دفعة
            </button>
          )}
          <button
            className="btn-ghost px-3 gap-1.5"
            onClick={() => onEdit(invoice)}
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
          <button
            className="btn-ghost px-3 gap-1.5 text-danger hover:bg-danger-soft"
            onClick={() => onDelete(invoice)}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PaymentModal({ invoice, currencyMode, onClose, onConfirm }) {
  const maxAmount = invoice.balance > 0 ? invoice.balance : invoice.amount;
  const [amount, setAmount] = useState(String(maxAmount || ""));
  const [method, setMethod] = useState("cash");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    const paid = Number(amount);
    if (!paid || paid <= 0) return;
    setIsSaving(true);
    await onConfirm({ paidAmount: paid, method });
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
        className="card-modal w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="h3">تسجيل دفعة</h3>
            <div className="text-xs text-ink-mute mt-0.5 font-latin">{fmtInvoiceId(invoice.id)}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-mid grid place-items-center text-ink-mute"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Amount due reminder */}
          <div className="rounded-xl bg-warn-soft/30 border border-warn/20 px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-ink-mute">المستحق</span>
            <span className="font-bold text-warn">{formatMoneyByMode(maxAmount, currencyMode)}</span>
          </div>

          {/* Payment method */}
          <div>
            <label className="label-caps mb-2 block">طريقة الدفع</label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex-1 h-10 rounded-xl border text-sm font-semibold transition-all ${
                    method === m.id
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-surface-high bg-surface-low text-ink-mute hover:text-ink hover:border-surface-mid"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="label-caps mb-1.5 block">المبلغ المدفوع (ل.س)</label>
            <input
              type="number"
              className="input"
              value={amount}
              min={1}
              max={maxAmount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {Number(amount) < maxAmount && Number(amount) > 0 && (
              <div className="text-xs text-primary mt-1">
                سيُسجَّل كدفع جزئي — الرصيد المتبقي:{" "}
                {formatMoneyByMode(maxAmount - Number(amount), currencyMode)}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button className="btn-ghost" onClick={onClose} disabled={isSaving}>
            إلغاء
          </button>
          <button
            className="btn-primary gap-1.5"
            onClick={handleSubmit}
            disabled={isSaving || !Number(amount) || Number(amount) <= 0}
          >
            <BanknotesIcon className="w-4 h-4" />
            {isSaving ? "جارٍ الحفظ…" : "تأكيد الدفع"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function InvoiceEditorModal({ mode, invoice, onClose, onSave }) {
  const [form, setForm] = useState({
    patient: invoice?.patient || "",
    date: invoice?.date || "اليوم",
    amount: invoice?.amount || "",
    status: invoice?.status || "draft",
  });
  const [error, setError] = useState("");

  const submit = () => {
    if (!form.patient.trim()) return setError("اسم المريض مطلوب");
    if (!form.amount) return setError("المبلغ مطلوب");
    onSave({ ...form, amount: Number(form.amount) });
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
        className="card-modal w-full max-w-xl p-6"
      >
        <h3 className="h3 mb-5">
          {mode === "create" ? "إضافة فاتورة جديدة" : "تعديل الفاتورة"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="اسم المريض">
            <input
              className="input"
              value={form.patient}
              onChange={(e) => setForm((f) => ({ ...f, patient: e.target.value }))}
            />
          </Field>
          <Field label="التاريخ">
            <input
              className="input"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <Field label="المبلغ (ل.س)">
            <input
              type="number"
              className="input"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </Field>
          <Field label="الحالة">
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="draft">غير مدفوعة</option>
              <option value="partial">دفع جزئي</option>
              <option value="paid">مدفوعة</option>
            </select>
          </Field>
        </div>
        {error && <div className="text-xs text-danger mt-2">{error}</div>}
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={submit}>
            {mode === "create" ? "إضافة" : "حفظ التعديل"}
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
