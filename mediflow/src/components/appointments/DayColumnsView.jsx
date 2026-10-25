import { useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colorFromDoctorId } from '../../utils/doctorColors.js';
import {
  GRID_START, GRID_END,
  formatTime, computeOverlaps, isSameDay, decimalFromDate,
} from '../../utils/calendarUtils.js';
import AppointmentBlock from './AppointmentBlock.jsx';

// ─── Grid constants ────────────────────────────────────────────────────────

const ROW_H   = 72;   // px per hour
const TIME_W  = 56;   // px width of time axis
const MIN_COL = 160;  // min px per doctor column

// 15-minute slots for the grid rows (for clicking precision)
const QUARTER_SLOTS = [];
for (let h = GRID_START; h < GRID_END; h++) {
  for (let q = 0; q < 4; q++) {
    QUARTER_SLOTS.push({ decimal: h + q * 0.25, hour: h, min: q * 15, isHour: q === 0, isHalf: q === 2 });
  }
}
const TOTAL_H = (GRID_END - GRID_START) * ROW_H;

// ─── Doctor color hex for column tint ─────────────────────────────────────

const DOCTOR_HEX = {
  blue:   '#005d90', green:  '#126c40', purple: '#6d3fd9',
  orange: '#c2660a', mint:   '#0d7a5f', coral:  '#c2344a',
};

// ─── Doctor column header ──────────────────────────────────────────────────

