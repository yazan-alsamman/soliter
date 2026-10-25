import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { COLOR_MAP, colorFromDoctorId } from '../../utils/doctorColors.js';
import {
  getSundayOfWeek, addDays, isSameDay,
  fmtDayShort, fmtDayNum, STATUS_META, formatTime,
} from '../../utils/calendarUtils.js';

// ─── Single appointment row inside a day strip ─────────────────────────────

function ApptRow({ appt, onClick }) {
  const c  = COLOR_MAP[appt.color || colorFromDoctorId(appt.doctor)] || COLOR_MAP.blue;
  const sm = STATUS_META[appt.status] || STATUS_META.scheduled;

  return (
    <motion.button
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-right border ${c.border} ${c.bg}
                  hover:brightness-95 active:scale-[0.99] transition-all text-start`}
      whileHover={{ x: -2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      onClick={() => onClick?.(appt)}
    >
      {/* Time */}
      <span className={`shrink-0 text-[11px] font-bold tabular-nums ${c.text} min-w-[36px]`}>
        {formatTime(appt.start)}
      </span>

      {/* Color dot */}
      <span className={`shrink-0 w-2 h-2 rounded-full ${c.bar}`} />

      {/* Patient + service */}
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-semibold text-ink-default truncate">{appt.patient}</span>
        <span className="block text-[10px] text-ink-variant truncate">{appt.reason}</span>
      </span>

      {/* Doctor */}
      <span className={`shrink-0 hidden sm:block text-[10px] ${c.text} truncate max-w-[80px]`}>
        {appt.doctorName || ''}
      </span>

      {/* Status */}
      <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full ring-1 ${sm.tw}`}>
        {sm.label}
      </span>

      {/* Urgent */}
      {appt.urgent && (
        <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-danger-soft text-danger ring-1 ring-danger/30 rounded-full font-bold">
          عاجل
        </span>
      )}
    </motion.button>
  );
}

// ─── Single day strip ──────────────────────────────────────────────────────

function DayStrip({ date, appointments, today, onDayClick, onApptClick }) {
  const isToday    = isSameDay(date, today);
  const isPast     = date < today && !isToday;
  const dayAppts   = appointments
    .filter(a => {
      const d = a.appointmentStart ? new Date(a.appointmentStart) : null;
      return d && isSameDay(d, date);
    })
    .sort((a, b) => a.start - b.start);

  return (
    <motion.div
      className={`rounded-2xl border overflow-hidden
        ${isToday
          ? 'border-primary/40 shadow-card bg-primary-soft/10'
          : isPast
          ? 'border-ink-line/30 bg-surface-dim/40 opacity-70'
          : 'border-ink-line/40 bg-surface-base'
        }`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1,  y: 0  }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Day header */}
      <button
        className={`w-full flex items-center justify-between px-4 py-2.5 text-right
          ${isToday ? 'bg-primary/8' : 'bg-surface-dim/30'} hover:bg-primary/5 transition-colors`}
        onClick={() => onDayClick?.(date)}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0
            ${isToday ? 'bg-primary text-white shadow-focus' : 'bg-surface-mid text-ink-default'}`}>
            {fmtDayNum(date)}
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-ink-default'}`}>
              {fmtDayShort(date)}
              {isToday && <span className="mr-1.5 text-[10px] font-semibold bg-primary text-white px-1.5 py-0.5 rounded-full">اليوم</span>}
            </p>
            <p className="text-[10px] text-ink-mute">{dayAppts.length} {dayAppts.length === 1 ? 'موعد' : 'مواعيد'}</p>
          </div>
        </div>

        {/* Status dots summary */}
        <div className="flex items-center gap-1">
          {dayAppts.slice(0, 6).map((a, i) => {
            const c = COLOR_MAP[a.color || colorFromDoctorId(a.doctor)] || COLOR_MAP.blue;
            return <span key={i} className={`w-2 h-2 rounded-full ${c.bar}`} />;
          })}
          {dayAppts.length > 6 && (
            <span className="text-[9px] text-ink-mute">+{dayAppts.length - 6}</span>
          )}
        </div>
      </button>

      {/* Appointments list */}
      {dayAppts.length > 0 && (
        <div className="px-3 py-2.5 flex flex-col gap-1.5">
          {dayAppts.map(a => (
            <ApptRow key={a.id} appt={a} onClick={onApptClick} />
          ))}
        </div>
      )}

      {dayAppts.length === 0 && (
        <div className="px-4 py-3 text-[11px] text-ink-mute italic text-center">
          لا مواعيد
        </div>
      )}
    </motion.div>
  );
}

// ─── WeekStripView ─────────────────────────────────────────────────────────

export default function WeekStripView({
  currentDate,
  appointments,
  onDayClick,
  onApptClick,
}) {
  const today     = new Date();
  const weekStart = useMemo(() => getSundayOfWeek(currentDate), [currentDate]);
  const days      = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <motion.div
      className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      {days.map(date => (
        <DayStrip
          key={date.toISOString()}
          date={date}
          appointments={appointments}
          today={today}
          onDayClick={onDayClick}
          onApptClick={onApptClick}
        />
      ))}
    </motion.div>
  );
}
