import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  BeakerIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
  XMarkIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAppointments } from '../../context/AppointmentsContext.jsx';
import { useUsers } from '../../context/UsersContext.jsx';
import { useAppDialog } from '../../context/AppDialogContext.jsx';
import { api } from '../../services/apiClient.js';
import { formatUserFacingError } from '../../utils/userFacingError.js';
import { COLOR_MAP, colorFromDoctorId } from '../../utils/doctorColors.js';
import { isSameDay, formatTime, fmtDay } from '../../utils/calendarUtils.js';
import { fmtMoney, LOCALE_AR_LATN } from '../../data/strings.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useProcedures } from '../../context/ProceduresContext.jsx';

const STAGES = [
  {
    key: 'waitingRoom',
    title: 'قاعة الانتظار',
    subtitle: 'بعد أن يضع الاستقبال «وصل» — بانتظار بدء المعاينة',
    statuses: ['arrived'],
    nextStatus: 'in_consultation',
    nextLabel: 'بدء المعاينة',
    Icon: ClockIcon,
    accent: 'bg-amber-500',
    soft: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    ringSoft: 'ring-amber-200',
  },
  {
    key: 'withDoctor',
    title: 'عند الطبيب',
    subtitle: 'أنهِ الجلسة عند الانتهاء من العلاج',
    statuses: ['in_consultation'],
    nextStatus: 'completed',
    nextLabel: 'إنهاء الجلسة',
    Icon: BeakerIcon,
    accent: 'bg-violet-500',
    soft: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    ringSoft: 'ring-violet-200',
  },
  {
    key: 'billing',
    title: 'الفاتورة والتحصيل',
    subtitle: 'راجع الخدمات وأضف ما لم يكن في الموعد، ثم أرسل للاستقبال',
    statuses: ['completed'],
    nextLabel: 'مراجعة وإرسال للاستقبال',
    Icon: BanknotesIcon,
    accent: 'bg-emerald-600',
    soft: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    ringSoft: 'ring-emerald-200',
    billingStage: true,
  },
];

function stageBuckets(list) {
  const out = {};
  STAGES.forEach((s) => {
    out[s.key] = list.filter((a) => s.statuses.includes(a.status));
  });
  return out;
}

