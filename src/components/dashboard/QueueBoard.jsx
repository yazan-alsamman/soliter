import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon, UserIcon, BeakerIcon, BanknotesIcon,
  CheckBadgeIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useAppointments } from '../../context/AppointmentsContext.jsx';
import { useUsers }        from '../../context/UsersContext.jsx';
import { COLOR_MAP, colorFromDoctorId } from '../../utils/doctorColors.js';
import { isSameDay, formatTime, fmtDay } from '../../utils/calendarUtils.js';
import InvoiceModal from '../appointments/InvoiceModal.jsx';

// ─── Stage configuration ──────────────────────────────────────────────────

const STAGES = [
  {
    key:        'waiting',
    title:      'بانتظار الدخول',
    subtitle:   'لم يصل بعد',
    statuses:   ['scheduled', 'confirmed'],
    nextStatus: 'arrived',
    nextLabel:  'تسجيل وصول',
    Icon:       ClockIcon,
    accent:     'bg-amber-500',
    soft:       'bg-amber-50',
    text:       'text-amber-700',
    border:     'border-amber-200',
    ringSoft:   'ring-amber-200',
  },
  {
    key:        'arrived',
    title:      'وصل المريض',
    subtitle:   'بانتظار الدكتور',
    statuses:   ['arrived'],
    nextStatus: 'in_consultation',
    nextLabel:  'إدخال للطبيب',
    Icon:       UserIcon,
    accent:     'bg-blue-500',
    soft:       'bg-blue-50',
    text:       'text-blue-700',
    border:     'border-blue-200',
    ringSoft:   'ring-blue-200',
  },
  {
    key:        'inSession',
    title:      'عند الطبيب',
    subtitle:   'الجلسة جارية',
    statuses:   ['in_consultation'],
    nextStatus: 'completed',
    nextLabel:  'إنهاء الجلسة',
    Icon:       BeakerIcon,
    accent:     'bg-violet-500',
    soft:       'bg-violet-50',
    text:       'text-violet-700',
    border:     'border-violet-200',
    ringSoft:   'ring-violet-200',
  },
  {
    key:        'paying',
    title:      'جاهز للدفع',
    subtitle:   'افحص الفاتورة',
    statuses:   ['completed'],
    nextStatus: 'paid',
    nextLabel:  'فتح الفاتورة',
    Icon:       BanknotesIcon,
    accent:     'bg-emerald-500',
    soft:       'bg-emerald-50',
    text:       'text-emerald-700',
    border:     'border-emerald-200',
    ringSoft:   'ring-emerald-200',
    needsInvoice: true,
  },
];

// ─── Patient card inside a stage ──────────────────────────────────────────

