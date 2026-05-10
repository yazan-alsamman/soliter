import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  TrophyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import StatCard from "../components/ui/StatCard.jsx";
import DualToneIcon from "../components/ui/DualToneIcon.jsx";
import ExportDialog from "../components/reports/ExportDialog.jsx";
import { useChartTheme } from "../hooks/useChartTheme.js";
import { useAppointments } from "../context/AppointmentsContext.jsx";
import { useBilling } from "../context/BillingContext.jsx";
import { usePatients } from "../context/PatientsContext.jsx";
import { useUsers } from "../context/UsersContext.jsx";
import { fmtMoney, fmtNumberAr, fmtPercentAr, LOCALE_AR_LATN } from "../data/strings.js";
import { exportReportPdf, exportReportExcel } from "../utils/reportExport.js";

const RANGES = [
  { id: "7",   label: "آخر 7 أيام", days: 7 },
  { id: "30",  label: "آخر 30 يوم", days: 30 },
  { id: "90",  label: "آخر 90 يوم", days: 90 },
  { id: "365", label: "آخر سنة",    days: 365 },
  { id: "all", label: "كل الفترات", days: null },
];

function inRange(dateLike, rangeStart) {
  if (!rangeStart) return true;
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() >= rangeStart.getTime();
}

function formatMonthKey(d) {
  return new Intl.DateTimeFormat(LOCALE_AR_LATN, {
    month: "short",
    year: "numeric",
  }).format(d);
}

const PAYMENT_TONE = {
  paid:    { label: "مدفوع",     color: "#10b981" },
  partial: { label: "جزئي",      color: "#f59e0b" },
  draft:   { label: "غير مدفوع", color: "#ef4444" },
};