function DoctorPatientCard({ appt, stage, colorBar, onAdvance, onOpenBilling, busy }) {
  const handle = (e) => {
    e.stopPropagation();
    if (stage.billingStage) onOpenBilling(appt);
    else onAdvance(appt, stage.nextStatus);
  };

  return (
    <motion.div
      className={`bg-surface-base rounded-2xl border ${stage.border} p-3 flex flex-col gap-2 hover:shadow-card transition-shadow`}
      layout
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -4 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tabular-nums text-ink-default">{formatTime(appt.start)}</span>
        {appt.urgent && (
          <span className="text-[9px] px-1.5 py-0.5 bg-danger-soft text-danger ring-1 ring-danger/30 rounded-full font-bold">
            عاجل
          </span>
        )}
      </div>
      <div className="flex items-start gap-2">
        <div
          className={`w-7 h-7 rounded-full ${colorBar} flex items-center justify-center text-white text-[10px] font-black shrink-0`}
        >
          {appt.patient?.charAt(0) || '؟'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-ink-default truncate leading-tight">{appt.patient}</p>
          <p className="text-[10px] text-ink-variant truncate">{appt.reason}</p>
          <p className="text-[10px] text-ink-mute font-semibold tabular-nums">
            {fmtMoney(Number(appt.finalTotal ?? appt.treatmentPrice ?? 0) || 0)}
          </p>
        </div>
      </div>
      <button
        type="button"
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

function DoctorStageColumn({ stage, appts, colorBar, onAdvance, onOpenBilling, busyId }) {
  const Icon = stage.Icon;
  return (
    <div className={`flex flex-col rounded-3xl ${stage.soft} ring-1 ${stage.ringSoft} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-ink-line/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-xl ${stage.accent} flex items-center justify-center shrink-0 shadow-sm`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className={`text-[12px] font-bold ${stage.text}`}>{stage.title}</p>
            <p className="text-[10px] text-ink-mute leading-snug">{stage.subtitle}</p>
          </div>
        </div>
        <div
          className={`shrink-0 min-w-[24px] h-6 px-1.5 rounded-full ${stage.accent} text-white text-[11px] font-black flex items-center justify-center shadow-sm`}
        >
          {appts.length}
        </div>
      </div>
      <div className="flex-1 px-2.5 py-2.5 flex flex-col gap-2 min-h-[200px] max-h-[440px] overflow-y-auto">
        <AnimatePresence>
          {appts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 gap-1.5 opacity-50">
              <div className={`w-10 h-10 rounded-full ${stage.accent}/20 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${stage.text}`} />
              </div>
              <p className="text-[10px] text-ink-mute">لا يوجد</p>
            </div>
          ) : (
            appts.map((a) => (
              <DoctorPatientCard
                key={a.id}
                appt={a}
                stage={stage}
                colorBar={colorBar}
                onAdvance={onAdvance}
                onOpenBilling={onOpenBilling}
                busy={busyId === a.id}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DoctorBillingReviewModal({ appt, doctorName, doctorUserId, onClose, onDone, busy }) {
  const { procedures } = useProcedures();
  const [notes, setNotes] = useState('');
  const [selectedAddonIds, setSelectedAddonIds] = useState(() => new Set());

  const existingServiceIds = useMemo(() => {
    if (!appt) return new Set();
    const raw = Array.isArray(appt.serviceIds) ? appt.serviceIds : [];
    const set = new Set(raw.filter(Boolean));
    if (appt.serviceId) set.add(appt.serviceId);
    return set;
  }, [appt]);

  const addonChoices = useMemo(() => {
    if (!appt) return [];
    const docId = doctorUserId || appt.doctor;
    return procedures.filter((p) => {
      if (p.active === false) return false;
      if (existingServiceIds.has(p.id)) return false;
      if (p.doctorId == null || p.doctorId === docId) return true;
      return false;
    });
  }, [procedures, existingServiceIds, doctorUserId, appt]);

  const lines = useMemo(
    () => (appt && Array.isArray(appt.appointmentServiceLines) ? appt.appointmentServiceLines : []),
    [appt]
  );

  const total = useMemo(
    () => (appt ? Number(appt.finalTotal ?? appt.treatmentPrice ?? 0) || 0 : 0),
    [appt]
  );

  const addonsTotal = useMemo(() => {
    let s = 0;
    for (const id of selectedAddonIds) {
      const pr = procedures.find((x) => x.id === id);
      if (pr) s += Number(pr.price) || 0;
    }
    return s;
  }, [selectedAddonIds, procedures]);

  const projectedTotal = total + addonsTotal;

  const dateStr = useMemo(() => {
    if (!appt) return '';
    const date = appt.appointmentStart ? new Date(appt.appointmentStart) : new Date();
    return new Intl.DateTimeFormat(LOCALE_AR_LATN, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }, [appt]);

  if (!appt) return null;

  const toggleAddon = (id) => {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-surface-base w-full max-w-md rounded-3xl shadow-deep overflow-hidden max-h-[90vh] flex flex-col"
        initial={{ scale: 0.93, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 12, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-5 py-4 text-white shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <DocumentTextIcon className="w-5 h-5 shrink-0" />
              <span className="font-bold text-[14px] truncate">مراجعة الفاتورة للاستقبال</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-emerald-100 mt-1">{dateStr}</p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-2">
            <p className="text-xl font-black tabular-nums">{fmtMoney(projectedTotal)}</p>
            {addonsTotal > 0 && (
              <span className="text-[11px] text-emerald-100 font-semibold">
                (+{fmtMoney(addonsTotal)} إضافات)
              </span>
            )}
          </div>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
          <div className="flex justify-between gap-2 text-[12px]">
            <span className="text-ink-mute">المريض</span>
            <span className="font-bold text-ink-default truncate text-end">{appt.patient}</span>
          </div>
          <div className="flex justify-between gap-2 text-[12px]">
            <span className="text-ink-mute">الطبيب</span>
            <span className="font-semibold text-ink-variant truncate text-end">{doctorName}</span>
          </div>

          <div className="border border-ink-line/30 rounded-xl p-3 bg-surface-dim/30">
            <p className="text-[11px] font-bold text-ink-default mb-2">الخدمات على الموعد</p>
            {lines.length > 0 ? (
              <ul className="space-y-1.5">
                {lines.map((row, i) => (
                  <li key={i} className="flex justify-between gap-2 text-[11px]">
                    <span className="text-ink-variant truncate">
                      {row.name}
                      {row.qty > 1 ? ` ×${row.qty}` : ''}
                    </span>
                    <span className="text-ink-default font-semibold tabular-nums shrink-0">
                      {fmtMoney(row.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-ink-variant">{appt.treatmentName || appt.reason || '—'}</p>
            )}
          </div>

          <div className="border border-ink-line/30 rounded-xl p-3 bg-surface-dim/30">
            <p className="text-[11px] font-bold text-ink-default mb-2">خدمات إضافية للتحصيل</p>
            <p className="text-[10px] text-ink-mute mb-2 leading-relaxed">
              اختر الإجراءات التي أُنجزت ولم تكن على الموعد؛ تُحدَّث أسطر الفاتورة قبل إرسال التنبيه للاستقبال.
            </p>
            {addonChoices.length === 0 ? (
              <p className="text-[11px] text-ink-variant italic py-2">لا توجد خدمات إضافية متاحة لهذا الطبيب.</p>
            ) : (
              <ul className="max-h-[200px] overflow-y-auto space-y-1.5 pe-1">
                {addonChoices.map((p) => {
                  const checked = selectedAddonIds.has(p.id);
                  return (
                    <li key={p.id}>
                      <label
                        className={`flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors
                          ${checked ? 'bg-emerald-50 ring-1 ring-emerald-200/80' : 'hover:bg-surface-mid/40'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAddon(p.id)}
                          disabled={busy}
                          className="mt-0.5 rounded border-ink-line text-emerald-600 focus:ring-emerald-500 shrink-0"
                        />
                        <span className="flex-1 min-w-0 text-[11px] leading-snug">
                          <span className="font-semibold text-ink-default">{p.name}</span>
                          <span className="text-ink-mute font-medium tabular-nums ms-1">
                            · {fmtMoney(Number(p.price) || 0)}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold text-ink-default block mb-1.5">
              ملاحظات للاستقبال <span className="text-ink-mute font-normal">(اختياري)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي توضيح للمحاسبة أو المريض دون تكرار الخدمات المختارة أعلاه…"
              rows={3}
              className="w-full rounded-xl border border-ink-line/40 bg-surface-base px-3 py-2 text-[12px] text-ink-default placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[72px]"
            />
          </div>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-2 shrink-0 border-t border-ink-line/20 pt-3">
          <button
            type="button"
            onClick={() =>
              onDone({
                addonServiceIds: [...selectedAddonIds],
                notes: notes.trim(),
              })
            }
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {busy ? '…' : 'إرسال للاستقبال — جاهز للتحصيل'}
          </button>
          <p className="text-[10px] text-ink-mute text-center leading-relaxed">
            يصل تنبيه للاستقبال لإتمام الدفع؛ لا يتم خصم من هنا.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * طابور الطبيب: 3 مراحل منفصلة عن الاستقبال — وصل → جلسة → مراجعة فاتورة وإشعار الاستقبال.
 */
export default function DoctorQueueBoard({
  anchorDate,
  title = 'طابور الطبيب',
  subtitle,
}) {
  const { items: appts, setAppointmentStatus, refreshAppointments } = useAppointments();
  const { users } = useUsers();
  const { user } = useAuth();
  const { alert: showAlert } = useAppDialog();
  const resolvedDate = useMemo(() => anchorDate ?? new Date(), [anchorDate]);
  const [busyId, setBusyId] = useState(null);
  const [billingAppt, setBillingAppt] = useState(null);

  const dayList = useMemo(() => {
    return appts
      .filter((a) => {
        const d = a.appointmentStart ? new Date(a.appointmentStart) : null;
        return d && isSameDay(d, resolvedDate);
      })
      .filter((a) => !['paid', 'cancelled', 'no_show'].includes(a.status))
      .sort((a, b) => a.start - b.start);
  }, [appts, resolvedDate]);

  const donePaidToday = useMemo(
    () =>
      appts.filter((a) => {
        const d = a.appointmentStart ? new Date(a.appointmentStart) : null;
        return d && isSameDay(d, resolvedDate) && a.status === 'paid';
      }).length,
    [appts, resolvedDate]
  );

  const stages = useMemo(() => stageBuckets(dayList), [dayList]);
  const activeTotal = dayList.length + donePaidToday;

  const doctorMap = useMemo(
    () => Object.fromEntries(users.filter((u) => u.role === 'doctor').map((u) => [u.id, u])),
    [users]
  );

  const selfColor = useMemo(() => {
    const id = user?.id;
    if (!id) return COLOR_MAP.blue.bar;
    const doc = doctorMap[id];
    const key = doc?.color || colorFromDoctorId(id);
    return COLOR_MAP[key]?.bar || COLOR_MAP.blue.bar;
  }, [user?.id, doctorMap]);

  const advance = async (appt, nextStatus) => {
    setBusyId(appt.id);
    try {
      await setAppointmentStatus(appt.id, nextStatus);
      await refreshAppointments();
    } finally {
      setBusyId(null);
    }
  };

  const submitBillingReview = async ({ addonServiceIds = [], notes: notesText = '' }) => {
    if (!billingAppt) return;
    setBusyId(billingAppt.id);
    try {
      const baseIds = [
        ...new Set(
          [
            ...(Array.isArray(billingAppt.serviceIds) ? billingAppt.serviceIds : []),
            ...(billingAppt.serviceId ? [billingAppt.serviceId] : []),
          ].filter(Boolean)
        ),
      ];
      const mergedIds = [...new Set([...baseIds, ...addonServiceIds])];

      const patch = { serviceIds: mergedIds };
      const trimmedNotes = String(notesText || '').trim();
      if (trimmedNotes) {
        const tag = '[ملاحظات الطبيب للاستقبال]';
        patch.notes = `${billingAppt.notes || ''}\n\n${tag}\n${trimmedNotes}`.trim().slice(0, 2000);
      }

      await api.updateAppointment(billingAppt.id, patch);
      await api.requestReceptionAssistance(billingAppt.id);
      await refreshAppointments();
      setBillingAppt(null);
      await showAlert({
        title: 'تم الإرسال',
        message: 'سيصل تنبيه للاستقبال لإتمام التحصيل.',
      });
    } catch (err) {
      await showAlert({
        title: 'تعذّر الإرسال',
        message: formatUserFacingError(err),
        tone: 'danger',
      });
    } finally {
      setBusyId(null);
    }
  };

  const defaultSubtitle = `ثلاث مراحل: من بعد وصول الاستقبال حتى إشعار التحصيل — ${fmtDay(resolvedDate)}`;

  return (
    <>
      <motion.section
        className="rounded-3xl bg-surface-base ring-1 ring-ink-line/30 shadow-card overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div className="px-5 py-4 border-b border-ink-line/20 bg-gradient-to-l from-violet-soft/20 to-surface-base flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-[16px] font-bold text-ink-default">{title}</h2>
            <p className="text-[11px] text-ink-mute mt-0.5">{subtitle ?? defaultSubtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Pill
              icon={ClockIcon}
              count={dayList.length}
              label="نشط بالطابور"
              cls="bg-primary-soft/50 text-primary"
            />
            <Pill
              icon={CheckBadgeIcon}
              count={donePaidToday}
              label="مدفوع اليوم"
              cls="bg-emerald-50 text-emerald-700"
            />
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {STAGES.map((stage) => (
            <DoctorStageColumn
              key={stage.key}
              stage={stage}
              appts={stages[stage.key] || []}
              colorBar={selfColor}
              onAdvance={advance}
              onOpenBilling={setBillingAppt}
              busyId={busyId}
            />
          ))}
        </div>

        {activeTotal === 0 && (
          <div className="px-5 py-6 text-center text-ink-mute text-[12px] border-t border-ink-line/20">
            لا مواعيد نشطة في هذا اليوم لهذا الطبيب.
          </div>
        )}
      </motion.section>

      <AnimatePresence>
        {billingAppt && (
          <DoctorBillingReviewModal
            key={billingAppt.id}
            appt={billingAppt}
            doctorName={doctorMap[billingAppt.doctor]?.name || ''}
            doctorUserId={user?.id}
            onClose={() => !busyId && setBillingAppt(null)}
            onDone={submitBillingReview}
            busy={busyId === billingAppt.id}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Pill({ icon: Icon, count, label, cls }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{count}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}