function PatientCard({ appt, stage, doctorMap, onAdvance, onInvoice, busy }) {
  const doctor = doctorMap[appt.doctor];
  const dColor = COLOR_MAP[doctor?.color || colorFromDoctorId(appt.doctor)] || COLOR_MAP.blue;

  const handle = (e) => {
    e.stopPropagation();
    if (stage.needsInvoice) onInvoice(appt);
    else onAdvance(appt, stage.nextStatus);
  };

  return (
    <motion.div
      className={`bg-surface-base rounded-2xl border ${stage.border} p-3 flex flex-col gap-2 hover:shadow-card transition-shadow`}
      layout
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1,  scale: 1,    y: 0 }}
      exit={{    opacity: 0,  scale: 0.92, y: -4 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      {/* Time + urgent flag */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tabular-nums text-ink-default">
          {formatTime(appt.start)}
        </span>
        {appt.urgent && (
          <span className="text-[9px] px-1.5 py-0.5 bg-danger-soft text-danger ring-1 ring-danger/30 rounded-full font-bold">
            عاجل
          </span>
        )}
      </div>

      {/* Patient + service */}
      <div className="flex items-start gap-2">
        <div className={`w-7 h-7 rounded-full ${dColor.bar} flex items-center justify-center text-white text-[10px] font-black shrink-0`}>
          {appt.patient?.charAt(0) || '؟'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-ink-default truncate leading-tight">{appt.patient}</p>
          <p className="text-[10px] text-ink-variant truncate">{appt.reason}</p>
          <p className={`text-[10px] ${dColor.text} truncate`}>{doctor?.name || '—'}</p>
        </div>
      </div>

      {/* Action button */}
      <button
        onClick={handle}
        disabled={busy}
        className={`mt-1 w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold text-white ${stage.accent}
                    hover:brightness-110 active:brightness-95 disabled:opacity-50 transition-all`}
      >
        {busy ? '...' : stage.nextLabel}
        <ArrowRightIcon className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ─── Stage column ─────────────────────────────────────────────────────────

function StageColumn({ stage, appts, doctorMap, onAdvance, onInvoice, busyId, compact }) {
  const Icon = stage.Icon;
  const minH = compact ? 'min-h-[100px]' : 'min-h-[180px]';
  const maxH = compact ? 'max-h-[280px]' : 'max-h-[420px]';
  return (
    <div className={`flex flex-col rounded-3xl ${stage.soft} ring-1 ${stage.ringSoft} overflow-hidden`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-ink-line/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-xl ${stage.accent} flex items-center justify-center shrink-0 shadow-sm`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className={`text-[12px] font-bold ${stage.text}`}>{stage.title}</p>
            <p className="text-[10px] text-ink-mute">{stage.subtitle}</p>
          </div>
        </div>
        <div className={`shrink-0 min-w-[24px] h-6 px-1.5 rounded-full ${stage.accent} text-white text-[11px] font-black flex items-center justify-center shadow-sm`}>
          {appts.length}
        </div>
      </div>

      {/* Cards */}
      <div className={`flex-1 px-2.5 py-2.5 flex flex-col gap-2 ${minH} ${maxH} overflow-y-auto`}>
        <AnimatePresence>
          {appts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 gap-1.5 opacity-50">
              <div className={`w-10 h-10 rounded-full ${stage.accent}/20 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${stage.text}`} />
              </div>
              <p className="text-[10px] text-ink-mute">لا يوجد</p>
            </div>
          ) : (
            appts.map(a => (
              <PatientCard
                key={a.id} appt={a} stage={stage} doctorMap={doctorMap}
                onAdvance={onAdvance} onInvoice={onInvoice}
                busy={busyId === a.id}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Build stage buckets from a flat appointment list ─────────────────────

function stageBuckets(activeList) {
  const out = {};
  STAGES.forEach((s) => {
    out[s.key] = activeList.filter((a) => s.statuses.includes(a.status));
  });
  return out;
}

// ─── Main QueueBoard ──────────────────────────────────────────────────────
/** @typedef {{ id: string, name?: string }} DoctorLike */

/**
 * @param {{
 *   anchorDate?: Date,
 *   groupByDoctor?: boolean,
 *   doctors?: DoctorLike[] | null,
 *   title?: string,
 *   subtitle?: string,
 * }} [props]
 */
export default function QueueBoard({
  anchorDate,
  groupByDoctor = false,
  doctors = null,
  title = 'لوحة سير المرضى',
  subtitle,
}) {
  const { items: appts, setAppointmentStatus } = useAppointments();
  const { users } = useUsers();
  const resolvedDate = useMemo(() => anchorDate ?? new Date(), [anchorDate]);
  const compact = groupByDoctor;
  const [busyId, setBusyId] = useState(null);
  const [invoiceAppt, setInvoiceAppt] = useState(null);

  const dayActiveAll = useMemo(() => {
    return appts
      .filter((a) => {
        const d = a.appointmentStart ? new Date(a.appointmentStart) : null;
        return d && isSameDay(d, resolvedDate);
      })
      .filter((a) => !['paid', 'cancelled', 'no_show'].includes(a.status))
      .sort((a, b) => a.start - b.start);
  }, [appts, resolvedDate]);

  const doctorMap = useMemo(
    () => Object.fromEntries(users.filter((u) => u.role === 'doctor').map((u) => [u.id, u])),
    [users]
  );

  const doctorSections = useMemo(() => {
    if (!groupByDoctor) return [{ id: null, name: null, active: dayActiveAll }];
    const list = doctors?.length ? doctors : [];
    return list.map((d) => ({
      id: d.id,
      name: d.name,
      active: dayActiveAll.filter((a) => a.doctor === d.id),
    }));
  }, [groupByDoctor, doctors, dayActiveAll]);

  const doneCount = useMemo(
    () =>
      appts.filter((a) => {
        const d = a.appointmentStart ? new Date(a.appointmentStart) : null;
        return d && isSameDay(d, resolvedDate) && a.status === 'paid';
      }).length,
    [appts, resolvedDate]
  );
  const totalDay = dayActiveAll.length + doneCount;

  const defaultSubtitle = groupByDoctor
    ? `طابور لكل طبيب ليوم ${fmtDay(resolvedDate)} — من التسجيل حتى الفاتورة`
    : 'تتبّع كل مريض من الانتظار حتى الدفع — لحظة بلحظة';

  const advance = async (appt, nextStatus) => {
    setBusyId(appt.id);
    try {
      await setAppointmentStatus(appt.id, nextStatus);
    } finally {
      setBusyId(null);
    }
  };

  const openInvoice = (appt) => setInvoiceAppt(appt);

  const confirmPayment = async () => {
    if (!invoiceAppt) return;
    setBusyId(invoiceAppt.id);
    try {
      await setAppointmentStatus(invoiceAppt.id, 'paid');
      setInvoiceAppt(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <motion.section
        className="rounded-3xl bg-surface-base ring-1 ring-ink-line/30 shadow-card overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div className="px-5 py-4 border-b border-ink-line/20 bg-gradient-to-l from-primary-soft/15 to-surface-base flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-[16px] font-bold text-ink-default">{title}</h2>
            <p className="text-[11px] text-ink-mute mt-0.5">{subtitle ?? defaultSubtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Pill
              icon={ClockIcon}
              count={totalDay - doneCount}
              label="نشط الآن"
              cls="bg-primary-soft/40 text-primary"
            />
            <Pill
              icon={CheckBadgeIcon}
              count={doneCount}
              label="منجز اليوم"
              cls="bg-emerald-50 text-emerald-700"
            />
          </div>
        </div>

        <div className="p-4 flex flex-col gap-6">
          {groupByDoctor && doctorSections.length === 0 && (
            <p className="text-[12px] text-ink-mute text-center py-6">لا أطباء لعرض الطابور</p>
          )}

          {doctorSections.map((section) => {
            const stageAppts = stageBuckets(section.active);
            const showDoctorHeader = groupByDoctor && section.id != null;

            return (
              <div key={section.id || 'all'} className="flex flex-col gap-3">
                {showDoctorHeader && (
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[13px] font-bold text-ink-default">{section.name}</span>
                    <span className="text-[10px] text-ink-mute font-semibold tabular-nums">
                      {section.active.length} نشط
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {STAGES.map((stage) => (
                    <StageColumn
                      key={`${section.id || 'all'}-${stage.key}`}
                      stage={stage}
                      appts={stageAppts[stage.key] || []}
                      doctorMap={doctorMap}
                      onAdvance={advance}
                      onInvoice={openInvoice}
                      busyId={busyId}
                      compact={compact}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {totalDay === 0 && (
          <div className="px-5 py-6 text-center text-ink-mute text-[12px] border-t border-ink-line/20">
            لا مواعيد في هذا اليوم — استخدم «موعد جديد» لإضافة حجز
          </div>
        )}
      </motion.section>

      <AnimatePresence>
        {invoiceAppt && (
          <InvoiceModal
            appt={invoiceAppt}
            doctorName={doctorMap[invoiceAppt.doctor]?.name || ''}
            onConfirmPay={confirmPayment}
            onClose={() => setInvoiceAppt(null)}
            busy={busyId === invoiceAppt.id}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Header pill ──────────────────────────────────────────────────────────

function Pill({ icon: Icon, count, label, cls }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{count}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}
