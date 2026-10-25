import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  SparklesIcon,
  ClockIcon,
  CalendarDaysIcon,
  UsersIcon,
  UserCircleIcon,
  CreditCardIcon,
  CheckCircleIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { ROLES, useAuth } from "../context/AuthContext.jsx";
import { useAppointments } from "../context/AppointmentsContext.jsx";
import { useBilling } from "../context/BillingContext.jsx";
import { useUsers } from "../context/UsersContext.jsx";
import { usePatients } from "../context/PatientsContext.jsx";
import { useAppDialog } from "../context/AppDialogContext.jsx";
import QueueBoard from "../components/dashboard/QueueBoard.jsx";
import DoctorQueueBoard from "../components/dashboard/DoctorQueueBoard.jsx";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { REVENUE } from "../data/mock.js";
import { fmtNumberAr, fmtTime, isSameLocalCalendarDay, LOCALE_AR_LATN } from "../data/strings.js";
import { useChartTheme } from "../hooks/useChartTheme.js";

export default function Dashboard() {
  const { role, user } = useAuth();
  const { users } = useUsers();
  const { invoices } = useBilling();
  const { items: appts, setAppointmentStatus, refreshAppointments } = useAppointments();
  // Loading is true until appointments context delivers its first real batch.
  // This prevents "0 مواعيد" from briefly rendering as a true count.
  const [loading, setLoading] = useState(true);
  const [dayTick, setDayTick] = useState(0);

  useEffect(() => {
    if (appts.length > 0 || invoices.length > 0) {
      setLoading(false);
    }
  }, [appts.length, invoices.length]);

  // Fallback: if data is genuinely empty after 4s, stop showing skeleton
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 4000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setDayTick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const scopedAppointments = useMemo(() => appts, [appts]);

  const today = useMemo(() => {
    const anchor = new Date();
    return scopedAppointments.filter((a) => {
      if (a.appointmentStart) return isSameLocalCalendarDay(a.appointmentStart, anchor);
      return Number(a.day) === 0;
    });
  }, [scopedAppointments, dayTick]);

  const queue = useMemo(
    () => ({
      waiting: today.filter((a) => ["scheduled", "confirmed", "arrived"].includes(a.status)),
      inConsultation: today.filter((a) => a.status === "in_consultation"),
      done: today.filter((a) => a.status === "paid"),
      waitingPayment: today.filter((a) => a.status === "completed"),
    }),
    [today]
  );

  const operationalPressure = useMemo(() => {
    const score =
      queue.waiting.length * 9 +
      queue.inConsultation.length * 7 +
      queue.waitingPayment.length * 4 +
      today.filter((a) => a.urgent).length * 14 +
      today.filter((a) => a.overbooked).length * 12;
    if (score >= 65) return { label: "حرج", tone: "text-danger" };
    if (score >= 38) return { label: "مرتفع", tone: "text-warn" };
    if (score >= 20) return { label: "متوسط", tone: "text-primary" };
    return { label: "مستقر", tone: "text-secondary" };
  }, [queue, today]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-52 rounded-2xl skeleton-shimmer" />
        <div className="h-16 rounded-xl skeleton-shimmer" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-96 rounded-xl skeleton-shimmer" />
          <div className="h-96 rounded-xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (role === ROLES.DOCTOR) {
    return (
      <DoctorDashboard
        user={user}
        today={today}
        queue={queue}
        users={users}
        refreshAppointments={refreshAppointments}
      />
    );
  }

  if (role === ROLES.RECEPTIONIST) {
    return (
      <ReceptionistDashboard
        today={today}
        queue={queue}
        users={users}
        setAppointmentStatus={setAppointmentStatus}
        refreshAppointments={refreshAppointments}
      />
    );
  }

  return (
    <div className="space-y-8">
      <MorningBriefing userName={user?.name ?? "فريق العيادة"} today={today} />
      <OperationalKpis queue={queue} todayCount={today.length} today={today} invoices={invoices} />
      <QuickCalendarView today={today} users={users} />
      {role === ROLES.ADMIN && (
        <AdminAnalyticsSection operationalPressure={operationalPressure} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DOCTOR DASHBOARD — same queue board as reception, scoped to this doctor
═══════════════════════════════════════════════════════════════════ */

function DoctorDashboard({ user, today, queue, users, refreshAppointments }) {
  const { invoices } = useBilling();

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshAppointments().catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [refreshAppointments]);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-pad"
      >
        <h2 className="h3">لوحة الطبيب — {user?.name ?? ""}</h2>
        <p className="text-sm text-ink-mute mt-1 leading-relaxed">
          ثلاث مراحل خاصة بالطبيب: مرضى وضعهم الاستقبال كـ «وصل»، ثم جلستك، ثم مراجعة الفاتورة وإرسال تنبيه للاستقبال
          لإتمام التحصيل.
        </p>
      </motion.div>

      <OperationalKpis queue={queue} todayCount={today.length} today={today} invoices={invoices} />

      <DoctorQueueBoard title="طابور مرضاك اليوم" />

      <TodayScheduleCard today={today} users={users} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RECEPTIONIST DASHBOARD
═══════════════════════════════════════════════════════════════════ */

function receptionDoctorName(users, doctorId) {
  const u = users.find((x) => x.id === doctorId && String(x.role || "").toLowerCase() === "doctor");
  return u?.name || "الطبيب";
}

function ReceptionistDashboard({ today, queue, users, setAppointmentStatus, refreshAppointments }) {
  const { invoices } = useBilling();
  const todayIds = useMemo(() => new Set(today.map((a) => a.id)), [today]);
  const todayRevenue = useMemo(() => {
    return invoices
      .filter((i) => todayIds.has(i.appointmentId) && i.status === "paid")
      .reduce((s, i) => s + (Number(i.paidAmount) || Number(i.amount) || 0), 0);
  }, [invoices, todayIds]);
  const unpaidPatientsCount = useMemo(() => {
    return invoices.filter(
      (i) => todayIds.has(i.appointmentId) && i.status !== "paid" && Number(i.balance || i.amount || 0) > 0
    ).length;
  }, [invoices, todayIds]);
  const revenueByDoctorLabel = useMemo(() => {
    const map = {};
    for (const inv of invoices) {
      if (!todayIds.has(inv.appointmentId) || inv.status !== "paid") continue;
      const appt = today.find((a) => a.id === inv.appointmentId);
      if (!appt) continue;
      const key = receptionDoctorName(users, appt.doctor);
      map[key] = (map[key] || 0) + (Number(inv.paidAmount) || Number(inv.amount) || 0);
    }
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return top ? `${top[0]} · ${fmtNumberAr(top[1])} ل.س` : "—";
  }, [invoices, today, todayIds, users]);
  const completedVisits = useMemo(
    () => today.filter((a) => a.status === "completed" || a.status === "paid").length,
    [today]
  );
  const noShowCount = useMemo(() => today.filter((a) => a.status === "no_show").length, [today]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshAppointments().catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [refreshAppointments]);

  return (
    <div className="space-y-5">
      <NowHeroCard
        today={today}
        users={users}
        setAppointmentStatus={setAppointmentStatus}
        refreshAppointments={refreshAppointments}
      />
      <StatsStrip
        today={today}
        queue={queue}
        revenue={todayRevenue}
        unpaidPatientsCount={unpaidPatientsCount}
        revenueByDoctorLabel={revenueByDoctorLabel}
        completedVisits={completedVisits}
        noShowCount={noShowCount}
      />
      {/* Queue Board: full-width comprehensive patient flow tracker */}
      <QueueBoard />
      {/* Today's schedule below */}
      <TodayScheduleCard today={today} users={users} />
    </div>
  );
}

/* ── NOW Hero Card ───────────────────────────────────────────────── */
function NowHeroCard({ today, users, setAppointmentStatus, refreshAppointments }) {
  const navigate = useNavigate();
  const { alert } = useAppDialog();
  const { patients } = usePatients();
  const [now, setNow] = useState(new Date());
  const [skipIds, setSkipIds] = useState(() => new Set());
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const waitingLine = useMemo(
    () =>
      [...today]
        .filter((a) => ["scheduled", "confirmed", "arrived"].includes(a.status))
        .sort((a, b) => a.start - b.start || String(a.id).localeCompare(String(b.id))),
    [today]
  );

  const sortedToday = useMemo(
    () => [...today].sort((a, b) => a.start - b.start || String(a.id).localeCompare(String(b.id))),
    [today]
  );

  // Skip patients the receptionist already cycled past in this session
  const focusLine = useMemo(
    () => waitingLine.filter((a) => !skipIds.has(a.id)),
    [waitingLine, skipIds]
  );
  const next = focusLine[0] || waitingLine[0] || sortedToday[0] || null;
  const upcoming = sortedToday.filter((a) => a.id !== next?.id).slice(0, 3);
  const queuePos = next ? waitingLine.findIndex((a) => a.id === next.id) + 1 : 0;

  // Look up the patient record for tel: + name
  const nextPatient = useMemo(() => {
    if (!next) return null;
    if (next.patientId) return patients.find((p) => p.id === next.patientId) || null;
    if (next.patient) return patients.find((p) => p.name === next.patient) || null;
    return null;
  }, [next, patients]);
  const phone = nextPatient?.phone && !/^auto-/i.test(nextPatient.phone)
    ? nextPatient.phone
    : null;

  const registerNextArrival = async () => {
    const target =
      focusLine.find((a) => a.status === "scheduled" || a.status === "confirmed")
      || waitingLine.find((a) => a.status === "scheduled" || a.status === "confirmed")
      || null;
    if (!target) return;
    setPendingAction("arrival");
    try {
      await setAppointmentStatus(target.id, "arrived");
      await refreshAppointments().catch(() => {});
    } finally {
      setPendingAction(null);
    }
  };

  const startConsultation = async () => {
    if (!next) return;
    if (next.status !== "arrived") return;
    setPendingAction("session");
    try {
      await setAppointmentStatus(next.id, "in_consultation");
      await refreshAppointments().catch(() => {});
    } finally {
      setPendingAction(null);
    }
  };

  const callPatient = () => {
    if (!next) return;
    // Tel link if phone available; alert otherwise
    if (phone) {
      try {
        window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
      } catch {
        // ignored — fall back to dialog
      }
    }
    void alert({
      title: `استدعاء ${next.patient}`,
      message: phone
        ? `جاري الاتصال بالرقم ${phone} — رقم الطابور: ${fmtNumberAr(queuePos || 1)}`
        : `لا يوجد رقم هاتف مسجل لهذا المريض. الرجاء التوجّه إلى شباك الاستقبال — رقم الطابور: ${fmtNumberAr(queuePos || 1)}`,
      confirmText: "تم",
    });
  };

  const skipToNextPatient = () => {
    if (!next) return;
    setSkipIds((prev) => {
      const n = new Set(prev);
      n.add(next.id);
      return n;
    });
  };

  const reschedule = () => {
    if (!next) {
      navigate("/appointments");
      return;
    }
    navigate(`/appointments?reschedule=${encodeURIComponent(next.id)}`);
  };

  const urgentCount = today.filter((a) => a.urgent || a.overbooked).length;

  const fmtClock = (d) =>
    new Intl.DateTimeFormat(LOCALE_AR_LATN, { hour: "2-digit", minute: "2-digit" }).format(d);

  // Primary button: depends on current next-patient status
  const primaryAction = useMemo(() => {
    if (!next) return null;
    if (next.status === "arrived") {
      return {
        label: pendingAction === "session" ? "جاري البدء…" : "بدء الجلسة",
        onClick: startConsultation,
        Icon: CheckCircleIcon,
        busy: pendingAction === "session",
      };
    }
    return {
      label: pendingAction === "arrival" ? "جاري التسجيل…" : "تسجيل وصول",
      onClick: registerNextArrival,
      Icon: CheckCircleIcon,
      busy: pendingAction === "arrival",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, pendingAction]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-pad">
      <div className="flex flex-col xl:flex-row xl:items-stretch gap-0">
        {/* RIGHT (start in RTL): next patient info */}
        <div className="flex-1 min-w-0 xl:pe-6">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-mute">
              <span className="w-2 h-2 rounded-full bg-success" />
              الآن {fmtClock(now)}
            </div>
            <div className="flex items-center gap-2">
              {queuePos > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-soft text-primary border border-primary/20">
                  رقم الطابور {fmtNumberAr(queuePos)}
                </span>
              )}
              {urgentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-danger-soft text-danger border border-danger/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                  {fmtNumberAr(urgentCount)} حالة عاجلة
                </span>
              )}
            </div>
          </div>

          {next ? (
            <>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-ink leading-tight mb-3">
                التالي: {next.patient}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-mute mb-5">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="w-4 h-4 text-primary shrink-0" />
                  {fmtTime(next.start)}
                </span>
                <span className="text-ink-line">·</span>
                <span>{receptionDoctorName(users, next.doctor)}</span>
                {next.reason && (
                  <>
                    <span className="text-ink-line">·</span>
                    <span>{next.reason}</span>
                  </>
                )}
                {phone && (
                  <>
                    <span className="text-ink-line">·</span>
                    <a
                      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                    >
                      <PhoneIcon className="w-3.5 h-3.5" />
                      {phone}
                    </a>
                  </>
                )}
                {(next.urgent || next.overbooked) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger-soft text-danger border border-danger/20">
                    طارئ
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {primaryAction && (
                  <button
                    type="button"
                    onClick={primaryAction.onClick}
                    disabled={primaryAction.busy}
                    className="btn-primary h-10 px-4 text-sm flex items-center gap-2 disabled:opacity-60"
                  >
                    <primaryAction.Icon className="w-4 h-4" />
                    {primaryAction.label}
                  </button>
                )}
                <button
                  type="button"
                  className="hero-btn-outline"
                  onClick={callPatient}
                  disabled={!next}
                >
                  <PhoneIcon className="w-4 h-4" />
                  استدعاء
                </button>
                <button
                  type="button"
                  className="hero-btn-outline"
                  onClick={skipToNextPatient}
                  disabled={focusLine.length <= 1}
                  title="تخطي إلى المريض التالي في الطابور"
                >
                  <UsersIcon className="w-4 h-4" />
                  المريض التالي
                </button>
                <button
                  type="button"
                  className="hero-btn-outline"
                  onClick={reschedule}
                >
                  إعادة جدولة
                </button>
              </div>
            </>
          ) : (
            <div className="py-8 text-ink-mute text-sm">لا يوجد مواعيد اليوم.</div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden xl:block w-px bg-surface-high my-1" />

        {/* LEFT (end in RTL): upcoming appointments */}
        <div className="xl:w-[260px] shrink-0 xl:ps-6 pt-4 xl:pt-0 border-t xl:border-t-0 border-surface-high">
          <div className="text-xs font-semibold text-ink-mute mb-3 uppercase tracking-wide">
            المواعيد القادمة
          </div>
          <div className="space-y-2.5">
            {upcoming.length === 0 && (
              <div className="text-xs text-ink-mute py-1">
                {next ? "لا توجد مواعيد لاحقة اليوم." : "لا يوجد مواعيد."}
              </div>
            )}
            {upcoming.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-surface-high/80 bg-surface-low/40 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  {/* RIGHT (start): time + urgent dot */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(item.urgent || item.overbooked) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                    )}
                    <span className="text-xs font-bold text-primary">{fmtTime(item.start)}</span>
                  </div>
                  {/* LEFT (end): patient name */}
                  <span className="text-sm font-semibold text-ink truncate">{item.patient}</span>
                </div>
                <div className="text-[11px] text-ink-mute mt-1 truncate">
                  {receptionDoctorName(users, item.doctor)} · {item.reason || "زيارة"}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/appointments")}
            className="mt-3 text-xs font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 transition-colors"
          >
            عرض جدول اليوم ({fmtNumberAr(today.length)}) ←
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Stats Strip ─────────────────────────────────────────────────── */
function StatsStrip({
  today,
  queue,
  revenue,
  unpaidPatientsCount = 0,
  revenueByDoctorLabel = "—",
  completedVisits,
  noShowCount = 0,
}) {
  const visitsToday = today.length;
  const completed = completedVisits ?? today.filter((a) => a.status === "paid" || a.status === "completed").length;
  const stats = [
    { label: "زيارات اليوم", value: visitsToday, tone: "text-ink" },
    { label: "مكتملة", value: completed, tone: "text-success" },
    { label: "لم يحضر", value: noShowCount, tone: "text-danger" },
    { label: "بانتظار", value: queue.waiting.length, tone: "text-warn" },
    { label: "عند الطبيب", value: queue.inConsultation.length, tone: "text-primary" },
    { label: "غير مدفوع", value: unpaidPatientsCount, tone: "text-danger" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-stretch divide-x divide-surface-high rtl:divide-x-reverse overflow-x-auto">
        {stats.map((s) => (
          <div key={s.label} className="flex-1 min-w-[76px] px-3 py-3 text-center">
            <div className="text-[11px] text-ink-mute mb-1">{s.label}</div>
            <div className={`font-display text-xl font-bold leading-none ${s.tone}`}>
              {fmtNumberAr(s.value)}
            </div>
          </div>
        ))}
        <div className="flex-1 min-w-[110px] px-3 py-3 text-center">
          <div className="text-[11px] text-ink-mute mb-1">إيراد اليوم</div>
          <div className="font-display text-lg font-bold text-ink leading-none">
            {fmtNumberAr(revenue || 0)} <span className="text-xs font-medium text-ink-mute">ل.س</span>
          </div>
        </div>
        <div className="flex-1 min-w-[140px] px-3 py-3 text-center">
          <div className="text-[11px] text-ink-mute mb-1">أعلى طبيب إيراداً</div>
          <div className="text-[11px] font-semibold text-ink leading-snug line-clamp-2">{revenueByDoctorLabel}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Today Schedule Card ─────────────────────────────────────────── */
function TodayScheduleCard({ today, users }) {
  const START = 8;
  const END = 17;
  const span = END - START;
  const sorted = [...today].sort((a, b) => a.start - b.start);
  const now = new Date();
  const nowFraction = now.getHours() + now.getMinutes() / 60;
  const showNowMarker = nowFraction >= START && nowFraction <= END;

  function dotClass(item) {
    if (item.urgent || item.overbooked) return "bg-danger ring-2 ring-danger/20";
    if (item.status === "paid") return "bg-success ring-2 ring-success/20";
    if (item.status === "in_consultation") return "bg-primary ring-2 ring-primary/20";
    if (["scheduled", "confirmed", "arrived"].includes(item.status)) return "bg-warn ring-2 ring-warn/20";
    return "bg-surface-highest";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-pad flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="h3">جدول اليوم</h2>
        <span className="text-xs text-ink-mute">8 ص — 5 م</span>
      </div>

      {/* Timeline dots */}
      <div dir="ltr" className="relative px-1 mb-4">
        <div className="flex justify-between text-[10px] text-ink-mute mb-2 font-medium">
          {[8, 10, 12, 14, 16].map((h) => (
            <span key={h}>{h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}</span>
          ))}
        </div>
        <div className="relative h-10 rounded-full bg-surface-low/80 border border-surface-high/60">
          {[10, 12, 14, 16].map((h) => (
            <div
              key={h}
              className="absolute top-1 bottom-1 w-px bg-surface-high/90"
              style={{ left: `${((h - START) / span) * 100}%` }}
            />
          ))}
          {showNowMarker && (
            <div
              className="absolute top-0 bottom-0 w-0.5 z-10 bg-danger rounded-full"
              style={{ left: `${((nowFraction - START) / span) * 100}%` }}
            />
          )}
          {sorted.map((item) => {
            const center =
              ((item.start - START) / span) * 100 +
              (Math.max(0.25, item.duration || 0.5) / span) * 50;
            return (
              <div
                key={item.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-[2]"
                style={{ left: `${Math.min(98, Math.max(2, center))}%` }}
                title={`${item.patient} — ${fmtTime(item.start)}`}
              >
                <span className={`block w-3 h-3 rounded-full ${dotClass(item)}`} />
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-2.5 text-[10px] text-ink-mute">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warn" /> بانتظار</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> عند الطبيب</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger" /> عاجلة</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> مكتمل</span>
        </div>
      </div>

      {/* Appointment list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="text-sm text-ink-mute text-center py-6">لا يوجد مواعيد اليوم.</div>
        ) : (
          <div className="space-y-0 divide-y divide-surface-high/60">
            {sorted.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-3 items-center py-2.5 hover:bg-surface-low/30 transition-colors px-1 rounded-lg"
              >
                <span className="text-sm font-bold text-primary whitespace-nowrap">
                  {fmtTime(item.start)}
                </span>
                <span className="text-sm font-semibold text-ink truncate">{item.patient}</span>
                <span className="text-xs text-ink-mute truncate">
                  {receptionDoctorName(users, item.doctor)}
                </span>
                <span className="text-xs text-ink-mute/70 truncate text-end">
                  {item.reason || "زيارة"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Live Queue Card ─────────────────────────────────────────────── */
function LiveQueueCard({ queue, users }) {
  const columns = [
    {
      title: "بانتظار",
      items: queue.waiting,
      accent: "text-warn",
      badge: "bg-warn text-white",
      Icon: CheckCircleIcon,
      iconBg: "bg-warn-soft text-warn",
    },
    {
      title: "عند الطبيب",
      items: queue.inConsultation,
      accent: "text-primary",
      badge: "bg-primary text-white",
      Icon: UserCircleIcon,
      iconBg: "bg-primary-soft text-primary",
    },
    {
      title: "بانتظار الدفع",
      items: queue.waitingPayment,
      accent: "text-danger",
      badge: "bg-danger text-white",
      Icon: CreditCardIcon,
      iconBg: "bg-danger-soft text-danger",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-pad"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="h3">طابور العيادة الحي</h2>
        <span className="text-[10px] font-semibold text-ink-mute uppercase tracking-wider">
          يحدث تلقائيًا
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {columns.map((col) => {
          const Icon = col.Icon;
          return (
            <div key={col.title}>
              {/* Column header */}
              <div className="flex items-center gap-1.5 mb-3">
                <span className={`text-xs font-bold ${col.accent}`}>{col.title}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold ${col.badge}`}
                >
                  {col.items.length}
                </span>
              </div>

              {/* Patient cards */}
              <div className="space-y-2">
                {col.items.length === 0 ? (
                  <div className="text-xs text-ink-mute text-center py-3 rounded-xl border border-dashed border-surface-high">
                    لا يوجد
                  </div>
                ) : (
                  col.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-surface-high/80 bg-white p-2.5 flex items-center gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                    >
                      {/* RIGHT (start in RTL): patient name + time */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-ink truncate leading-snug">
                            {item.patient}
                          </span>
                          <span className="text-[10px] text-primary font-semibold shrink-0">
                            {fmtTime(item.start)}
                          </span>
                        </div>
                        <div className="text-[10px] text-ink-mute mt-0.5 truncate leading-snug">
                          {receptionDoctorName(users, item.doctor)}
                        </div>
                      </div>
                      {/* LEFT (end in RTL): status icon */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${col.iconBg}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DOCTOR / ADMIN DASHBOARD COMPONENTS
═══════════════════════════════════════════════════════════════════ */

function MorningBriefing({ userName, today }) {
  const sorted = [...today].sort((a, b) => a.start - b.start);
  const next = sorted[0] || null;
  const waiting = today.filter((a) => ["scheduled", "confirmed", "arrived"].includes(a.status)).length;
  const scheduledOnly = today.filter((a) => a.status === "scheduled").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="hero-dashboard-card"
    >
      {/* Top row: greeting (right in RTL) + stats numbers (left in RTL) */}
      <div className="relative z-10 flex flex-col xl:flex-row xl:items-center gap-5 xl:gap-10">
        <div className="flex-1 min-w-0">
          <div className="text-[#22d3ee] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <SparklesIcon className="w-3.5 h-3.5" />
            نظرة عامة اليوم
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mt-2 leading-tight">
            {getGreeting()}، {userName}
          </h1>
          <p className="text-white/55 mt-1.5 text-sm leading-relaxed">
            {fmtNumberAr(today.length)} موعد اليوم
            {today.length > 8 ? " · ضغط مرتفع" : " · حمل معتدل"}
          </p>
        </div>

        {/* Stats numbers */}
        <div className="flex items-center gap-6 xl:gap-8 shrink-0">
          <div className="text-center">
            <div className="font-display text-3xl font-bold text-warn leading-none">
              {fmtNumberAr(scheduledOnly)}
            </div>
            <div className="text-white/45 text-[11px] mt-1.5">مجدولة</div>
          </div>
          <div className="w-px h-10 bg-white/15" />
          <div className="text-center">
            <div className="font-display text-3xl font-bold text-white leading-none">
              {fmtNumberAr(today.length)}
            </div>
            <div className="text-white/45 text-[11px] mt-1.5">موعد اليوم</div>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-white/[0.08] my-4 xl:my-5" />

      {/* Bottom row: next appointment (right in RTL) + waiting count (left in RTL) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {next ? (
          <div className="flex items-center gap-2 text-sm text-white">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <span>
              أول موعد: <span className="font-semibold">{fmtTime(next.start)}</span>
            </span>
            <span className="text-white/30 mx-0.5">—</span>
            <span className="font-medium">{next.patient}</span>
          </div>
        ) : (
          <div className="text-sm text-white/40">لا يوجد مواعيد اليوم</div>
        )}
        <div className="text-sm text-white/50">
          المنتظرون الآن:{" "}
          <span className="font-semibold text-white">{fmtNumberAr(waiting)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function QuickCalendarView({ today, users }) {
  const START = 8;
  const END = 17;
  const span = END - START;
  const sorted = [...today].sort((a, b) => a.start - b.start);
  const now = new Date();
  const nowFraction = now.getHours() + now.getMinutes() / 60;
  const showNowMarker = nowFraction >= START && nowFraction <= END;

  function blockColor(item) {
    if (item.urgent || item.overbooked) return "bg-danger";
    if (item.status === "in_consultation") return "bg-primary";
    if (item.status === "paid") return "bg-success";
    if (item.status === "completed") return "bg-danger/80";
    if (["scheduled", "confirmed", "arrived"].includes(item.status)) return "bg-warn";
    return "bg-primary";
  }

  return (
    <motion.div
      id="today-schedule-quick"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-pad"
    >
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h2 className="h3">عرض سريع للتقويم</h2>
        <span className="text-xs text-ink-mute shrink-0">{fmtNumberAr(today.length)} مواعيد اليوم</span>
      </div>

      {/* Timeline with appointment blocks */}
      <div dir="ltr" className="relative px-1 pb-1">
        <div className="flex justify-between text-[10px] text-ink-mute mb-2 font-medium">
          {[8, 10, 12, 14, 16].map((h) => (
            <span key={h}>{h < 12 ? `${h}ص` : h === 12 ? "12م" : `${h - 12}م`}</span>
          ))}
        </div>
        <div className="relative h-[60px] rounded-xl bg-surface-low/80 border border-surface-high/60 overflow-hidden">
          {[10, 12, 14, 16].map((h) => (
            <div
              key={h}
              className="absolute top-0 bottom-0 w-px bg-surface-high/70"
              style={{ left: `${((h - START) / span) * 100}%` }}
            />
          ))}
          {showNowMarker && (
            <div
              className="absolute top-0 bottom-0 w-0.5 z-10 bg-danger"
              style={{ left: `${((nowFraction - START) / span) * 100}%` }}
            />
          )}
          {sorted.map((item) => {
            const leftPct = ((item.start - START) / span) * 100;
            const dur = item.duration || 1;
            const widthPct = (dur / span) * 100;
            const clampedLeft = Math.min(95, Math.max(0, leftPct));
            const clampedWidth = Math.max(6, Math.min(100 - clampedLeft, widthPct));
            return (
              <div
                key={item.id}
                className={`absolute top-2 bottom-2 rounded-lg ${blockColor(item)} text-white overflow-hidden flex flex-col justify-center px-2 shadow-sm`}
                style={{ left: `${clampedLeft}%`, width: `${clampedWidth}%`, minWidth: 52 }}
                title={`${item.patient} — ${fmtTime(item.start)}`}
              >
                <div className="text-[10px] font-semibold leading-tight truncate">{item.patient}</div>
                <div className="text-[9px] opacity-75 leading-tight">{fmtTime(item.start)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Appointment card grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.length === 0 ? (
          <div className="col-span-2 px-4 py-6 text-sm text-ink-mute text-center">
            لا يوجد مواعيد اليوم.
          </div>
        ) : (
          sorted.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-surface-high/70 bg-white flex items-center gap-0 overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:bg-surface-low/30 transition-colors"
            >
              <div className="px-3.5 py-3.5 bg-primary-soft flex items-center justify-center shrink-0 self-stretch border-e border-surface-high/50">
                <span className="text-primary font-bold text-sm whitespace-nowrap">
                  {fmtTime(item.start)}
                </span>
              </div>
              <div className="px-3.5 py-3 min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink truncate">{item.patient}</div>
                <div className="text-xs text-ink-mute mt-0.5 truncate">
                  {receptionDoctorName(users, item.doctor)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function AdminAnalyticsSection({ operationalPressure }) {
  const chartTheme = useChartTheme();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card-pad lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="h3">تحليل الإيرادات الشهرية</h2>
            <p className="text-xs text-ink-mute mt-0.5">متابعة الأداء المالي</p>
          </div>
        </div>
        <div className="h-72 bg-white rounded-xl border border-surface-high/50 px-1 py-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={REVENUE}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={chartTheme.cartesianGrid} />
              <XAxis dataKey="month" tick={{ fill: chartTheme.axisTick, fontSize: 11 }} axisLine={false} tickLine={false} reversed />
              <YAxis
                tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                orientation="right"
                tickFormatter={(v) => fmtNumberAr(v)}
              />
              <Tooltip
                contentStyle={{ ...chartTheme.tooltipStyle, fontSize: 12 }}
                labelStyle={chartTheme.tooltipLabelStyle}
                itemStyle={chartTheme.tooltipItemStyle}
                wrapperStyle={chartTheme.tooltipWrapperStyle}
                formatter={(value) => fmtNumberAr(value)}
              />
              <Line
                type="monotone"
                dataKey="2026"
                stroke={chartTheme.linePrimary}
                strokeWidth={2}
                dot={chartTheme.linePrimaryDot}
                activeDot={chartTheme.linePrimaryActiveDot}
                isAnimationActive
              />
              <Line
                type="monotone"
                dataKey="2025"
                stroke={chartTheme.lineSecondary}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={chartTheme.lineSecondaryActiveDot}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card-pad">
        <h2 className="h3 mb-4">ملخص تشغيلي</h2>
        <div className="space-y-2.5 text-sm">
          <div className="rounded-xl border border-surface-high bg-white px-3.5 py-2.5 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <span className="text-ink-mute">الحالة الحالية</span>
            <span className="font-semibold text-secondary">مستقر</span>
          </div>
          <div className="rounded-xl border border-surface-high bg-white px-3.5 py-2.5 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <span className="text-ink-mute">الضغط</span>
            <span className={`font-semibold ${operationalPressure.tone}`}>{operationalPressure.label}</span>
          </div>
          <div className="rounded-xl border border-surface-high bg-white px-3.5 py-2.5 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <span className="text-ink-mute">المتابعة</span>
            <span className="font-semibold text-primary">لحظية</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OperationalKpis({ queue, todayCount, today = [], invoices = [] }) {
  const todayIds = useMemo(() => new Set(today.map((a) => a.id)), [today]);
  const revenueToday = useMemo(() => {
    return invoices
      .filter((i) => todayIds.has(i.appointmentId) && i.status === "paid")
      .reduce((s, i) => s + (Number(i.paidAmount) || Number(i.amount) || 0), 0);
  }, [invoices, todayIds]);
  const noShowToday = useMemo(() => today.filter((a) => a.status === "no_show").length, [today]);

  const cards = [
    {
      label: "عدد المرضى اليوم",
      value: todayCount,
      icon: CalendarDaysIcon,
      accent: "border-t-primary",
      iconTone: "bg-primary-soft text-primary",
      valueTone: "text-primary",
    },
    {
      label: "إيراد اليوم",
      value: revenueToday,
      icon: CreditCardIcon,
      accent: "border-t-secondary",
      iconTone: "bg-secondary-soft text-secondary",
      valueTone: "text-secondary",
      format: "money",
    },
    {
      label: "لم يحضر اليوم",
      value: noShowToday,
      icon: ClockIcon,
      accent: "border-t-danger",
      iconTone: "bg-danger-soft text-danger",
      valueTone: "text-danger",
    },
    {
      label: "عدد المنتظرين الآن",
      value: queue.waiting.length,
      icon: UsersIcon,
      accent: "border-t-warn",
      iconTone: "bg-warn-soft text-warn",
      valueTone: "text-warn",
    },
    {
      label: "عدد عند الطبيب",
      value: queue.inConsultation.length,
      icon: UserCircleIcon,
      accent: "border-t-secondary",
      iconTone: "bg-secondary-soft text-secondary",
      valueTone: "text-secondary",
    },
    {
      label: "عدد بانتظار الدفع",
      value: queue.waitingPayment.length,
      icon: CreditCardIcon,
      accent: "border-t-danger",
      iconTone: "bg-danger-soft text-danger",
      valueTone: "text-danger",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const display =
          card.format === "money"
            ? `${fmtNumberAr(card.value)} ل.س`
            : fmtNumberAr(card.value);
        return (
          <div key={card.label} className={`kpi-stat-card ${card.accent}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-ink-mute leading-relaxed">{card.label}</div>
                <div className={`font-display text-[22px] leading-none font-bold mt-2 ${card.valueTone}`}>
                  {display}
                </div>
              </div>
              <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${card.iconTone}`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LiveClinicView({ queue, role }) {
  const rows = [
    { title: "بانتظار", items: queue.waiting, icon: UsersIcon, accent: "border-t-warn", iconTone: "text-warn" },
    { title: "عند الطبيب", items: queue.inConsultation, icon: UserCircleIcon, accent: "border-t-primary", iconTone: "text-primary" },
    { title: "انتهى", items: queue.done, icon: CheckCircleIcon, accent: "border-t-success", iconTone: "text-success" },
    { title: "بانتظار الدفع", items: queue.waitingPayment, icon: CreditCardIcon, accent: "border-t-danger", iconTone: "text-danger" },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card-pad">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="h3">ما يحدث الآن في العيادة</h2>
          <p className="text-xs text-ink-mute mt-0.5">مخطط الطابور المبسّط</p>
        </div>
        <span className="text-xs text-ink-mute shrink-0">
          {role === ROLES.RECEPTIONIST ? "عرض الاستقبال" : "عرض تشغيلي"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.title} className={`queue-column-card ${row.accent}`}>
              <div className="flex items-start justify-between mb-3 gap-2">
                <div>
                  <div className="text-xs font-semibold text-ink-mute">{row.title}</div>
                  <div className="font-display text-2xl mt-1 font-bold text-ink leading-none flex items-center gap-2">
                    {fmtNumberAr(row.items.length)}
                    <Icon className={`w-5 h-5 ${row.iconTone}`} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {row.items.length === 0 ? (
                  <div className="text-xs text-ink-mute py-1">لا يوجد</div>
                ) : (
                  row.items.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-surface-high/80 bg-white px-2.5 py-2 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink truncate leading-snug">{item.patient}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-ink-mute">
                          <ClockIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span>{fmtTime(item.start)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 18) return "مساء الخير";
  return "مساء النور";
}
