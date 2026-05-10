import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAppointments } from '../../context/AppointmentsContext.jsx';
import { useUsers }        from '../../context/UsersContext.jsx';
import { COLOR_MAP, colorFromDoctorId } from '../../utils/doctorColors.js';
import { isSameDay, formatTime, STATUS_META, NEXT_STATUS } from '../../utils/calendarUtils.js';

// ─── Queue groups config ──────────────────────────────────────────────────

const GROUPS = [
  {
    key:      'waiting',
    label:    'بانتظار الدخول',
    statuses: ['scheduled', 'confirmed', 'arrived'],
    color:    'text-amber-700 bg-amber-50 ring-amber-200',
    dot:      'bg-amber-400',
  },
  {
    key:      'active',
    label:    'عند الطبيب',
    statuses: ['in_consultation'],
    color:    'text-violet-700 bg-violet-50 ring-violet-200',
    dot:      'bg-violet-500',
  },
  {
    key:      'paying',
    label:    'بانتظار الدفع',
    statuses: ['completed'],
    color:    'text-emerald-700 bg-emerald-50 ring-emerald-200',
    dot:      'bg-emerald-500',
  },
];

// ─── Single queue card ─────────────────────────────────────────────────────

function QueueCard({ appt, doctorMap }) {
  const { setAppointmentStatus } = useAppointments();
  const [busy, setBusy] = useState(false);

  const doctor = doctorMap[appt.doctor];
  const c      = COLOR_MAP[doctor?.color || colorFromDoctorId(appt.doctor)] || COLOR_MAP.blue;
  const sm     = STATUS_META[appt.status] || STATUS_META.scheduled;
  const next   = NEXT_STATUS[appt.status];
  const nextSm = next ? STATUS_META[next] : null;

  const advance = async (e) => {
    e.stopPropagation();
    if (!next || busy) return;
    setBusy(true);
    try { await setAppointmentStatus(appt.id, next); }
    finally { setBusy(false); }
  };

  return (
    <motion.div
      className={`rounded-2xl border ${c.border} ${c.bg} p-3 flex flex-col gap-2`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      {/* Patient row */}
      <div className="flex items-start gap-2">
        <div className={`w-8 h-8 rounded-full ${c.bar} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
          {appt.patient?.charAt(0) || '؟'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[13px] font-bold text-ink-default truncate">{appt.patient}</p>
            {appt.urgent && (
              <span className="text-[9px] px-1.5 py-0.5 bg-danger-soft text-danger ring-1 ring-danger/30 rounded-full font-bold shrink-0">
                عاجل
              </span>
            )}
          </div>
          <p className="text-[10px] text-ink-variant truncate">{appt.reason}</p>
          <p className={`text-[10px] ${c.text} truncate`}>{doctor?.name || ''}</p>
        </div>
        <span className="shrink-0 text-[10px] font-bold tabular-nums text-ink-mute">
          {formatTime(appt.start)}
        </span>
      </div>

      {/* Status + action row */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ring-1 font-medium ${sm.tw}`}>
          {sm.label}
        </span>
        {nextSm && (
          <button
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ring-1 ${nextSm.tw}
                        hover:scale-105 active:scale-95 transition-transform`}
            onClick={advance}
            disabled={busy}
          >
            {busy ? '…' : `← ${nextSm.label}`}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Group section ─────────────────────────────────────────────────────────

function QueueGroup({ group, appts, doctorMap }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-2">
      <button
        className="flex items-center gap-2 text-right"
        onClick={() => setOpen(v => !v)}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${group.dot}`} />
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ${group.color}`}>
          {group.label}
        </span>
        <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full ${group.color}`}>
          {appts.length}
        </span>
        <span className={`mr-auto text-ink-mute text-sm transition-transform ${open ? '' : 'rotate-180'}`}>›</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="flex flex-col gap-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {appts.length === 0 ? (
              <p className="text-[11px] text-ink-mute italic pr-4">لا يوجد</p>
            ) : (
              <AnimatePresence>
                {appts.map(a => <QueueCard key={a.id} appt={a} doctorMap={doctorMap} />)}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── QueuePanel ────────────────────────────────────────────────────────────

export default function QueuePanel({ open, onClose }) {
  const { items: appointments } = useAppointments();
  const { users }               = useUsers();

  const today      = new Date();
  const todayAppts = useMemo(() =>
    appointments.filter(a => {
      const d = a.appointmentStart ? new Date(a.appointmentStart) : null;
      return d && isSameDay(d, today) && !['paid', 'cancelled', 'no_show'].includes(a.status);
    }).sort((a, b) => a.start - b.start),
    [appointments]
  );

  const doctorMap = useMemo(() =>
    Object.fromEntries(users.filter(u => u.role === 'doctor').map(u => [u.id, u])),
    [users]
  );

  const grouped = useMemo(() =>
    GROUPS.map(g => ({
      ...g,
      appts: todayAppts.filter(a => g.statuses.includes(a.status)),
    })),
    [todayAppts]
  );

  const totalActive = grouped.reduce((s, g) => s + g.appts.length, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-ink/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            className="fixed top-0 left-0 bottom-0 z-50 w-80 bg-surface-base shadow-deep
                       flex flex-col border-r border-ink-line/40 overflow-hidden"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-ink-line/40 bg-surface-dim/30 shrink-0">
              <div>
                <h3 className="text-[14px] font-bold text-ink-default">لوحة الانتظار</h3>
                <p className="text-[10px] text-ink-mute mt-0.5">
                  {totalActive} نشط الآن · {new Intl.DateTimeFormat('ar-SY-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }).format(today)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl hover:bg-surface-mid flex items-center justify-center text-ink-mute transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Groups */}
            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">
              {grouped.map(g => (
                <QueueGroup key={g.key} group={g} appts={g.appts} doctorMap={doctorMap} />
              ))}

              {totalActive === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-8">
                  <div className="w-14 h-14 rounded-2xl bg-surface-mid flex items-center justify-center text-2xl opacity-40">
                    ✓
                  </div>
                  <p className="text-sm text-ink-mute">لا مواعيد نشطة الآن</p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
