import { motion } from 'framer-motion';
import { XMarkIcon, PrinterIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { formatTime } from '../../utils/calendarUtils.js';
import { LOCALE_AR_LATN, fmtMoney } from '../../data/strings.js';

export default function InvoiceModal({ appt, doctorName, onConfirmPay, onClose, busy }) {
  if (!appt) return null;

  const now  = new Date();
  const date = appt.appointmentStart ? new Date(appt.appointmentStart) : now;
  const dateStr = new Intl.DateTimeFormat(LOCALE_AR_LATN, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-surface-base w-full max-w-sm rounded-3xl shadow-deep overflow-hidden"
        initial={{ scale: 0.93, y: 24, opacity: 0 }}
        animate={{ scale: 1,    y: 0,  opacity: 1 }}
        exit={{    scale: 0.95, y: 12, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Receipt header */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-bold text-[14px]">فاتورة الجلسة</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-emerald-100">{dateStr}</p>
          <p className="text-2xl font-black mt-2">{fmtMoney(appt.treatmentPrice || activePrice(appt) || 0)}</p>
        </div>

        {/* Details */}
        <div className="px-6 py-5 flex flex-col gap-3">
          <Row label="المريض"  value={appt.patient}    bold />
          <Row label="الطبيب"  value={doctorName}                />
          <Row label="الخدمة"  value={appt.reason}               />
          <Row label="الوقت"   value={`${formatTime(appt.start)} – ${formatTime(appt.start + appt.duration)}`} />
          <Row label="المدة"   value={durationLabel(appt.duration)} />
          <div className="border-t border-dashed border-gray-200 pt-3 flex items-center justify-between">
            <span className="text-[12px] font-bold text-gray-600">المجموع</span>
            <span className="text-[18px] font-black text-emerald-600">
              {fmtMoney(appt.treatmentPrice || activePrice(appt) || 0)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <PrinterIcon className="w-4 h-4" />
            طباعة
          </button>
          <motion.button
            onClick={onConfirmPay}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-[13px] font-bold hover:bg-emerald-600 disabled:opacity-60 transition-colors shadow-sm"
            whileTap={{ scale: 0.97 }}
          >
            {busy ? '...' : 'تأكيد الدفع ✓'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-gray-400 shrink-0">{label}</span>
      <span className={`text-[12px] text-right ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{value || '—'}</span>
    </div>
  );
}

function activePrice(appt) {
  return appt.treatmentPrice || appt.price || 0;
}

function durationLabel(d) {
  if (d === 0.5) return '30 دقيقة';
  if (d === 1)   return 'ساعة واحدة';
  if (d === 1.5) return 'ساعة ونصف';
  if (d === 2)   return 'ساعتان';
  return `${d} ساعة`;
}