function DoctorHeader({ doctor, count, isToday }) {
  const colorKey = doctor.color || colorFromDoctorId(doctor.id);
  const hex      = DOCTOR_HEX[colorKey] || '#005d90';
  const isSpec   = /^أ\./.test(doctor.title || '') || doctor.isSpecialist;

  return (
    <div
      className="flex-1 px-3 py-2.5 border-r border-gray-200 dark:border-ink-line/40 flex items-center gap-2.5 bg-white dark:bg-surface-base"
      style={{ minWidth: MIN_COL, borderBottom: isToday ? `3px solid ${hex}` : '1px solid #e5e7eb' }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow-sm"
        style={{ background: hex }}
      >
        {doctor.initials || doctor.name?.slice(0, 2) || '؟'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-gray-900 dark:text-ink-default truncate leading-tight">{doctor.name}</p>
        <p className="text-[10px] truncate leading-tight" style={{ color: hex }}>
          {isSpec ? 'متخصص' : 'طبيب'}{doctor.dept ? ` · ${doctor.dept}` : ''}
        </p>
      </div>
      <div
        className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[9px] font-black text-white flex items-center justify-center"
        style={{ background: hex }}
      >
        {count}
      </div>
    </div>
  );
}

// ─── Time axis ─────────────────────────────────────────────────────────────

function TimeAxis({ nowDecimal, isToday }) {
  return (
    <div
      className="shrink-0 bg-gray-50 dark:bg-surface-dim/60 border-r border-gray-200 dark:border-ink-line/40"
      style={{ width: TIME_W }}
    >
      {QUARTER_SLOTS.map(slot => (
        <div
          key={slot.decimal}
          className="flex items-start justify-end pr-2"
          style={{ height: ROW_H / 4 }}
        >
          {slot.isHour && (
            <span
              className="text-[10px] font-semibold tabular-nums mt-[-6px]"
              style={{
                color: isToday && Math.abs(slot.decimal - nowDecimal) < 0.25 ? '#ef4444' : '#9ca3af',
              }}
            >
              {slot.hour}:00
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Doctor column ─────────────────────────────────────────────────────────

function DoctorColumn({ doctor, appointments, onSlotClick, onApptClick, isToday, nowDecimal }) {
  const overlapMap = useMemo(() => computeOverlaps(appointments), [appointments]);

  return (
    <div
      className="flex-1 relative border-r border-gray-200 dark:border-ink-line/30 bg-white dark:bg-surface-base"
      style={{ minWidth: MIN_COL }}
    >
      {/* 15-min slot grid */}
      {QUARTER_SLOTS.map(slot => (
        <div
          key={slot.decimal}
          className="group cursor-pointer transition-colors"
          style={{
            height: ROW_H / 4,
            borderBottom: slot.isHour
              ? '1px solid #e5e7eb'
              : slot.isHalf
              ? '1px dashed #f3f4f6'
              : undefined,
          }}
          onClick={() => onSlotClick?.(slot.decimal)}
        >
          {/* "+ موعد" ghost on hover */}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity
                           flex items-center justify-center h-full text-[10px] text-blue-400
                           pointer-events-none select-none font-semibold">
            + {formatTime(slot.decimal)}
          </span>
        </div>
      ))}

      {/* Appointment blocks */}
      <AnimatePresence>
        {appointments.map(appt => {
          const { col = 0, cols = 1 } = overlapMap.get(appt.id) || {};
          const topPx    = (appt.start - GRID_START) * ROW_H;
          const heightPx = Math.max(appt.duration * ROW_H - 3, 28);
          const widthPct = 100 / cols;
          const leftPct  = (col / cols) * 100;

          return (
            <AppointmentBlock
              key={appt.id}
              appt={appt}
              style={{
                top:    topPx,
                height: heightPx,
                left:   `${leftPct + 0.5}%`,
                width:  `calc(${widthPct}% - 8px)`,
              }}
              onClick={onApptClick}
            />
          );
        })}
      </AnimatePresence>

      {/* "Now" line — red, spans full column width */}
      {isToday && nowDecimal >= GRID_START && nowDecimal <= GRID_END && (
        <div
          className="absolute left-0 right-0 pointer-events-none z-30 flex items-center"
          style={{ top: (nowDecimal - GRID_START) * ROW_H - 1 }}
        >
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-md shadow-red-200 shrink-0 -mr-1.5 z-10" />
          <div className="flex-1 h-0.5 bg-red-400/80" />
        </div>
      )}
    </div>
  );
}

// ─── DayColumnsView ────────────────────────────────────────────────────────

export default function DayColumnsView({
  currentDate,
  doctors,
  appointments,
  onSlotClick,
  onApptClick,
}) {
  const scrollRef = useRef(null);
  const today     = new Date();
  const isToday   = isSameDay(currentDate, today);
  const nowDec    = decimalFromDate(today);

  // Filter to this date
  const dayAppts = useMemo(() =>
    appointments.filter(a => {
      const d = a.appointmentStart ? new Date(a.appointmentStart) : null;
      return d && isSameDay(d, currentDate);
    }),
    [appointments, currentDate]
  );

  // Group by doctor
  const byDoctor = useMemo(() => {
    const map = {};
    doctors.forEach(d => { map[d.id] = []; });
    dayAppts.forEach(a => { if (map[a.doctor] !== undefined) map[a.doctor].push(a); });
    return map;
  }, [dayAppts, doctors]);

  // Scroll to 1h before now (or 8:30)
  useEffect(() => {
    if (!scrollRef.current) return;
    const target = isToday
      ? Math.max(0, (nowDec - GRID_START - 1) * ROW_H)
      : (9 - GRID_START) * ROW_H; // 9:00 default
    scrollRef.current.scrollTop = target;
  }, [isToday, nowDec]);

  if (doctors.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
        <div className="text-5xl opacity-20">🏥</div>
        <p className="text-sm">لا يوجد أطباء في هذا القسم</p>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col flex-1 overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}
    >
      {/* Sticky doctor headers */}
      <div
        className="flex shrink-0 sticky top-0 z-40 shadow-sm"
        dir="ltr"
      >
        {/* Corner cell */}
        <div
          className="shrink-0 bg-gray-50 dark:bg-surface-dim/60 border-r border-b border-gray-200 dark:border-ink-line/40"
          style={{ width: TIME_W }}
        />
        {doctors.map(doc => (
          <DoctorHeader
            key={doc.id}
            doctor={doc}
            count={(byDoctor[doc.id] || []).length}
            isToday={isToday}
          />
        ))}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto overscroll-contain" dir="ltr">
        <div
          className="flex relative"
          style={{ height: TOTAL_H, minWidth: TIME_W + doctors.length * MIN_COL }}
        >
          <TimeAxis nowDecimal={nowDec} isToday={isToday} />

          {doctors.map(doc => (
            <DoctorColumn
              key={doc.id}
              doctor={doc}
              appointments={byDoctor[doc.id] || []}
              onSlotClick={dec => onSlotClick?.(doc.id, dec)}
              onApptClick={onApptClick}
              isToday={isToday}
              nowDecimal={nowDec}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
