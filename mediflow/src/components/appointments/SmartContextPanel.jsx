import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  PhoneIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserCircleIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  BoltIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { usePatients }      from '../../context/PatientsContext.jsx';
import { useBilling }       from '../../context/BillingContext.jsx';
import { useAppointments }  from '../../context/AppointmentsContext.jsx';
import { useUsers }         from '../../context/UsersContext.jsx';
import { COLOR_MAP, colorFromDoctorId } from '../../utils/doctorColors.js';
import { formatTime, STATUS_META, NEXT_STATUS } from '../../utils/calendarUtils.js';
import { fmtMoney }         from '../../data/strings.js';

// ─── Advance config per status ─────────────────────────────────────────────

const ADVANCE_CFG = {
  scheduled:       { label: 'تأكيد الموعد',      Icon: CheckCircleIcon,    tone: 'confirm'  },
  confirmed:       { label: 'سجّل وصول المريض', Icon: CheckCircleIcon,    tone: 'arrive'   },
  arrived:         { label: 'ابدأ الجلسة',       Icon: BoltIcon,           tone: 'session'  },
  in_consultation: { label: 'أنهِ الجلسة',       Icon: CheckCircleIcon,    tone: 'done'     },
  completed:       { label: 'إنشاء فاتورة',     Icon: CurrencyDollarIcon, tone: 'pay'      },
};

const ADVANCE_COLORS = {
  confirm: 'bg-blue-500 hover:bg-blue-600 text-white',
  arrive:  'bg-amber-500 hover:bg-amber-600 text-white',
  session: 'bg-violet-600 hover:bg-violet-700 text-white',
  done:    'bg-emerald-500 hover:bg-emerald-600 text-white',
  pay:     'bg-green-600 hover:bg-green-700 text-white',
};

// ─── AI insight messages ────────────────────────────────────────────────────

function getAiInsight(status, urgent, balance, isReturning, packageRemaining) {
  if (urgent) return 'موعد عاجل — أعطِه الأولوية في الجدول وأعلم الطبيب فوراً.';
  if (status === 'scheduled') return 'الموعد ينتظر تأكيداً. أرسل تذكيراً للمريض إن لم يُؤكد.';
  if (status === 'confirmed') return 'المريض أكد حضوره. جهّز ملفه وأعلم الطبيب بالقدوم.';
  if (status === 'arrived') return 'المريض في الاستقبال. أشعر الطبيب بالوصول.';
  if (status === 'in_consultation') return 'الجلسة جارية. ابدأ تجهيز الفاتورة إن احتجت.';
  if (status === 'completed' && balance > 0) return `الجلسة اكتملت ولديه رصيد ${fmtMoney(balance)} غير مدفوع. أنشئ الفاتورة.`;
  if (status === 'completed') return 'الجلسة اكتملت. حدّد موعد المتابعة أو أنشئ الفاتورة.';
  if (packageRemaining > 0) return `لديه ${packageRemaining} جلسة متبقية في الباقة.`;
  if (!isReturning) return 'مريض جديد — تأكد من تسجيل بياناته كاملاً.';
  return 'كل شيء على ما يرام. لا ملاحظات إضافية.';
}

// ─── Info row component ─────────────────────────────────────────────────────

