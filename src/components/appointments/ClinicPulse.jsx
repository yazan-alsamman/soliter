import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChartBarSquareIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  BoltIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import {
  isSameDay,
  fmtMonth,
  fmtDayNum,
  WEEK_LABELS_SHORT,
  formatTime,
  decimalFromDate,
  addDays,
} from "../../utils/calendarUtils.js";
import { fmtPercentAr, fmtNumberAr } from "../../data/strings.js";

/* ── Mini calendar (compressed) ───────────────────────────────────────────── */

function MiniCalendar({ currentDate, onChange, appointments }) {
  const today = new Date();
  const [display, setDisplay] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const daysInMonth = new Date(display.getFullYear(), display.getMonth() + 1, 0).getDate();
  const firstDow = new Date(display.getFullYear(), display.getMonth(), 1).getDay();

  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++)
      arr.push(new Date(display.getFullYear(), display.getMonth(), d));
    return arr;
  }, [display, firstDow, daysInMonth]);

  // Day → load (count) for heatmap dot intensity
  const loadByDay = useMemo(() => {
    const map = new Map();
    appointments.forEach((a) => {
      if (!a.appointmentStart) return;
      const d = new Date(a.appointmentStart);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }, [appointments]);

  return (
    <div className="px-3 pt-3 pb-2">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() =>
            setDisplay((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))
          }
          className="w-6 h-6 rounded-lg hover:bg-surface-mid flex items-center justify-center text-ink-variant transition-colors"
        >
          ‹
        </button>
        <button
          className="text-[12px] font-semibold text-ink-default hover:text-primary transition-colors"
          onClick={() => {
            setDisplay(new Date(today.getFullYear(), today.getMonth(), 1));
            onChange(today);
          }}
        >
          {fmtMonth(display)}
        </button>
        <button
          onClick={() =>
            setDisplay((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))
          }
          className="w-6 h-6 rounded-lg hover:bg-surface-mid flex items-center justify-center text-ink-variant transition-colors"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEK_LABELS_SHORT.map((l) => (
          <div
            key={l}
            className="text-center text-[9px] text-ink-mute font-semibold py-0.5"
          >
            {l}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const isSelected = isSameDay(date, currentDate);
          const isToday = isSameDay(date, today);
          const k = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const load = loadByDay.get(k) || 0;
          const intensity = load === 0 ? 0 : load <= 2 ? 1 : load <= 5 ? 2 : 3;

          return (
            <button
              key={date.getDate()}
              onClick={() => onChange(date)}
              className={`relative mx-auto w-7 h-7 rounded-full text-[11px] flex items-center justify-center transition-all
                ${
                  isSelected
                    ? "bg-primary text-white font-bold shadow-focus"
                    : isToday
                    ? "ring-1 ring-primary/60 text-primary font-semibold"
                    : "text-ink-default hover:bg-primary-soft/50"
                }`}
            >
              {fmtDayNum(date)}
              {!isSelected && intensity > 0 && (
                <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 flex gap-px">
                  {Array.from({ length: intensity }).map((_, j) => (
                    <span
                      key={j}
                      className="w-1 h-1 rounded-full bg-primary/55"
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Pulse metric card ────────────────────────────────────────────────────── */

function PulseMetric({ label, value, hint, tone = "primary", icon: Icon, delay = 0 }) {
  const TONE = {
    primary: { bg: "bg-primary-soft/60", text: "text-primary", ring: "ring-primary/15" },
    warn: { bg: "bg-warn-soft/60", text: "text-warn", ring: "ring-warn/15" },
    danger: { bg: "bg-danger-soft/60", text: "text-danger", ring: "ring-danger/15" },
    success: { bg: "bg-success-soft/60", text: "text-success", ring: "ring-success/15" },
    pulse: { bg: "bg-pulse-soft/60", text: "text-primary", ring: "ring-primary/15" },
  };
  const t = TONE[tone] || TONE.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28 }}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl ring-1 ${t.ring} ${t.bg}`}
    >
      {Icon && (
        <div className={`w-7 h-7 rounded-lg grid place-items-center bg-white/60 ${t.text} shrink-0`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-[15px] font-black tabular-nums leading-tight ${t.text}`}>
          {value}
        </div>
        <div className="text-[10px] text-ink-mute font-semibold leading-tight truncate">
          {label}
        </div>
      </div>
      {hint && (
        <span className="text-[9px] text-ink-mute font-medium">{hint}</span>
      )}
    </motion.div>
  );
}

/* ── Doctor load row ──────────────────────────────────────────────────────── */

function DoctorLoadRow({ name, count, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;
  const barCls =
    pct >= 90 ? "bg-danger" : pct >= 65 ? "bg-warn" : pct >= 35 ? "bg-primary" : "bg-success";

  return (
    <div className="px-3 py-1.5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] text-ink-default font-semibold truncate">
          {name}
        </span>
        <span className="text-[10px] tabular-nums text-ink-mute font-bold shrink-0">
          {fmtNumberAr(count)}/{fmtNumberAr(max)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-surface-mid overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full ${barCls}`}
        />
      </div>
    </div>
  );
}

/* ── AI alert pill ────────────────────────────────────────────────────────── */

function AiAlert({ kind, text }) {
  const ICON_MAP = {
    delay: ClockIcon,
    overload: ExclamationTriangleIcon,
    busy: ArrowTrendingUpIcon,
    info: BoltIcon,
  };
  const TONE_MAP = {
    delay: "text-warn",
    overload: "text-danger",
    busy: "text-primary",
    info: "text-pulse",
  };
  const Icon = ICON_MAP[kind] || BoltIcon;
  const cls = TONE_MAP[kind] || "text-primary";
  return (
    <motion.div
      initial={{ opacity: 0, x: 4 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 px-3 py-1.5"
    >
      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cls}`} />
      <span className="text-[10.5px] text-ink-variant leading-snug">{text}</span>
    </motion.div>
  );
}

/* ── ClinicPulse sidebar ──────────────────────────────────────────────────── */

const SHIFT_HOURS = 13; // 8:00 → 21:00 (matches GRID_START..GRID_END)
const PER_DOCTOR_MAX_PER_DAY = 12; // soft cap for occupancy %

export default function ClinicPulse({
  currentDate,
  onChange,
  appointments,
  doctors,
}) {
  // Memoize the "now" snapshot so dep arrays stay stable.
  const nowSnapshot = useMemo(() => {
    const now = new Date();
    return {
      today: now,
      isViewingToday: isSameDay(currentDate, now),
      nowDec: decimalFromDate(now),
    };
  }, [currentDate]);
  const { today, isViewingToday, nowDec } = nowSnapshot;

  // Filter appointments for the focused date
  const dayAppts = useMemo(
    () =>
      appointments.filter((a) => {
        const d = a.appointmentStart ? new Date(a.appointmentStart) : null;
        return d && isSameDay(d, currentDate);
      }),
    [appointments, currentDate]
  );

  const visibleDoctors = useMemo(() => doctors || [], [doctors]);

  /* Operational metrics ─────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const waiting = dayAppts.filter((a) =>
      ["scheduled", "confirmed", "arrived"].includes(a.status)
    ).length;
    const inSession = dayAppts.filter((a) => a.status === "in_consultation").length;
    const done = dayAppts.filter((a) => ["completed", "paid"].includes(a.status)).length;
    const cancelled = dayAppts.filter((a) =>
      ["cancelled", "no_show"].includes(a.status)
    ).length;
    const total = dayAppts.length;

    // Delayed = scheduled/confirmed but start time has already passed
    const delayed = isViewingToday
      ? dayAppts.filter((a) => {
          if (!["scheduled", "confirmed"].includes(a.status)) return false;
          return a.start <= nowDec - 0.1;
        }).length
      : 0;

    // Occupancy: total minutes booked / available minutes
    const bookedHours = dayAppts
      .filter((a) => !["cancelled", "no_show"].includes(a.status))
      .reduce((s, a) => s + Number(a.duration || 0), 0);
    const capacityHours = Math.max(1, visibleDoctors.length * SHIFT_HOURS);
    const occupancy = Math.min(100, Math.round((bookedHours / capacityHours) * 100));

    return { waiting, inSession, done, cancelled, total, delayed, occupancy };
  }, [dayAppts, isViewingToday, nowDec, visibleDoctors.length]);

  /* Doctor load (top 3 busiest today) ───────────────────────────────────── */
  const doctorLoad = useMemo(() => {
    const map = new Map();
    visibleDoctors.forEach((d) => map.set(d.id, { id: d.id, name: d.name, count: 0 }));
    dayAppts.forEach((a) => {
      const row = map.get(a.doctor);
      if (row) row.count += 1;
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  }, [visibleDoctors, dayAppts]);

  /* Predicted busy hours (current + future hours with most appts) ───────── */
  const busyHours = useMemo(() => {
    const buckets = new Map();
    dayAppts.forEach((a) => {
      const h = Math.floor(a.start);
      buckets.set(h, (buckets.get(h) || 0) + 1);
    });
    const sorted = [...buckets.entries()]
      .filter(([h]) => !isViewingToday || h >= Math.floor(nowDec))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return sorted.map(([h, n]) => ({ hour: h, count: n }));
  }, [dayAppts, isViewingToday, nowDec]);

  /* AI operational alerts (lightweight, derived from data) ──────────────── */
  const aiAlerts = useMemo(() => {
    const out = [];
    if (stats.delayed > 0) {
      out.push({
        kind: "delay",
        text: `${fmtNumberAr(stats.delayed)} موعد ${
          stats.delayed === 1 ? "متأخر" : "متأخرة"
        } عن الوقت المحدد. تواصل مع المرضى.`,
      });
    }
    const overloaded = doctorLoad.find((d) => d.count >= 8);
    if (overloaded) {
      out.push({
        kind: "overload",
        text: `د. ${overloaded.name.replace(/^د\.\s*/, "")} يحمل ${fmtNumberAr(
          overloaded.count
        )} موعد اليوم — قد يحتاج لإعادة توزيع.`,
      });
    }
    if (busyHours.length > 0 && busyHours[0].count >= 3) {
      const h = busyHours[0].hour;
      out.push({
        kind: "busy",
        text: `الساعة ${formatTime(h)} ذروة الازدحام (${fmtNumberAr(
          busyHours[0].count
        )} مواعيد).`,
      });
    }
    if (stats.cancelled >= 3) {
      out.push({
        kind: "info",
        text: `${fmtNumberAr(stats.cancelled)} حالة إلغاء/عدم حضور — راجع التذكيرات.`,
      });
    }
    if (out.length === 0) {
      out.push({
        kind: "info",
        text: "اليوم يسير بسلاسة. لا تنبيهات تشغيلية.",
      });
    }
    return out;
  }, [stats, doctorLoad, busyHours]);

  return (
    <motion.aside
      className="w-[228px] shrink-0 flex flex-col border-l border-ink-line/40 bg-surface-dim/30 overflow-y-auto"
      initial={{ x: 16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.05 }}
    >
      {/* Mini calendar */}
      <div className="border-b border-ink-line/30">
        <MiniCalendar
          currentDate={currentDate}
          onChange={onChange}
          appointments={appointments}
        />
      </div>

      {/* Header — Clinic Pulse */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />
            <span className="relative rounded-full bg-success w-2 h-2" />
          </span>
          <p className="text-[10px] font-bold text-ink-default uppercase tracking-wider">
            نبض العيادة
          </p>
          <span className="text-[9px] text-ink-mute font-medium ms-auto">
            {isViewingToday ? "مباشر" : "هذا اليوم"}
          </span>
        </div>
      </div>

      {/* KPI grid */}
      <div className="px-2 pb-3 grid grid-cols-2 gap-1.5">
        <PulseMetric
          label="الإشغال"
          value={fmtPercentAr(stats.occupancy)}
          tone={
            stats.occupancy >= 85
              ? "danger"
              : stats.occupancy >= 60
              ? "warn"
              : stats.occupancy >= 30
              ? "primary"
              : "success"
          }
          icon={ChartBarSquareIcon}
          delay={0.04}
        />
        <PulseMetric
          label="إجمالي اليوم"
          value={fmtNumberAr(stats.total)}
          tone="pulse"
          icon={CalendarDaysIcon}
          delay={0.08}
        />
        <PulseMetric
          label="انتظار"
          value={fmtNumberAr(stats.waiting)}
          tone="warn"
          icon={UserGroupIcon}
          delay={0.12}
        />
        <PulseMetric
          label="جلسة"
          value={fmtNumberAr(stats.inSession)}
          tone="primary"
          icon={BoltIcon}
          delay={0.16}
        />
        <PulseMetric
          label="متأخر"
          value={fmtNumberAr(stats.delayed)}
          tone={stats.delayed > 0 ? "danger" : "success"}
          icon={ClockIcon}
          delay={0.2}
        />
        <PulseMetric
          label="إلغاء"
          value={fmtNumberAr(stats.cancelled)}
          tone={stats.cancelled > 0 ? "danger" : "success"}
          icon={ExclamationTriangleIcon}
          delay={0.24}
        />
      </div>

      {/* Doctor load */}
      {doctorLoad.length > 0 && (
        <div className="border-t border-ink-line/20 pt-2 pb-2">
          <p className="text-[10px] font-bold text-ink-mute px-3 mb-1 uppercase tracking-wider">
            حمل الأطباء
          </p>
          {doctorLoad.map((d) => (
            <DoctorLoadRow
              key={d.id}
              name={d.name.replace(/^د\.\s*/, "د. ")}
              count={d.count}
              max={PER_DOCTOR_MAX_PER_DAY}
            />
          ))}
        </div>
      )}

      {/* AI alerts */}
      <div className="border-t border-ink-line/20 pt-2 pb-2 bg-pulse-soft/20">
        <div className="flex items-center gap-1.5 px-3 mb-1">
          <BoltIcon className="w-3 h-3 text-primary" />
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
            تنبيهات الذكاء
          </p>
        </div>
        <AnimatePresence>
          {aiAlerts.map((a, i) => (
            <AiAlert key={`${a.kind}-${i}`} kind={a.kind} text={a.text} />
          ))}
        </AnimatePresence>
      </div>

      {/* Predicted busy hours */}
      {busyHours.length > 0 && (
        <div className="border-t border-ink-line/20 pt-2 pb-2">
          <p className="text-[10px] font-bold text-ink-mute px-3 mb-1 uppercase tracking-wider">
            ساعات الذروة
          </p>
          <div className="px-3 flex flex-wrap gap-1">
            {busyHours.map((b) => (
              <span
                key={b.hour}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-surface-base border border-ink-line/30 text-ink-variant font-semibold tabular-nums"
              >
                {formatTime(b.hour)}
                <span className="text-primary">·</span>
                <span className="text-primary">{fmtNumberAr(b.count)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick-jump shortcuts */}
      <div className="px-3 pt-2 pb-3 border-t border-ink-line/20 mt-auto">
        <p className="text-[10px] font-bold text-ink-mute mb-1.5 uppercase tracking-wider">
          انتقال سريع
        </p>
        {[-1, 0, 1].map((delta) => {
          const d = addDays(today, delta);
          const label = delta === 0 ? "اليوم" : delta === -1 ? "الأمس" : "الغد";
          const sel = isSameDay(d, currentDate);
          return (
            <button
              key={delta}
              onClick={() => onChange(d)}
              className={`w-full text-right text-[11px] px-2.5 py-1.5 rounded-xl mb-0.5 transition-colors font-medium ${
                sel
                  ? "bg-primary/10 text-primary"
                  : "text-ink-variant hover:bg-surface-mid/60"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </motion.aside>
  );
}
