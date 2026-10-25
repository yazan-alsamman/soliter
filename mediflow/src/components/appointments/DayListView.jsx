import { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowPathIcon,
  CurrencyDollarIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  PlusIcon,
  ChevronDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAppointments } from '../../context/AppointmentsContext.jsx';
import { useUsers }        from '../../context/UsersContext.jsx';
import { useBilling }      from '../../context/BillingContext.jsx';
import { usePatients }     from '../../context/PatientsContext.jsx';
import { COLOR_MAP, colorFromDoctorId } from '../../utils/doctorColors.js';
import {
  GRID_START, GRID_END, formatTime, isSameDay, decimalFromDate,
  STATUS_META, NEXT_STATUS,
} from '../../utils/calendarUtils.js';
import { fmtMoney, fmtNumberAr } from '../../data/strings.js';
import InvoiceModal from './InvoiceModal.jsx';

// ─── Doctor filter chips ──────────────────────────────────────────────────

function DoctorFilter({ doctors, selectedId, onChange }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-4 py-2 border-b border-ink-line/30 bg-surface-base shrink-0">
      <button
        onClick={() => onChange('all')}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all
          ${selectedId === 'all'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-surface-mid/60 text-ink-variant hover:text-primary'}`}
      >
        كل الأطباء
        <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black
          ${selectedId === 'all' ? 'bg-white/20 text-white' : 'bg-surface-mid text-ink-mute'}`}>
          {doctors.length}
        </span>
      </button>

      {doctors.map(d => {
        const c      = COLOR_MAP[d.color || colorFromDoctorId(d.id)] || COLOR_MAP.blue;
        const active = selectedId === d.id;
        return (
          <button
            key={d.id}
            onClick={() => onChange(d.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all
              ${active ? `${c.bg} ${c.text} ring-1 ${c.border}` : 'text-ink-variant hover:bg-surface-mid/60'}`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${c.bar}`} />
            {d.name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Compact signal chip ─────────────────────────────────────────────────

function Signal({ icon: Icon, tone, label, title }) {
  const TONE = {
    primary: 'bg-primary-soft/70 text-primary ring-primary/20',
    warn:    'bg-warn-soft/70 text-warn ring-warn/25',
    danger:  'bg-danger-soft/70 text-danger ring-danger/25',
    success: 'bg-success-soft/70 text-success ring-success/20',
    neutral: 'bg-surface-mid/70 text-ink-variant ring-ink-line/30',
    ai:      'bg-pulse-soft/80 text-primary ring-primary/25',
  };
  return (
    <span
      title={title || label}
      className={`inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ring-1 ${TONE[tone] || TONE.neutral}`}
    >
      {Icon && <Icon className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

// ─── Live time badge (starting soon / running late / etc.) ─────────────────

function TimeBadge({ appt, nowDec, isViewingToday }) {
  if (!isViewingToday) return null;
  const finishedStatuses = ['completed', 'paid', 'cancelled', 'no_show', 'in_consultation'];
  if (finishedStatuses.includes(appt.status)) return null;

  const diffMin = Math.round((appt.start - nowDec) * 60);

  if (diffMin > 30) return null; // not relevant yet

  if (diffMin > 5) {
    return (
      <Signal
        icon={ClockIcon}
        tone="primary"
        label={`في ${diffMin} د`}
        title={`يبدأ خلال ${diffMin} دقيقة`}
      />
    );
  }
  if (diffMin > -5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ring-1 bg-success-soft/80 text-success ring-success/25 animate-pulse-soft">
        <span className="w-1.5 h-1.5 rounded-full bg-success" />
        الآن
      </span>
    );
  }
  // Delayed: started but not arrived/in session
  if (['scheduled', 'confirmed'].includes(appt.status)) {
    const lateMin = Math.abs(diffMin);
    return (
      <Signal
        icon={ExclamationCircleIcon}
        tone="warn"
        label={`متأخر ${lateMin} د`}
        title={`الموعد تأخر ${lateMin} دقيقة عن وقته`}
      />
    );
  }
  return null;
}

// ─── Single appointment card in the list ─────────────────────────────────

function ApptCard({
  appt, doctor, onClick, onAdvance, onInvoice, busy, density,
  patient, balance, isReturning, isDelayed, aiSuggested,
  nowDec, isViewingToday, isSelected,
}) {
  const c    = COLOR_MAP[doctor?.color || colorFromDoctorId(appt.doctor)] || COLOR_MAP.blue;
  const sm   = STATUS_META[appt.status] || STATUS_META.scheduled;
  const next = NEXT_STATUS[appt.status];
  const dense   = density === 'dense';
  const compact = density === 'compact' || dense;

  const handleAdvance = (e) => {
    e.stopPropagation();
    if (appt.status === 'completed') onInvoice(appt);
    else if (next) onAdvance(appt, next);
  };

  const padCls     = dense ? 'p-1.5' : compact ? 'p-2' : 'p-3';
  const avatarSize = dense ? 'w-7 h-7 text-[10px]' : compact ? 'w-8 h-8 text-[10px]' : 'w-9 h-9 text-[11px]';
  const titleCls   = dense ? 'text-[11.5px]' : 'text-[13px]';
  const metaCls    = dense ? 'text-[9.5px]' : 'text-[10px]';

  return (
    <motion.div
      className={`rounded-2xl border ${padCls} cursor-pointer transition-all relative overflow-hidden
        ${isSelected
          ? `bg-primary-soft/30 border-primary/50 shadow-focus ring-1 ring-primary/30`
          : 'bg-surface-base border-ink-line/40 hover:border-primary/40 hover:shadow-card'
        }`}
      style={{ borderRightWidth: 4, borderRightColor: 'transparent' }}
      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: isSelected ? 0 : -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={() => onClick?.(appt)}
    >
      {/* Doctor color stripe */}
      <span aria-hidden className={`absolute right-0 top-0 bottom-0 w-1 ${c.bar} opacity-80`} />

      {/* Selected indicator */}
      {isSelected && (
        <span aria-hidden className="absolute right-0 top-0 bottom-0 w-1 bg-primary opacity-100" />
      )}

      <div className="flex items-start gap-2.5">
        {/* Doctor avatar */}
        <div className={`${avatarSize} rounded-full ${c.bar} flex items-center justify-center text-white font-black shrink-0`}>
          {doctor?.initials || appt.patient?.charAt(0) || '؟'}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`${titleCls} font-bold text-ink-default truncate leading-tight flex items-center gap-1`}>
                {appt.urgent && <span className="text-danger font-black shrink-0">!</span>}
                <span className="truncate">{appt.patient}</span>
                {/* Returning/new patient dot */}
                <span
                  title={isReturning ? 'مريض عائد' : 'مريض جديد'}
                  className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                    isReturning ? 'bg-secondary' : 'bg-primary'
                  }`}
                />
              </p>
              {!dense && (
                <p className={`${metaCls} text-ink-variant truncate`}>
                  {appt.reason}
                </p>
              )}
            </div>
            <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full font-bold ring-1 ${sm.tw}`}>
              {sm.label}
            </span>
          </div>

          {/* Operational signals row */}
          <div className={`flex items-center gap-1 flex-wrap mt-1 ${metaCls}`}>
            {!dense && (
              <span className={`${c.text} font-semibold truncate max-w-[60%]`}>
                {doctor?.name || '—'}
              </span>
            )}
            {!dense && (
              <span className="text-ink-mute">
                · {appt.duration === 0.5 ? '30 د' : `${appt.duration} س`}
              </span>
            )}

            {/* Live time awareness */}
            <TimeBadge appt={appt} nowDec={nowDec} isViewingToday={isViewingToday} />

            {appt.urgent && (
              <Signal tone="danger" label="عاجل" />
            )}
            {isDelayed && !isViewingToday && (
              <Signal icon={ExclamationCircleIcon} tone="warn" label="متأخر" title="مر وقت الموعد ولم يُسجل الوصول" />
            )}
            {balance > 0 && (
              <Signal
                icon={CurrencyDollarIcon}
                tone="warn"
                label={fmtMoney(balance)}
                title="رصيد غير مدفوع"
              />
            )}
            {appt.overbooked && (
              <Signal tone="danger" label="فوق الطاقة" />
            )}
            {patient?.packageRemaining > 0 && (
              <Signal
                icon={ArrowPathIcon}
                tone="primary"
                label={`${patient.packageRemaining} جلسة`}
                title="جلسات متبقية في الباقة"
              />
            )}
            {aiSuggested && (
              <Signal icon={SparklesIcon} tone="ai" label="مقترح ذكي" />
            )}
          </div>
        </div>

        {/* Time + advance button */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span className={`${dense ? 'text-[11px]' : 'text-[12px]'} font-black tabular-nums text-ink-default`}>
            {formatTime(appt.start)}
          </span>
          {next && (
            <button
              onClick={handleAdvance}
              disabled={busy}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${c.bar} text-white
                          hover:brightness-110 active:brightness-95 disabled:opacity-50 transition-all`}
              aria-label={`تقدم إلى ${next}`}
            >
              {busy ? '...' : '←'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Hour group block (premium, calm) ────────────────────────────────────

function EmptyGap({ count, onExpand }) {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      onClick={onExpand}
      className="w-full my-1 flex items-center gap-2 px-3 py-1.5 text-[10.5px] font-semibold text-ink-mute hover:text-primary border border-dashed border-ink-line/30 rounded-xl bg-surface-low/30 hover:bg-primary-soft/20 transition-colors"
    >
      <span className="flex-1 h-px bg-ink-line/25" />
      <ChevronDownIcon className="w-3 h-3" />
      {fmtNumberAr(count)} {count === 1 ? 'ساعة فارغة' : 'ساعات فارغة'} — إظهار
      <span className="flex-1 h-px bg-ink-line/25" />
    </button>
  );
}