function InfoRow({ Icon, label, value, tone }) {
  const cls = tone === 'warn'    ? 'text-warn'
            : tone === 'danger'  ? 'text-danger'
            : tone === 'primary' ? 'text-primary'
            : 'text-ink-variant';
  return (
    <div className="flex items-start gap-2.5 text-[11.5px]">
      <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cls || 'text-ink-mute'}`} />
      <div className="flex-1 min-w-0">
        {label && <span className="text-ink-mute font-medium">{label}: </span>}
        <span className={`font-semibold ${cls || 'text-ink-default'}`}>{value}</span>
      </div>
    </div>
  );
}

// ─── SmartContextPanel ──────────────────────────────────────────────────────

export default function SmartContextPanel({ appt, onClose, onEdit }) {
  const [busy, setBusy] = useState(false);

  const { patients }             = usePatients();
  const { invoices }             = useBilling();
  const { setAppointmentStatus } = useAppointments();
  const { users }                = useUsers();

  const doctor = useMemo(() => users.find(u => u.id === appt?.doctor), [users, appt]);
  const c  = COLOR_MAP[doctor?.color || colorFromDoctorId(appt?.doctor)] || COLOR_MAP.blue;
  const sm = STATUS_META[appt?.status] || STATUS_META.scheduled;
  const next = NEXT_STATUS[appt?.status];
  const advCfg = ADVANCE_CFG[appt?.status];

  const patient = useMemo(() => {
    if (!appt) return null;
    const byId   = appt.patientId ? patients.find(p => p.id === appt.patientId) : null;
    const byName = !byId && appt.patient
      ? patients.find(p => p.name?.trim() === String(appt.patient).trim())
      : null;
    return byId || byName || null;
  }, [patients, appt]);

  const unpaidBalance = useMemo(() => {
    if (!patient?.id) return 0;
    return invoices
      .filter(inv => inv.patientId === patient.id && ['draft', 'partial'].includes(inv.status))
      .reduce((s, inv) => {
        const bal = Number(inv.balance ?? Math.max(0, (inv.amount || 0) - (inv.paidAmount || 0)));
        return s + bal;
      }, 0);
  }, [invoices, patient]);

  const isReturning     = !!(patient && (patient.status === 'active' || patient.status === 'returning'));
  const packageRemaining = Number(patient?.packageRemaining || 0);
  const aiInsight = getAiInsight(appt?.status, appt?.urgent, unpaidBalance, isReturning, packageRemaining);

  const advance = async () => {
    if (!next || busy) return;
    setBusy(true);
    try { await setAppointmentStatus(appt.id, next); }
    finally { setBusy(false); }
  };

  if (!appt) return null;

  const initials = (appt.patient || '؟').trim().slice(0, 1);
  const endTime  = appt.start + (appt.duration || 0.5);

  return (
    <motion.aside
      key={appt.id}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1,  x: 0   }}
      exit={{    opacity: 0,  x: -16 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="w-[280px] shrink-0 flex flex-col border-r border-ink-line/40 bg-surface-dim/30 overflow-y-auto"
    >
      {/* ── Patient header ──────────────────────────────────────────────── */}
      <div className={`px-4 pt-4 pb-3 border-b border-ink-line/30 ${c.bg}`}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full ${c.bar} flex items-center justify-center text-white font-black text-[13px] shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-ink-default truncate leading-tight flex items-center gap-1">
                {appt.urgent && <span className="text-danger font-black text-[11px] shrink-0">⚑</span>}
                <span className="truncate">{appt.patient || 'مريض'}</span>
              </p>
              {patient?.phone && (
                <a
                  href={`tel:${patient.phone}`}
                  className="flex items-center gap-1 text-[10px] text-ink-variant hover:text-primary transition-colors mt-0.5"
                >
                  <PhoneIcon className="w-2.5 h-2.5" />
                  <span className="tabular-nums" dir="ltr">{patient.phone}</span>
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xl hover:bg-surface-mid/60 flex items-center justify-center text-ink-mute hover:text-ink-default transition-colors shrink-0"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Status + flags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ring-1 ${sm.tw}`}>
            {sm.label}
          </span>
          {appt.urgent && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-danger-soft/80 text-danger ring-1 ring-danger/30">
              عاجل
            </span>
          )}
          {!isReturning && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary-soft/70 text-primary ring-1 ring-primary/25">
              جديد
            </span>
          )}
          {unpaidBalance > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-warn-soft/70 text-warn ring-1 ring-warn/25 flex items-center gap-0.5">
              <CurrencyDollarIcon className="w-2.5 h-2.5" />
              {fmtMoney(unpaidBalance)}
            </span>
          )}
        </div>
      </div>

      {/* ── Appointment details ──────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-ink-line/20 space-y-2">
        <p className="text-[9.5px] font-black text-ink-mute uppercase tracking-widest mb-1.5">تفاصيل الموعد</p>
        <InfoRow Icon={ClockIcon}        value={`${formatTime(appt.start)} — ${formatTime(endTime)}`} />
        <InfoRow Icon={CalendarDaysIcon} value={`${appt.duration === 0.5 ? '30' : appt.duration * 60} دقيقة`} />
        {doctor && (
          <InfoRow Icon={UserCircleIcon} value={doctor.name} tone="primary" />
        )}
        {appt.reason && (
          <InfoRow Icon={ChatBubbleLeftRightIcon} value={appt.reason} />
        )}
      </div>

      {/* ── Patient info ────────────────────────────────────────────────── */}
      {patient && (
        <div className="px-4 py-3 border-b border-ink-line/20 space-y-2">
          <p className="text-[9.5px] font-black text-ink-mute uppercase tracking-widest mb-1.5">معلومات المريض</p>
          {patient.lastVisit && patient.lastVisit !== '—' && (
            <InfoRow Icon={CalendarDaysIcon} label="آخر زيارة" value={patient.lastVisit} />
          )}
          <InfoRow
            Icon={UserCircleIcon}
            label="الحالة"
            value={isReturning ? 'مريض عائد' : 'مريض جديد'}
            tone={isReturning ? undefined : 'primary'}
          />
          {packageRemaining > 0 && (
            <InfoRow Icon={ArrowPathIcon} value={`${packageRemaining} جلسة متبقية في الباقة`} tone="primary" />
          )}
          {unpaidBalance > 0 && (
            <InfoRow Icon={ExclamationTriangleIcon} label="رصيد غير مدفوع" value={fmtMoney(unpaidBalance)} tone="warn" />
          )}
        </div>
      )}

      {/* ── AI Insight ──────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-ink-line/20 bg-pulse-soft/10">
        <div className="flex items-center gap-1.5 mb-2">
          <SparklesIcon className="w-3 h-3 text-primary" />
          <p className="text-[9.5px] font-black text-primary uppercase tracking-widest">رؤية تشغيلية</p>
        </div>
        <p className="text-[11px] text-ink-variant leading-relaxed">{aiInsight}</p>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div className="px-4 py-3 space-y-2 mt-auto">
        {/* Primary advance action */}
        {advCfg && next && (
          <button
            onClick={advance}
            disabled={busy}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[12px] font-bold transition-all disabled:opacity-60 active:scale-95 ${ADVANCE_COLORS[advCfg.tone]}`}
          >
            {busy
              ? <span className="animate-spin text-base">⟳</span>
              : <advCfg.Icon className="w-4 h-4" />
            }
            {advCfg.label}
          </button>
        )}

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onEdit(appt)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-surface-mid hover:bg-surface-high text-ink-default transition-colors"
          >
            <PencilSquareIcon className="w-3.5 h-3.5" />
            تعديل
          </button>

          {patient?.phone ? (
            <a
              href={`tel:${patient.phone}`}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-surface-mid hover:bg-surface-high text-ink-default transition-colors"
            >
              <PhoneIcon className="w-3.5 h-3.5" />
              اتصال
            </a>
          ) : (
            <button
              onClick={() => onEdit(appt)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-surface-mid hover:bg-surface-high text-ink-default transition-colors"
            >
              <ArrowRightIcon className="w-3.5 h-3.5" />
              إعادة جدولة
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
