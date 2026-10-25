import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  isSameDay, fmtMonth, fmtDayNum, WEEK_LABELS_SHORT, addDays,
} from '../../utils/calendarUtils.js';

// ─── Mini calendar ─────────────────────────────────────────────────────────

function MiniCalendar({ currentDate, onChange, appointments }) {
  const today = new Date();
  const [display, setDisplay] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const daysInMonth  = new Date(display.getFullYear(), display.getMonth() + 1, 0).getDate();
  const firstDow     = new Date(display.getFullYear(), display.getMonth(), 1).getDay(); // 0=Sunday
  const cells        = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++)
      arr.push(new Date(display.getFullYear(), display.getMonth(), d));
    return arr;
  }, [display, firstDow, daysInMonth]);

  // Map appointments to day keys for dot display
  const dotDays = useMemo(() => {
    const set = new Set();
    appointments.forEach(a => {
      if (a.appointmentStart) {
        const d = new Date(a.appointmentStart);
        set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
    });
    return set;
  }, [appointments]);

  const navMonth = (delta) => {
    setDisplay(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <div className="px-3 pt-3 pb-2">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => navMonth(-1)}
          className="w-6 h-6 rounded-lg hover:bg-surface-mid flex items-center justify-center text-ink-variant transition-colors"
        >‹</button>
        <button
          className="text-[12px] font-semibold text-ink-default hover:text-primary transition-colors"
          onClick={() => { setDisplay(new Date(today.getFullYear(), today.getMonth(), 1)); onChange(today); }}
        >
          {fmtMonth(display)}
        </button>
        <button
          onClick={() => navMonth(1)}
          className="w-6 h-6 rounded-lg hover:bg-surface-mid flex items-center justify-center text-ink-variant transition-colors"
        >›</button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_LABELS_SHORT.map(l => (
          <div key={l} className="text-center text-[9px] text-ink-mute font-semibold py-0.5">{l}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const isSelected = isSameDay(date, currentDate);
          const isToday    = isSameDay(date, today);
          const hasDot     = dotDays.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);

          return (
            <button
              key={date.getDate()}
              onClick={() => onChange(date)}
              className={`relative mx-auto w-7 h-7 rounded-full text-[11px] flex items-center justify-center transition-all
                ${isSelected  ? 'bg-primary text-white font-bold shadow-focus'
                : isToday     ? 'ring-1 ring-primary/60 text-primary font-semibold'
                : 'text-ink-default hover:bg-primary-soft/50'}`}
            >
              {fmtDayNum(date)}
              {hasDot && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────

function Stat({ label, value, colorCls }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-surface-mid/50 transition-colors">
      <span className="text-[11px] text-ink-variant">{label}</span>
      <span className={`text-[13px] font-black tabular-nums ${colorCls}`}>{value}</span>
    </div>
  );
}

// ─── CalendarSidebar ───────────────────────────────────────────────────────

export default function CalendarSidebar({ currentDate, onChange, appointments }) {
  const today = new Date();

  const todayAppts = useMemo(() =>
    appointments.filter(a => {
      const d = a.appointmentStart ? new Date(a.appointmentStart) : null;
      return d && isSameDay(d, today);
    }),
    [appointments]
  );

  const stats = useMemo(() => ({
    waiting:  todayAppts.filter(a => ['scheduled','confirmed','arrived'].includes(a.status)).length,
    active:   todayAppts.filter(a => a.status === 'in_consultation').length,
    done:     todayAppts.filter(a => ['completed','paid'].includes(a.status)).length,
    total:    todayAppts.length,
  }), [todayAppts]);

  return (
    <motion.aside
      className="w-[196px] shrink-0 flex flex-col border-l border-ink-line/40 bg-surface-dim/30 overflow-y-auto"
      initial={{ x: 16, opacity: 0 }}
      animate={{ x: 0,  opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
    >
      {/* Mini calendar */}
      <div className="border-b border-ink-line/30">
        <MiniCalendar currentDate={currentDate} onChange={onChange} appointments={appointments} />
      </div>

      {/* Today's stats */}
      <div className="px-2 py-3">
        <p className="text-[10px] font-bold text-ink-mute px-3 mb-1 uppercase tracking-wider">
          إحصاء اليوم
        </p>
        <Stat label="في الانتظار"   value={stats.waiting}  colorCls="text-amber-600"  />
        <Stat label="في الجلسة"     value={stats.active}   colorCls="text-violet-600" />
        <Stat label="منجزة"         value={stats.done}     colorCls="text-emerald-600"/>
        <Stat label="إجمالي اليوم"  value={stats.total}    colorCls="text-primary"    />
      </div>

      {/* Quick-jump shortcuts */}
      <div className="px-3 pt-1 pb-3 border-t border-ink-line/20 mt-auto">
        <p className="text-[10px] font-bold text-ink-mute mb-1.5 uppercase tracking-wider">انتقال سريع</p>
        {[-1, 0, 1].map(delta => {
          const d     = addDays(today, delta);
          const label = delta === 0 ? 'اليوم' : delta === -1 ? 'الأمس' : 'الغد';
          const sel   = isSameDay(d, currentDate);
          return (
            <button
              key={delta}
              onClick={() => onChange(d)}
              className={`w-full text-right text-[11px] px-2.5 py-1.5 rounded-xl mb-0.5 transition-colors font-medium
                ${sel ? 'bg-primary/10 text-primary' : 'text-ink-variant hover:bg-surface-mid/60'}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </motion.aside>
  );
}
