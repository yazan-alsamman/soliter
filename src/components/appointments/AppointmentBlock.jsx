import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppointments } from '../../context/AppointmentsContext.jsx';
import { useUsers }        from '../../context/UsersContext.jsx';
import { formatTime }      from '../../utils/calendarUtils.js';
import InvoiceModal        from './InvoiceModal.jsx';

// ─── Status config: solid badges, no transparency ─────────────────────────

const STATUS_CFG = {
  scheduled:       { label: 'مجدول',       badge: 'bg-slate-400 text-white',        bar: '#94a3b8' },
  confirmed:       { label: 'مؤكد',        badge: 'bg-blue-500 text-white',          bar: '#3b82f6' },
  arrived:         { label: 'وصل',         badge: 'bg-amber-500 text-white',         bar: '#f59e0b' },
  in_consultation: { label: 'في الجلسة',   badge: 'bg-violet-500 text-white',        bar: '#8b5cf6' },
  completed:       { label: 'اكتمل',       badge: 'bg-emerald-500 text-white',       bar: '#10b981' },
  paid:            { label: 'مدفوع',       badge: 'bg-green-600 text-white',         bar: '#16a34a' },
  cancelled:       { label: 'ملغى',        badge: 'bg-red-400 text-white',           bar: '#f87171' },
  no_show:         { label: 'لم يحضر',    badge: 'bg-orange-400 text-white',        bar: '#fb923c' },
};

// Doctor color → solid hex for the left border
const DOCTOR_HEX = {
  blue:   '#005d90',
  green:  '#126c40',
  purple: '#6d3fd9',
  orange: '#c2660a',
  mint:   '#0d7a5f',
  coral:  '#c2344a',
};

const NEXT_STATUS = {
  scheduled: 'confirmed', confirmed: 'arrived', arrived: 'in_consultation',
  in_consultation: 'completed', completed: 'paid',
};

const ADVANCE_LABEL = {
  scheduled: 'تأكيد', confirmed: 'وصل', arrived: 'بدء',
  in_consultation: 'إنهاء', completed: 'دفع',
};

export default function AppointmentBlock({ appt, style, onClick }) {
  const [hovering,     setHovering]     = useState(false);
  const [advancing,    setAdvancing]    = useState(false);
  const [showInvoice,  setShowInvoice]  = useState(false);
  const { setAppointmentStatus }        = useAppointments();
  const { users }                       = useUsers();

  const sc     = STATUS_CFG[appt.status] || STATUS_CFG.scheduled;
  const next   = NEXT_STATUS[appt.status];
  const barHex = DOCTOR_HEX[appt.color] || '#005d90';
  const endDec = appt.start + appt.duration;
  const height = style?.height ?? 64;
  const isTiny = height < 44;

  const doctor = users.find(u => u.id === appt.doctor);

  const advance = async (e) => {
    e.stopPropagation();
    if (!next || advancing) return;
    if (appt.status === 'completed') { setShowInvoice(true); return; }
    setAdvancing(true);
    try { await setAppointmentStatus(appt.id, next); }
    finally { setAdvancing(false); }
  };

  const confirmPay = async () => {
    setAdvancing(true);
    try { await setAppointmentStatus(appt.id, 'paid'); setShowInvoice(false); }
    finally { setAdvancing(false); }
  };

  return (
    <>
      <motion.div
        className="absolute rounded-xl overflow-hidden cursor-pointer select-none bg-white dark:bg-surface-dim border border-gray-200 dark:border-ink-line/50"
        style={{
          ...style,
          borderRight: `4px solid ${barHex}`,
          zIndex: hovering ? 40 : 10,
          boxShadow: hovering ? '0 4px 20px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        }}
        initial={{ opacity: 0, scale: 0.94, y: 4 }}
        animate={{ opacity: 1,  scale: 1,    y: 0 }}
        exit={{    opacity: 0,  scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        whileHover={{ scale: 1.012 }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={() => onClick?.(appt)}
      >
        {/* Urgent indicator */}
        {appt.urgent && (
          <div className="absolute top-0 left-0 right-4 h-0.5 bg-red-500" />
        )}

        <div className="pr-3 pl-2 py-2 h-full flex flex-col justify-between overflow-hidden gap-0.5">
          {/* Patient name — high contrast, prominent */}
          <div className="flex items-start justify-between gap-1">
            <p className="text-[12px] font-bold text-gray-900 dark:text-white leading-tight truncate">
              {appt.urgent && <span className="text-red-500 ml-1">!</span>}
              {appt.patient}
            </p>
            {!isTiny && (
              <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-tight ${sc.badge}`}>
                {sc.label}
              </span>
            )}
          </div>

          {/* Service */}
          {!isTiny && (
            <p className="text-[10px] text-gray-500 dark:text-ink-variant truncate leading-tight">{appt.reason}</p>
          )}

          {/* Time range */}
          {!isTiny && (
            <p className="text-[9px] text-gray-400 dark:text-ink-mute tabular-nums">
              {formatTime(appt.start)} – {formatTime(endDec)}
            </p>
          )}

          {/* Hover advance button */}
          <AnimatePresence>
            {hovering && next && height >= 52 && (
              <motion.button
                className="absolute bottom-1.5 left-1.5 right-4 h-6 rounded-lg
                           bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900
                           text-[10px] font-bold flex items-center justify-center gap-1
                           hover:bg-primary hover:text-white transition-colors"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1,  y: 0 }}
                exit={{    opacity: 0,  y: 3 }}
                transition={{ duration: 0.1 }}
                onClick={advance}
                disabled={advancing}
              >
                {advancing ? '…' : `${ADVANCE_LABEL[appt.status]} ←`}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Payment invoice modal */}
      <AnimatePresence>
        {showInvoice && (
          <InvoiceModal
            appt={appt}
            doctorName={doctor?.name || ''}
            onConfirmPay={confirmPay}
            onClose={() => setShowInvoice(false)}
            busy={advancing}
          />
        )}
      </AnimatePresence>
    </>
  );
}