export default function Reports() {
  const chartTheme = useChartTheme();
  const { items: appointments } = useAppointments();
  const { invoices } = useBilling();
  const { patients } = usePatients();
  const { users } = useUsers();

  const [rangeId, setRangeId] = useState("30");
  const [exporting, setExporting] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  const range = useMemo(() => RANGES.find((r) => r.id === rangeId) || RANGES[1], [rangeId]);
  const rangeStart = useMemo(() => {
    if (!range.days) return null;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - range.days);
    return d;
  }, [range]);

  const doctors = useMemo(
    () => users.filter((u) => u.role === "doctor"),
    [users]
  );
  const doctorById = useMemo(() => {
    const m = new Map();
    doctors.forEach((d) => m.set(d.id, d));
    return m;
  }, [doctors]);

  /* ── Filtered domains ────────────────────────────────────────────────── */
  const filteredAppts = useMemo(
    () =>
      appointments.filter((a) => {
        const d = a.appointmentStart || a.startTime;
        return d ? inRange(d, rangeStart) : !rangeStart;
      }),
    [appointments, rangeStart]
  );

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // BillingContext stores formatted date strings; fall back to all if unparseable
      const d = inv?.createdAt || inv?.date;
      if (!rangeStart) return true;
      if (!d) return true;
      const t = new Date(d);
      if (Number.isNaN(t.getTime())) return true;
      return t.getTime() >= rangeStart.getTime();
    });
  }, [invoices, rangeStart]);

  /* ── KPIs ────────────────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const totalRevenue = filteredInvoices
      .filter((inv) => inv.status === "paid" || inv.status === "partial")
      .reduce((s, inv) => s + Number(inv.paidAmount || 0), 0);

    const outstanding = filteredInvoices.reduce(
      (s, inv) => s + Number(inv.balance || 0),
      0
    );

    const completedAppts = filteredAppts.filter((a) =>
      ["completed", "paid"].includes(a.status)
    ).length;
    const cancelledAppts = filteredAppts.filter((a) =>
      ["cancelled", "no_show"].includes(a.status)
    ).length;

    const avgTicket =
      filteredInvoices.length > 0
        ? filteredInvoices.reduce(
            (s, inv) => s + Number(inv.amount || 0),
            0
          ) / filteredInvoices.length
        : 0;

    const newPatients = patients.filter((p) => p.status === "new").length;
    const totalPatients = patients.length;

    const showRate =
      filteredAppts.length > 0
        ? Math.round((completedAppts / filteredAppts.length) * 100)
        : 0;

    return {
      totalRevenue,
      outstanding,
      completedAppts,
      cancelledAppts,
      totalAppts: filteredAppts.length,
      avgTicket,
      newPatients,
      totalPatients,
      showRate,
    };
  }, [filteredAppts, filteredInvoices, patients]);

  /* ── Revenue by month ────────────────────────────────────────────────── */
  const revenueByMonth = useMemo(() => {
    const buckets = new Map();
    filteredInvoices.forEach((inv) => {
      const raw = inv.createdAt || inv.date;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = formatMonthKey(d);
      if (!buckets.has(key)) buckets.set(key, { key, month: label, revenue: 0, invoices: 0 });
      const row = buckets.get(key);
      row.revenue += Number(inv.paidAmount || 0);
      row.invoices += 1;
    });
    return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredInvoices]);

  /* ── Department volume ───────────────────────────────────────────────── */
  const deptVolume = useMemo(() => {
    const map = new Map();
    filteredAppts.forEach((a) => {
      const doc = doctorById.get(a.doctor);
      const dept = doc?.dept || "غير محدد";
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return [...map.entries()]
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAppts, doctorById]);

  /* ── Doctor load + revenue ───────────────────────────────────────────── */
  const doctorLoad = useMemo(() => {
    const map = new Map();
    doctors.forEach((d) =>
      map.set(d.id, {
        id: d.id,
        doctor: d.name,
        department: d.dept || "—",
        appointments: 0,
        completed: 0,
        revenue: 0,
      })
    );
    filteredAppts.forEach((a) => {
      const row = map.get(a.doctor);
      if (!row) return;
      row.appointments += 1;
      if (["completed", "paid"].includes(a.status)) row.completed += 1;
    });
    filteredInvoices.forEach((inv) => {
      const appt = filteredAppts.find((a) => a.id === inv.appointmentId);
      if (!appt) return;
      const row = map.get(appt.doctor);
      if (!row) return;
      row.revenue += Number(inv.paidAmount || 0);
    });
    return [...map.values()]
      .filter((r) => r.appointments > 0 || r.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue || b.appointments - a.appointments);
  }, [doctors, filteredAppts, filteredInvoices]);

  /* ── Payment mix ─────────────────────────────────────────────────────── */
  const paymentMix = useMemo(() => {
    const buckets = { paid: { count: 0, amount: 0 }, partial: { count: 0, amount: 0 }, draft: { count: 0, amount: 0 } };
    filteredInvoices.forEach((inv) => {
      const k = buckets[inv.status] ? inv.status : "draft";
      buckets[k].count += 1;
      buckets[k].amount += Number(inv.amount || 0);
    });
    return Object.entries(buckets)
      .filter(([, v]) => v.count > 0)
      .map(([status, v]) => ({
        status: PAYMENT_TONE[status]?.label || status,
        statusKey: status,
        count: v.count,
        amount: v.amount,
        color: PAYMENT_TONE[status]?.color || "#6b7280",
      }));
  }, [filteredInvoices]);

  /* ── Top services ────────────────────────────────────────────────────── */
  const topServices = useMemo(() => {
    const map = new Map();
    filteredAppts.forEach((a) => {
      const name = a.treatmentName || a.visitType || a.reason || "أخرى";
      if (!map.has(name)) map.set(name, { service: name, count: 0, revenue: 0 });
      const row = map.get(name);
      row.count += 1;
      row.revenue += Number(a.treatmentPrice || 0);
    });
    return [...map.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredAppts]);

  /* ── Patient flow distribution ───────────────────────────────────────── */
  const patientFlow = useMemo(() => {
    const order = [
      ["scheduled", "مجدول"],
      ["confirmed", "مؤكد"],
      ["arrived", "وصل"],
      ["in_consultation", "جلسة"],
      ["completed", "اكتمل"],
      ["paid", "مدفوع"],
      ["cancelled", "ملغى"],
      ["no_show", "لم يحضر"],
    ];
    const map = new Map(order.map(([k, label]) => [k, { status: label, statusKey: k, count: 0 }]));
    filteredAppts.forEach((a) => {
      const row = map.get(a.status);
      if (row) row.count += 1;
    });
    return [...map.values()].filter((r) => r.count > 0);
  }, [filteredAppts]);

  /* ── Outstanding invoices for export ────────────────────────────────── */
  const outstanding = useMemo(
    () =>
      filteredInvoices
        .filter((inv) => Number(inv.balance || 0) > 0)
        .map((inv) => ({
          patient: inv.patient,
          date: inv.date || inv.createdAt || "—",
          status: PAYMENT_TONE[inv.status]?.label || inv.status,
          balance: Number(inv.balance || 0),
        }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 50),
    [filteredInvoices]
  );

  /* ── Top performer ───────────────────────────────────────────────────── */
  const topPerformer = doctorLoad[0] || null;

  /* ── Export builders ─────────────────────────────────────────────────── */
  const buildKpiRows = () => [
    { metric: "إجمالي الإيرادات",   value: fmtMoney(kpis.totalRevenue),    note: range.label },
    { metric: "أرصدة معلقة",        value: fmtMoney(kpis.outstanding),     note: "غير مدفوعة" },
    { metric: "مواعيد مكتملة",      value: fmtNumberAr(kpis.completedAppts), note: `من ${fmtNumberAr(kpis.totalAppts)}` },
    { metric: "نسبة الحضور",        value: fmtPercentAr(kpis.showRate),    note: "Show Rate" },
    { metric: "متوسط قيمة الفاتورة", value: fmtMoney(kpis.avgTicket),       note: "Average Ticket" },
    { metric: "المرضى الجدد",        value: fmtNumberAr(kpis.newPatients),  note: `من ${fmtNumberAr(kpis.totalPatients)}` },
    { metric: "حالات إلغاء/عدم حضور", value: fmtNumberAr(kpis.cancelledAppts), note: "" },
  ];

  const handleExport = async ({ format, selection }) => {
    setExporting(format);
    setExportOpen(false);
    try {
      const ts = new Date().toISOString().slice(0, 10);
      const subtitle = `${range.label} · ${new Date().toLocaleDateString(LOCALE_AR_LATN)}`;

      if (format === "pdf") {
        await exportReportPdf({
          fileName: `mediflow-report-${ts}.pdf`,
          title: "Clinical Operations Report",
          subtitle,
          selection,
          kpis: buildKpiRows(),
          revenueByMonth: revenueByMonth.map((r) => ({
            month: r.month, revenue: fmtMoney(r.revenue), invoices: fmtNumberAr(r.invoices),
          })),
          deptVolume: deptVolume.map((d) => ({ department: d.department, count: fmtNumberAr(d.count) })),
          doctorLoad: doctorLoad.map((d) => ({
            doctor: d.doctor, department: d.department,
            appointments: fmtNumberAr(d.appointments), revenue: fmtMoney(d.revenue),
          })),
          paymentMix: paymentMix.map((p) => ({
            status: p.status, count: fmtNumberAr(p.count), amount: fmtMoney(p.amount),
          })),
          topServices: topServices.map((s) => ({
            service: s.service, count: fmtNumberAr(s.count), revenue: fmtMoney(s.revenue),
          })),
          outstanding: outstanding.map((o) => ({ ...o, balance: fmtMoney(o.balance) })),
        });
      } else {
        exportReportExcel({
          fileName: `mediflow-data-${ts}.xlsx`,
          selection,
          kpis: buildKpiRows(),
          revenueByMonth: revenueByMonth.map((r) => ({
            month: r.month, revenue: r.revenue, invoices: r.invoices,
          })),
          deptVolume: deptVolume.map((d) => ({ department: d.department, count: d.count })),
          doctorLoad: doctorLoad.map((d) => ({
            doctor: d.doctor, department: d.department,
            appointments: d.appointments, revenue: d.revenue,
          })),
          paymentMix: paymentMix.map((p) => ({
            status: p.status, count: p.count, amount: p.amount,
          })),
          topServices,
          patientFlow,
          outstanding,
          appointments: filteredAppts.map((a) => ({
            id: a.id,
            patient: a.patient,
            patientId: a.patientId,
            doctor: doctorById.get(a.doctor)?.name || a.doctor,
            department: doctorById.get(a.doctor)?.dept || "—",
            start: a.appointmentStart || `${a.day} ${a.start}`,
            duration_h: a.duration,
            status: a.status,
            service: a.treatmentName || a.visitType || a.reason,
            price: Number(a.treatmentPrice || 0),
            urgent: a.urgent ? "yes" : "no",
            overbooked: a.overbooked ? "yes" : "no",
          })),
          invoices: filteredInvoices.map((inv) => ({
            id: inv.id,
            patient: inv.patient,
            patientId: inv.patientId,
            appointmentId: inv.appointmentId,
            date: inv.date,
            amount: Number(inv.amount || 0),
            paid: Number(inv.paidAmount || 0),
            balance: Number(inv.balance || 0),
            status: inv.status,
            paymentMethod: inv.paymentMethod,
          })),
          patients: patients.map((p) => ({
            id: p.id,
            name: p.name,
            phone: p.phone,
            sex: p.sex,
            age: p.age,
            status: p.status,
            bloodType: p.bloodType,
            lastVisit: p.lastVisit,
            nextAppointment: p.nextAppointment,
          })),
        });
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      window.alert(`تعذّر تصدير الملف.\n${msg}`);
    } finally {
      setTimeout(() => setExporting(null), 600);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────── */
  const hasNoData =
    filteredAppts.length === 0 && filteredInvoices.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <div className="label-caps text-primary">الأداء والتحليلات</div>
          <h1 className="h1 mt-1">أداء العيادة</h1>
          <p className="text-ink-variant mt-1 max-w-xl">
            مؤشرات حية مبنية على بيانات النظام — مواعيد، فواتير، مرضى وأطباء.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Range picker */}
          <div className="flex items-center gap-0.5 bg-surface-low rounded-xl p-0.5 border border-surface-high">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRangeId(r.id)}
                className={`px-2.5 py-1.5 rounded-[10px] text-[11px] font-bold transition-all ${
                  rangeId === r.id
                    ? "bg-primary text-white shadow-focus"
                    : "text-ink-variant hover:text-ink-default"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Export trigger */}
          <button
            onClick={() => setExportOpen(true)}
            disabled={exporting !== null}
            className="btn-primary h-9 px-4 text-xs gap-1.5 rounded-xl disabled:opacity-50"
          >
            <DualToneIcon
              icon={DocumentArrowDownIcon}
              className="w-4 h-4"
              primaryClass="text-white"
              secondaryClass="text-white/45"
            />
            {exporting ? "جارٍ التصدير…" : "تصدير التقرير"}
          </button>
        </div>
      </div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        range={range.label}
      />

      {hasNoData && (
        <div className="card-pad text-center py-10">
          <p className="text-ink-variant text-sm font-semibold">
            لا توجد بيانات في الفترة المحددة
          </p>
          <p className="text-ink-mute text-xs mt-1">
            جرب توسيع النطاق الزمني أو التحقق من اتصال الخادم.
          </p>
        </div>
      )}

      {!hasNoData && (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              label="إجمالي الإيرادات"
              value={fmtMoney(kpis.totalRevenue)}
              hint={`${fmtNumberAr(filteredInvoices.length)} فاتورة`}
              icon={CurrencyDollarIcon}
              tone="success"
            />
            <StatCard
              label="مواعيد مكتملة"
              value={fmtNumberAr(kpis.completedAppts)}
              delta={`${fmtPercentAr(kpis.showRate)}`}
              hint={`من إجمالي ${fmtNumberAr(kpis.totalAppts)}`}
              icon={CheckCircleIcon}
              tone="primary"
            />
            <StatCard
              label="أرصدة معلقة"
              value={fmtMoney(kpis.outstanding)}
              hint={`${fmtNumberAr(outstanding.length)} فاتورة غير مكتملة`}
              icon={ExclamationTriangleIcon}
              tone={kpis.outstanding > 0 ? "warn" : "success"}
            />
            <StatCard
              label="متوسط قيمة الفاتورة"
              value={fmtMoney(kpis.avgTicket)}
              hint={`${fmtNumberAr(kpis.newPatients)} مريض جديد`}
              icon={ChartBarIcon}
              tone="pulse"
            />
          </div>

          {/* Revenue trend + Payment mix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="card-pad lg:col-span-2">
              <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <div>
                  <h2 className="h3">اتجاه الإيرادات الشهري</h2>
                  <p className="text-xs text-ink-mute">المبالغ المحصلة فعلياً</p>
                </div>
                <span className="chip bg-primary-soft text-primary text-[10px]">
                  {fmtNumberAr(revenueByMonth.length)} شهر
                </span>
              </div>
              <div className="h-72">
                {revenueByMonth.length === 0 ? (
                  <EmptyChart message="لا توجد فواتير لرسم الاتجاه." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.cartesianGrid} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        reversed
                      />
                      <YAxis
                        tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        orientation="right"
                        tickFormatter={(v) => fmtNumberAr(v)}
                      />
                      <Tooltip
                        contentStyle={chartTheme.tooltipStyle}
                        labelStyle={chartTheme.tooltipLabelStyle}
                        itemStyle={chartTheme.tooltipItemStyle}
                        wrapperStyle={chartTheme.tooltipWrapperStyle}
                        formatter={(v, name) =>
                          name === "revenue" ? fmtMoney(v) : fmtNumberAr(v)
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke={chartTheme.linePrimary}
                        strokeWidth={3}
                        dot={chartTheme.linePrimaryDot}
                        activeDot={chartTheme.linePrimaryActiveDot}
                        isAnimationActive
                        animationDuration={900}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Payment mix */}
            <div className="card-pad">
              <h2 className="h3 mb-3">توزيع المدفوعات</h2>
              <div className="h-56">
                {paymentMix.length === 0 ? (
                  <EmptyChart message="لا توجد فواتير." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMix}
                        dataKey="amount"
                        nameKey="status"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={2}
                        isAnimationActive
                        animationDuration={700}
                      >
                        {paymentMix.map((p, i) => (
                          <Cell key={i} fill={p.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTheme.tooltipStyle}
                        labelStyle={chartTheme.tooltipLabelStyle}
                        itemStyle={chartTheme.tooltipItemStyle}
                        wrapperStyle={chartTheme.tooltipWrapperStyle}
                        formatter={(value) => fmtMoney(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2 space-y-1.5">
                {paymentMix.map((p) => (
                  <div
                    key={p.statusKey}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 text-ink-variant">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: p.color }}
                      />
                      {p.status}
                    </span>
                    <span className="font-bold tabular-nums text-ink">
                      {fmtMoney(p.amount)}
                      <span className="text-ink-mute font-medium ml-1">
                        ({fmtNumberAr(p.count)})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top performer + Department + Patient flow */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {topPerformer && (
              <div className="card-pad">
                <h3 className="h3 flex items-center gap-2">
                  <TrophyIcon className="w-5 h-5 text-primary" /> أفضل طبيب أداءً
                </h3>
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary grid place-items-center font-display font-bold">
                    {topPerformer.doctor
                      .replace("د. ", "")
                      .split(" ")
                      .map((p) => p[0] || "")
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink truncate">
                      {topPerformer.doctor}
                    </div>
                    <div className="text-xs text-ink-mute truncate">
                      {topPerformer.department} · {fmtNumberAr(topPerformer.appointments)} موعد
                    </div>
                  </div>
                  <div className="font-display font-bold text-secondary text-end">
                    {fmtMoney(topPerformer.revenue)}
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  {doctorLoad.slice(1, 4).map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between text-xs text-ink-variant"
                    >
                      <span className="truncate">{d.doctor}</span>
                      <span className="font-bold tabular-nums">
                        {fmtMoney(d.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card-pad lg:col-span-1">
              <h3 className="h3 mb-3">حجم المرضى حسب القسم</h3>
              <div className="h-44">
                {deptVolume.length === 0 ? (
                  <EmptyChart message="لا مواعيد ضمن النطاق." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptVolume}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={chartTheme.cartesianGrid}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="department"
                        tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        reversed
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={chartTheme.tooltipStyle}
                        labelStyle={chartTheme.tooltipLabelStyle}
                        itemStyle={chartTheme.tooltipItemStyle}
                        wrapperStyle={chartTheme.tooltipWrapperStyle}
                        formatter={(v) => fmtNumberAr(v)}
                      />
                      <Bar
                        dataKey="count"
                        fill={chartTheme.barPrimary}
                        radius={[6, 6, 0, 0]}
                        isAnimationActive
                        animationDuration={700}
                      >
                        <LabelList
                          dataKey="count"
                          position="top"
                          formatter={(v) => fmtNumberAr(v)}
                          fill={chartTheme.axisTick}
                          fontSize={11}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="card-pad">
              <h3 className="h3 mb-3 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-primary" />
                مسار المرضى
              </h3>
              <div className="space-y-2">
                {patientFlow.length === 0 ? (
                  <p className="text-xs text-ink-mute text-center py-6">
                    لا مواعيد لعرض المسار.
                  </p>
                ) : (
                  patientFlow.map((p) => {
                    const total = patientFlow.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
                    return (
                      <div key={p.statusKey}>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-ink-variant font-semibold">{p.status}</span>
                          <span className="tabular-nums text-ink-mute">
                            {fmtNumberAr(p.count)} · {fmtPercentAr(pct)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-surface-mid rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6 }}
                            className={`h-full rounded-full ${
                              ["paid", "completed"].includes(p.statusKey)
                                ? "bg-success"
                                : ["cancelled", "no_show"].includes(p.statusKey)
                                ? "bg-danger"
                                : "bg-primary"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Doctor performance table */}
          <div className="card-pad">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="h3">أداء الأطباء</h2>
                <p className="text-xs text-ink-mute">
                  {fmtNumberAr(doctorLoad.length)} طبيب · مرتب حسب الإيرادات
                </p>
              </div>
              <span className="chip bg-primary-soft text-primary text-[10px]">
                {range.label}
              </span>
            </div>

            <div className="overflow-x-auto">
              {doctorLoad.length === 0 ? (
                <p className="text-center py-8 text-xs text-ink-mute">
                  لا يوجد أطباء بمواعيد ضمن النطاق.
                </p>
              ) : (
                <table className="min-w-full lux-table">
                  <thead>
                    <tr>
                      <Th>الطبيب</Th>
                      <Th>القسم</Th>
                      <Th className="text-end">المواعيد</Th>
                      <Th className="text-end">المكتملة</Th>
                      <Th className="text-end">الإيرادات</Th>
                      <Th>نسبة الإنجاز</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorLoad.map((d, i) => {
                      const completion =
                        d.appointments > 0
                          ? Math.round((d.completed / d.appointments) * 100)
                          : 0;
                      return (
                        <motion.tr
                          key={d.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.4) }}
                          className="border-t border-surface-low hover:bg-surface-low/60 transition"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
                                {d.doctor
                                  .replace("د. ", "")
                                  .split(" ")
                                  .map((p) => p[0] || "")
                                  .slice(0, 2)
                                  .join("")}
                              </div>
                              <div className="text-sm font-semibold text-ink truncate">
                                {d.doctor}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-ink-variant">
                            {d.department}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-end font-bold tabular-nums">
                            {fmtNumberAr(d.appointments)}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-end tabular-nums text-ink-variant">
                            {fmtNumberAr(d.completed)}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-end font-bold text-secondary tabular-nums">
                            {fmtMoney(d.revenue)}
                          </td>
                          <td className="px-5 py-3.5 w-44">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-surface-mid rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${completion}%` }}
                                  transition={{ duration: 0.6 }}
                                  className={`h-full rounded-full ${
                                    completion >= 80
                                      ? "bg-success"
                                      : completion >= 50
                                      ? "bg-primary"
                                      : "bg-warn"
                                  }`}
                                />
                              </div>
                              <span className="text-xs font-semibold text-ink-mute w-9 text-end tabular-nums">
                                {fmtPercentAr(completion)}
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Top services + Outstanding */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card-pad">
              <h3 className="h3 mb-3 flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-primary" />
                أكثر الخدمات طلباً
              </h3>
              <div className="space-y-2">
                {topServices.length === 0 ? (
                  <p className="text-xs text-ink-mute py-6 text-center">
                    لا توجد خدمات لعرضها.
                  </p>
                ) : (
                  topServices.map((s, i) => {
                    const max = topServices[0]?.count || 1;
                    const pct = Math.round((s.count / max) * 100);
                    return (
                      <div key={s.service}>
                        <div className="flex items-center justify-between text-[12px] mb-1">
                          <span className="text-ink truncate font-semibold">
                            {i + 1}. {s.service}
                          </span>
                          <span className="text-ink-mute tabular-nums shrink-0 ms-2">
                            {fmtNumberAr(s.count)} · {fmtMoney(s.revenue)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-surface-mid rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: i * 0.04 }}
                            className="h-full rounded-full bg-primary/70"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="card-pad">
              <h3 className="h3 mb-3 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-warn" />
                أكبر الأرصدة المعلقة
              </h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pe-1">
                {outstanding.length === 0 ? (
                  <p className="text-xs text-ink-mute text-center py-6">
                    لا توجد أرصدة معلقة. جميع الفواتير محصلة.
                  </p>
                ) : (
                  outstanding.slice(0, 8).map((o, i) => (
                    <div
                      key={`${o.patient}-${i}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-warn-soft/30 border border-warn/15"
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-ink truncate">
                          {o.patient}
                        </p>
                        <p className="text-[10px] text-ink-mute truncate">
                          {o.date} · {o.status}
                        </p>
                      </div>
                      <span className="text-[12px] font-black text-warn tabular-nums shrink-0 ms-2">
                        {fmtMoney(o.balance)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer summary */}
          <div className="card-pad bg-surface-low/40 flex flex-wrap gap-x-8 gap-y-3 text-xs text-ink-variant">
            <FootStat icon={CalendarDaysIcon} label="مواعيد" value={fmtNumberAr(filteredAppts.length)} />
            <FootStat icon={UserGroupIcon}  label="مرضى"   value={fmtNumberAr(patients.length)} />
            <FootStat icon={CurrencyDollarIcon} label="فواتير" value={fmtNumberAr(filteredInvoices.length)} />
            <FootStat icon={ClockIcon} label="حالات إلغاء" value={fmtNumberAr(kpis.cancelledAppts)} />
            <span className="ms-auto text-[10px] text-ink-mute">
              تم التوليد في {new Date().toLocaleString(LOCALE_AR_LATN)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function FootStat({ icon: Icon, label, value }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <span className="text-ink-mute">{label}:</span>
      <span className="font-bold text-ink tabular-nums">{value}</span>
    </span>
  );
}

function Th({ children, className = "" }) {
  return <th className={`px-5 py-3 label-caps text-start ${className}`}>{children}</th>;
}

function EmptyChart({ message }) {
  return (
    <div className="h-full grid place-items-center text-xs text-ink-mute">
      {message}
    </div>
  );
}