function HourBlock({
  hour, items, isCurrentHour, isPastHour, onSlotClick, renderCard, nowDec,
}) {
  const label = formatTime(hour);
  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`group relative rounded-2xl border ${
        isCurrentHour
          ? 'border-primary/35 bg-primary-soft/25'
          : 'border-ink-line/30 bg-surface-base'
      } px-3 py-2.5 mb-2.5 overflow-hidden`}
    >
      {/* Hour heading row */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`flex items-center gap-1.5 ${
          isCurrentHour ? 'text-primary' : isPastHour ? 'text-ink-mute' : 'text-ink-default'
        }`}>
          <span className="text-[12.5px] font-black tabular-nums leading-none">
            {label}
          </span>
          {isCurrentHour && (
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
              <span className="relative rounded-full bg-primary w-1.5 h-1.5" />
            </span>
          )}
        </div>
        <span className={`text-[10px] font-semibold ${
          items.length > 0 ? 'text-ink-mute' : 'text-ink-mute/60'
        }`}>
          {items.length > 0
            ? `${fmtNumberAr(items.length)} ${items.length === 1 ? 'موعد' : 'مواعيد'}`
            : 'فارغة'}
        </span>
        <div className="flex-1 h-px bg-ink-line/20" />
        <button
          type="button"
          onClick={() => onSlotClick?.(null, hour)}
          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[10px] text-primary font-bold px-2 py-1 rounded-lg bg-primary-soft/60 hover:bg-primary-soft"
        >
          <PlusIcon className="w-3 h-3" />
          إضافة موعد
        </button>
      </div>

      {/* Cards */}
      {items.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <AnimatePresence>
            {items.map(renderCard)}
          </AnimatePresence>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSlotClick?.(null, hour)}
          className="w-full text-[10.5px] text-ink-mute py-2 hover:text-primary hover:bg-primary-soft/15 rounded-xl transition-colors text-center"
        >
          + موعد {label}
        </button>
      )}

      {/* Now indicator inside the current hour */}
      {isCurrentHour && nowDec != null && (
        <div
          aria-hidden
          className="absolute inset-x-0 pointer-events-none flex items-center"
          style={{
            top: `${Math.min(95, Math.max(5, ((nowDec - hour) * 100)))}%`,
          }}
        >
          <span className="ms-2 w-2 h-2 rounded-full bg-danger shadow-md" />
          <span className="flex-1 h-px bg-danger/55" />
        </div>
      )}
    </motion.section>
  );
}

