import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLOR_MAP, colorFromDoctorId } from '../../utils/doctorColors.js';
import { STATUS_META, NEXT_STATUS, formatTime, isSameDay } from '../../utils/calendarUtils.js';
import { useAppointments } from '../../context/AppointmentsContext.jsx';

const STATUS_ORDER = ['arrived', 'in_consultation', 'confirmed', 'scheduled', 'completed', 'paid', 'cancelled', 'no_show'];
const sortAppts    = (appts) => [...appts].sort((a, b) => {
  const si = STATUS_ORDER.indexOf(a.status);
  const sj = STATUS_ORDER.indexOf(b.status);
  return si !== sj ? si - sj : a.start - b.start;
});

// ─── Status action button ──────────────────────────────────────────────────

function AdvanceBtn({ appt }) {
  const { setAppointmentStatus } = useAppointments();
  const [busy, setBusy] = useState(false);
  const next = NEXT_STATUS[appt.status];
  const sm   = STATUS_META[next];

  if (!next || !sm) return null;

  const handle = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try { await setAppointmentStatus(appt.id, next); }
    finally { setBusy(false); }
  };

  return (
    <button
      className={`shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg ring-1 ${sm.tw}
                  hover:scale-105 active:scale-95 transition-transform`}
      onClick={handle}
      disabled={busy}
    >
      {busy ? '…' : `← ${sm.label}`}
    </button>
  );
}

// ─── Single appointment row ────────────────────────────────────────────────

function AgendaRow({ appt, onClick }) {
  const c    = COLOR_MAP[appt.color || colorFromDoctorId(appt.doctor)] || COLOR_MAP.blue;
  const sm   = STATUS_META[appt.status] || STATUS_META.scheduled;
  const done = ['paid', 'cancelled', 'no_show'].includes(appt.status);

  return (
    <motion.div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer select-none
        ${done ? 'opacity-55 bg-surface-dim/30 border-ink-line/20' : `${c.bg} border ${c.border}`}
        hover:shadow-card hover:border-primary/30 transition-all`}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: done ? 0.55 : 1, x: 0 }}
      whileHover={{ scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      onClick={() => onClick?.(appt)}
    >
      {/* Time column */}
      <div className="shrink-0 text-center w-12">
        <p className={`text-[13px] font-black tabular-nums ${c.text}`}>{formatTime(appt.start)}</p>
        <p className="text-[9px] text-ink-mute">{appt.duration === 0.5 ? '30 د' : `${appt.duration} س`}</p>
      </div>

      {/* Divider */}
      <div className={`w-0.5 self-stretch rounded-full ${c.bar}`} />

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-[13px] font-bold text-ink-default truncate`}>{appt.patient}</p>
          {appt.urgent && (
            <span className="text-[9px] px-1.5 py-0.5 bg-danger-soft text-danger ring-1 ring-danger/30 rounded-full font-bold shrink-0">
              عاجل
            </span>
          )}
        </div>
        <p className="text-[11px] text-ink-variant truncate">{appt.reason}</p>
        {appt.doctorName && (
          <p className={`text-[10px] ${c.text} truncate`}>{appt.doctorName}</p>
        )}
      </div>

      {/* Status + action */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ring-1 font-medium ${sm.tw}`}>
          {sm.label}
        </span>
        <AdvanceBtn appt={appt} />
      </div>
    </motion.div>
  );
}

// ─── Doctor section ────────────────────────────────────────────────────────

function DoctorSection({ doctor, appts, onApptClick }) {
  const [open, setOpen] = useState(true);
  const c = COLOR_MAP[doctor.color || colorFromDoctorId(doctor.id)] || COLOR_MAP.blue;
  const sorted = useMemo(() => sortAppts(appts), [appts]);
  const active = appts.filter(a => !['paid','cancelled','no_show'].includes(a.status));

  return (
    <div className="rounded-2xl border border-ink-line/40 overflow-hidden">
      {/* Section header */}
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 ${c.bg} border-b border-ink-line/20
                    hover:brightness-95 transition-colors text-right`}
        onClick={() => setOpen(v => !v)}
      >
        <div className={`w-8 h-8 rounded-full ${c.bar} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
          {doctor.initials || doctor.name?.slice(0, 2) || '؟'}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className={`text-[13px] font-bold ${c.text}`}>{doctor.name}</p>
          {doctor.dept && <p className="text-[10px] text-ink-mute">{doctor.dept}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} ring-1 ${c.border}`}>
            {active.length} / {appts.length}
          </span>
          <span className={`text-ink-mute text-sm transition-transform duration-200 ${open ? 'rotate-90' : '-rotate-90'}`}>›</span>
        </div>
      </button>

      {/* Appointment list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{    height: 0,      opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="p-3 flex flex-col gap-2 bg-surface-base">
              {sorted.map(a => <AgendaRow key={a.id} appt={a} onClick={onApptClick} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AgendaView ────────────────────────────────────────────────────────────

export default function AgendaView({ currentDate, doctors, appointments, onApptClick }) {
  const dayAppts = useMemo(() => {
    return appointments.filter(a => {
      const d = a.appointmentStart ? new Date(a.appointmentStart) : null;
      return d && isSameDay(d, currentDate);
    });
  }, [appointments, currentDate]);

  // Attach doctor name to each appointment + group by doctor
  const sections = useMemo(() => {
    const doctorMap = Object.fromEntries(doctors.map(d => [d.id, d]));
    const enriched  = dayAppts.map(a => ({ ...a, doctorName: doctorMap[a.doctor]?.name || '' }));

    return doctors
      .map(doc => ({
        doctor: doc,
        appts:  enriched.filter(a => a.doctor === doc.id),
      }))
      .filter(s => s.appts.length > 0);
  }, [dayAppts, doctors]);

  const unassigned = useMemo(() => {
    const assigned = new Set(doctors.map(d => d.id));
    return dayAppts.filter(a => !assigned.has(a.doctor));
  }, [dayAppts, doctors]);

  if (dayAppts.length === 0) {
    return (
      <motion.div
        className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        <div className="w-20 h-20 rounded-3xl bg-surface-mid flex items-center justify-center text-4xl">
          📅
        </div>
        <div>
          <p className="text-base font-bold text-ink-default">لا مواعيد لهذا اليوم</p>
          <p className="text-sm text-ink-mute mt-1">اضغط على الزر أعلى لإضافة موعد جديد</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      {sections.map(({ doctor, appts }) => (
        <DoctorSection key={doctor.id} doctor={doctor} appts={appts} onApptClick={onApptClick} />
      ))}

      {unassigned.length > 0 && (
        <div className="rounded-2xl border border-ink-line/40 overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-dim/30 border-b border-ink-line/20">
            <p className="text-sm font-semibold text-ink-variant">مواعيد غير مخصصة</p>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {unassigned.map(a => <AgendaRow key={a.id} appt={a} onClick={onApptClick} />)}
          </div>
        </div>
      )}
    </motion.div>
  );
}