// ─── DayListView ──────────────────────────────────────────────────────────

export default function DayListView({
  currentDate,
  doctors,
  appointments,
  onSlotClick,
  onApptClick,
  isDoctor,
  doctorUser,
  density = 'comfortable',
  selectedApptId,
}) {
  const [filterId,      setFilterId]    = useState('all');
  const [busyId,        setBusyId]      = useState(null);
  const [invoiceAppt,   setInvoiceAppt] = useState(null);
  const [showAllHours,  setShowAllHours] = useState(false);
  const [liveNow,       setLiveNow]     = useState(() => new Date());

  const { setAppointmentStatus } = useAppointments();
  const { users }    = useUsers();
  const { invoices } = useBilling();
  const { patients } = usePatients();
  const scrollRef    = useRef(null);

  // Lock filter when user is a doctor
  const effectiveFilter = isDoctor ? doctorUser?.id : filterId;

  // Live clock — update every 30 s so time badges stay fresh
  useEffect(() => {
    const id = setInterval(() => setLiveNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const isViewingToday = isSameDay(currentDate, liveNow);
  const nowDec         = decimalFromDate(liveNow);
  const currentHour    = Math.floor(nowDec);

  // Patient lookup
  const patientById = useMemo(() => {
    const m = new Map();
    patients?.forEach((p) => p?.id && m.set(p.id, p));
    return m;
  }, [patients]);
  const patientByName = useMemo(() => {
    const m = new Map();
    patients?.forEach((p) => p?.name && m.set(p.name.trim(), p));
    return m;
  }, [patients]);

  // Unpaid balance per patient
  const balanceByPatient = useMemo(() => {
    const m = new Map();
    invoices?.forEach((inv) => {
      if (!inv.patientId) return;
      if (!['draft', 'partial'].includes(inv.status)) return;
      const bal = Number(inv.balance ?? Math.max(0, (inv.amount || 0) - (inv.paidAmount || 0)));
      if (bal > 0) m.set(inv.patientId, (m.get(inv.patientId) || 0) + bal);
    });
    return m;
  }, [invoices]);

  // Filter appointments to this date + selected doctor
  const dayAppts = useMemo(() => {
    return appointments
      .filter(a => {
        const d = a.appointmentStart ? new Date(a.appointmentStart) : null;
        if (!d || !isSameDay(d, currentDate)) return false;
        if (effectiveFilter === 'all') return true;
        return a.doctor === effectiveFilter;
      })
      .sort((a, b) => a.start - b.start);
  }, [appointments, currentDate, effectiveFilter]);

  // Group appointments by HOUR
  const apptsByHour = useMemo(() => {
    const map = new Map();
    dayAppts.forEach(a => {
      const h = Math.floor(a.start);
      if (!map.has(h)) map.set(h, []);
      map.get(h).push(a);
    });
    return map;
  }, [dayAppts]);

  // Hours we should render
  const hoursToShow = useMemo(() => {
    const filledHours = [...apptsByHour.keys()];
    const set = new Set(filledHours);
    if (isViewingToday) set.add(currentHour);
    if (showAllHours) {
      for (let h = GRID_START; h <= GRID_END; h++) set.add(h);
    }
    return [...set]
      .filter((h) => h >= GRID_START && h <= GRID_END)
      .sort((a, b) => a - b);
  }, [apptsByHour, isViewingToday, currentHour, showAllHours]);

  const doctorMap = useMemo(() =>
    Object.fromEntries(users.filter(u => u.role === 'doctor').map(u => [u.id, u])),
    [users]
  );

  // Auto-scroll to "now" hour block on mount / when toggling today view
  useEffect(() => {
    if (!scrollRef.current) return;
    const target = isViewingToday
      ? scrollRef.current.querySelector('[data-current-hour="true"]')
      : scrollRef.current.querySelector('[data-hour-block]');
    if (target?.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isViewingToday, currentHour, hoursToShow.length]);

  const advance = async (appt, nextStatus) => {
    setBusyId(appt.id);
    try { await setAppointmentStatus(appt.id, nextStatus); }
    finally { setBusyId(null); }
  };

  const confirmPayment = async () => {
    if (!invoiceAppt) return;
    setBusyId(invoiceAppt.id);
    try { await setAppointmentStatus(invoiceAppt.id, 'paid'); setInvoiceAppt(null); }
    finally { setBusyId(null); }
  };

  // Render a single appointment card with all signals enriched
  const renderCard = (a) => {
    const pById   = a.patientId ? patientById.get(a.patientId) : null;
    const pByName = !pById && a.patient ? patientByName.get(String(a.patient).trim()) : null;
    const p       = pById || pByName || null;
    const balance = p?.id ? (balanceByPatient.get(p.id) || 0) : 0;
    const isReturning = !!(p && (p.status === 'active' || p.status === 'returning' || (p.lastVisit && p.lastVisit !== '—')));
    const delayed = isViewingToday
      && ['scheduled', 'confirmed'].includes(a.status)
      && a.start <= nowDec - 0.1;
    const aiSuggested = !!(a.aiSuggested || a.suggestedByAi);
    const packageRemaining = Number(p?.packageRemaining || 0);
    const enrichedPatient = p ? { ...p, packageRemaining } : null;

    return (
      <ApptCard
        key={a.id}
        appt={a}
        doctor={doctorMap[a.doctor]}
        onClick={onApptClick}
        onAdvance={advance}
        onInvoice={setInvoiceAppt}
        busy={busyId === a.id}
        density={density}
        patient={enrichedPatient}
        balance={balance}
        isReturning={isReturning}
        isDelayed={delayed}
        aiSuggested={aiSuggested}
        nowDec={nowDec}
        isViewingToday={isViewingToday}
        isSelected={selectedApptId === a.id}
      />
    );
  };

  const hiddenHoursCount = (GRID_END - GRID_START + 1) - hoursToShow.length;

  return (
    <>
      {!isDoctor && doctors.length > 1 && (
        <DoctorFilter doctors={doctors} selectedId={filterId} onChange={setFilterId} />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        <div className="relative max-w-3xl mx-auto">
          {dayAppts.length === 0 ? (
            <motion.div
              className="text-center py-16 text-ink-mute"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-primary-soft/40 grid place-items-center text-primary">
                <PlusIcon className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-ink-default">لا مواعيد لهذا اليوم</p>
              <p className="text-[11px] mt-1">اضغط على أي ساعة لإضافة موعد</p>
              <button
                onClick={() => onSlotClick?.(null, 9)}
                className="mt-4 btn-primary h-9 px-4 text-xs gap-1.5 mx-auto"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                موعد جديد
              </button>
            </motion.div>
          ) : (
            <>
              {hoursToShow.map((h, idx) => {
                const items = apptsByHour.get(h) || [];
                const isPastHour   = isViewingToday && h < currentHour;
                const isCurrentHour = isViewingToday && h === currentHour;

                let gap = 0;
                if (!showAllHours && idx < hoursToShow.length - 1) {
                  gap = hoursToShow[idx + 1] - h - 1;
                }

                return (
                  <div key={h} data-hour-block data-current-hour={isCurrentHour ? 'true' : 'false'}>
                    <HourBlock
                      hour={h}
                      items={items}
                      isCurrentHour={isCurrentHour}
                      isPastHour={isPastHour}
                      onSlotClick={onSlotClick}
                      renderCard={renderCard}
                      nowDec={isCurrentHour ? nowDec : null}
                    />
                    {gap > 0 && (
                      <EmptyGap count={gap} onExpand={() => setShowAllHours(true)} />
                    )}
                  </div>
                );
              })}

              {!showAllHours && hiddenHoursCount > 0 && (
                <div className="text-center mt-3">
                  <button
                    onClick={() => setShowAllHours(true)}
                    className="text-[11px] font-semibold text-primary hover:text-primary-hover px-3 py-1.5 rounded-lg hover:bg-primary-soft/40 transition-colors"
                  >
                    عرض كل ساعات اليوم ({fmtNumberAr(hiddenHoursCount)} مخفية)
                  </button>
                </div>
              )}
              {showAllHours && (
                <div className="text-center mt-3">
                  <button
                    onClick={() => setShowAllHours(false)}
                    className="text-[11px] font-semibold text-ink-mute hover:text-primary px-3 py-1.5 rounded-lg hover:bg-surface-low transition-colors"
                  >
                    إخفاء الساعات الفارغة
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Invoice modal */}
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
