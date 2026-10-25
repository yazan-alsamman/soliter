import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon, MagnifyingGlassIcon, UserPlusIcon, BoltIcon, CalendarDaysIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  DAYS_AR, fmtTime, dateStringForWorkweekDay,
  startOfSundayWeek, isAppointmentSlotInPast, fmtMoney,
} from "../../data/strings.js";
import { useAppointments } from "../../context/AppointmentsContext.jsx";
import { usePatients }     from "../../context/PatientsContext.jsx";
import { useUsers }        from "../../context/UsersContext.jsx";
import { getServiceByName } from "../../data/services.js";
import { useProcedures }   from "../../context/ProceduresContext.jsx";
import { api }             from "../../services/apiClient.js";
import { categoryLabelAr } from "../../data/procedureCategories.js";
import { COLOR_MAP, colorFromDoctorId } from "../../utils/doctorColors.js";

// ─── Constants ─────────────────────────────────────────────────────────────

const GRID_START_HOUR  = 8;
const GRID_END_HOUR    = 21;
const HOUR_OPTIONS     = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => GRID_START_HOUR + i);
const QUARTER_FRACS    = [0, 0.25, 0.5, 0.75];
const DURATION_OPTIONS = [
  { v: 0.5, label: '30 دقيقة' },
  { v: 1,   label: 'ساعة'      },
  { v: 1.5, label: 'ساعة ونصف' },
  { v: 2,   label: 'ساعتان'    },
];
const DAY_SHORT = ['أح', 'إث', 'ث', 'أر', 'خم', 'ج', 'س'];

// ─── Helpers ───────────────────────────────────────────────────────────────

function toDecSet(slots) {
  const out = new Set();
  for (const s of slots || []) {
    const [h, m] = String(s).split(':').map(Number);
    if (Number.isFinite(h)) out.add(Math.round((h + (m || 0) / 60) * 240) / 240);
  }
  return out;
}
function inAvail(dec, set) {
  if (set == null) return true;
  if (set.size === 0) return false;
  const k = Math.round(Number(dec) * 240) / 240;
  return [...set].some(s => Math.abs(s - k) < 1 / 120);
}
function defaultDuration(docId, visitType, procs) {
  if (visitType) return getServiceByName(visitType, { procedures: procs, doctorId: docId }).duration;
  return 1;
}
function initForm(prefill) {
  return {
    patientId: null, patient: '', patientPhone: '',
    doctor: '', day: prefill?.day ?? new Date().getDay(),
    start: 9, duration: 1,
    serviceCategory: prefill?.serviceCategory || '',
    visitType: prefill?.visitType || '',
    reason: prefill?.reason || prefill?.visitType || '',
    urgent: false, ...(prefill || {}),
  };
}

// ─── UI atoms ──────────────────────────────────────────────────────────────

function Section({ title, children, icon }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-[12px] font-bold text-ink-default uppercase tracking-wide">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Err({ msg }) {
  if (!msg) return null;
  return <p className="text-[11px] text-danger font-semibold mt-1.5 flex items-center gap-1"><span>⚠</span>{msg}</p>;
}

// ─── Main Dialog ───────────────────────────────────────────────────────────

export default function NewAppointmentDialog({ open, onClose, prefill, calendarWeekStart }) {
  const weekAnchor = calendarWeekStart || startOfSundayWeek();
  const { addAppointment, updateAppointment, getConflictsForDraft } = useAppointments();
  const { getProceduresByDoctor } = useProcedures();
  const { patients, searchPatients } = usePatients();
  const { users, isLoading: usersLoading, error: usersError } = useUsers();

  const [form,           setForm]           = useState(() => initForm(prefill));
  const [errors,         setErrors]         = useState({});
  const [durTouched,     setDurTouched]     = useState(Boolean(prefill?.duration));
  const [overrideOB,     setOverrideOB]     = useState(false);
  const [forceOB,        setForceOB]        = useState(false);
  const [repeatOB,       setRepeatOB]       = useState(false);
  const [submitMsg,      setSubmitMsg]      = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [svrSuggested,   setSvrSuggested]   = useState(null);
  const [availSet,       setAvailSet]       = useState(null);
  const [findingNearest, setFindingNearest] = useState(false);
  const [nearestFound,   setNearestFound]   = useState(null);

  // Patient search
  const [pQuery,    setPQuery]    = useState(prefill?.patient || '');
  const [showDrop,  setShowDrop]  = useState(false);
  const [quickNew,  setQuickNew]  = useState(false);
  const [remote,    setRemote]    = useState([]);
  const [searching, setSearching] = useState(false);
  const pRef       = useRef(null);
  const dropRef    = useRef(null);
  const startRef   = useRef(form.start);
  startRef.current = form.start;

  const isEdit = Boolean(prefill?.id);

  // ── doctor changes reset service ──────────────────────────────────────
  const prevDoc = useRef(undefined);
  useEffect(() => {
    if (prevDoc.current === undefined) { prevDoc.current = form.doctor; return; }
    if (prevDoc.current === form.doctor) return;
    prevDoc.current = form.doctor;
    setForm(f => ({ ...f, serviceCategory: '', visitType: '', reason: '' }));
    setNearestFound(null);
  }, [form.doctor]);

  const doctors = useMemo(() =>
    users.filter(u => String(u.role || '').toLowerCase() === 'doctor' && u.active !== false),
    [users]
  );

  useEffect(() => {
    if (!form.doctor || !doctors.length) return;
    if (!doctors.some(d => d.id === form.doctor))
      setForm(f => ({ ...f, doctor: '', serviceCategory: '', visitType: '', reason: '' }));
  }, [doctors, form.doctor]);

  // ── reset on open/close ───────────────────────────────────────────────
  useEffect(() => {
    setForm(initForm(prefill)); setPQuery(prefill?.patient || '');
    setRemote([]); setQuickNew(false); setErrors({}); setDurTouched(Boolean(prefill?.duration));
    setOverrideOB(false); setForceOB(false); setRepeatOB(false);
    setSubmitMsg(''); setSvrSuggested(null); setAvailSet(null);
    setNearestFound(null); setFindingNearest(false);
    prevDoc.current = undefined;
  }, [prefill, open]);

  // ── outside click ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = e => {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          pRef.current && !pRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: null }));
    setSubmitMsg(''); setNearestFound(null);
  };

  // ── Patient search ────────────────────────────────────────────────────
  useEffect(() => {
    const q = pQuery.trim();
    if (!q || q.length < 2) { setRemote([]); setSearching(false); return; }
    let dead = false;
    setSearching(true);
    const t = window.setTimeout(async () => {
      try { const r = await searchPatients(q); if (!dead) setRemote(r); }
      catch { if (!dead) setRemote([]); }
      finally { if (!dead) setSearching(false); }
    }, 250);
    return () => { dead = true; window.clearTimeout(t); };
  }, [pQuery, searchPatients]);

  const filteredPts = useMemo(() => {
    if (!pQuery.trim()) return patients.slice(0, 6);
    if (remote.length) return remote.slice(0, 8);
    const q = pQuery.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q)).slice(0, 8);
  }, [patients, pQuery, remote]);

  const pickPt      = p => { set('patientId', p.id); set('patient', p.name); setPQuery(p.name); setShowDrop(false); setQuickNew(false); };
  const quickCreate = n => { set('patientId', null); set('patient', n.trim()); setPQuery(n.trim()); setShowDrop(false); setQuickNew(true); };
  const clearPt     = () => { set('patientId', null); set('patient', ''); setPQuery(''); setQuickNew(false); setShowDrop(false); };

  // ── Procedures ────────────────────────────────────────────────────────
  const docProcs  = useMemo(() => getProceduresByDoctor(form.doctor, false), [form.doctor, getProceduresByDoctor]);
  const cats      = useMemo(() => [...new Set(docProcs.map(p => p.category || 'general'))].sort(), [docProcs]);
  const procs     = useMemo(() => docProcs.filter(p => (p.category || 'general') === form.serviceCategory), [docProcs, form.serviceCategory]);
  const hasProcs  = docProcs.length > 0;
  const fallback  = getServiceByName(form.visitType || form.reason, { procedures: [], doctorId: form.doctor });
  const activeSvc = hasProcs
    ? docProcs.find(p => p.name === form.visitType && (form.serviceCategory ? (p.category || 'general') === form.serviceCategory : true))
    : fallback;

  useEffect(() => {
    if (!form.visitType || form.serviceCategory) return;
    const p = docProcs.find(x => x.name === form.visitType);
    if (p?.category) setForm(f => ({ ...f, serviceCategory: p.category || 'general' }));
  }, [form.visitType, form.serviceCategory, docProcs]);

  useEffect(() => {
    if (!form.serviceCategory) return;
    const ok = docProcs.some(p => p.name === form.visitType && (p.category || 'general') === form.serviceCategory);
    if (form.visitType && !ok) setForm(f => ({ ...f, visitType: '', reason: '' }));
  }, [form.serviceCategory, docProcs, form.visitType]);

  const effDur  = durTouched ? Number(form.duration) : defaultDuration(form.doctor, form.visitType, docProcs);
  const conflict = useMemo(() =>
    getConflictsForDraft({ ...form, duration: effDur }, prefill?.id || null, { calendarWeekStart: weekAnchor }),
    [form, effDur, getConflictsForDraft, prefill?.id, weekAnchor]
  );
  const hasConflict = conflict.conflicts.length > 0;

  const selHour = useMemo(() => {
    const s = Number(form.start);
    if (!Number.isFinite(s)) return GRID_START_HOUR;
    return Math.max(GRID_START_HOUR, Math.min(GRID_END_HOUR, Math.floor(s + 1e-6)));
  }, [form.start]);

  // ── Availability ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!form.doctor || !activeSvc?.id) { setSvrSuggested(null); setAvailSet(null); return; }
      try {
        const av    = await api.getAppointmentAvailability({
          doctorId: form.doctor, date: dateStringForWorkweekDay(form.day, weekAnchor),
          serviceId: activeSvc.id, durationMinutes: Math.max(1, Math.round(effDur * 60)),
        });
        const slots = av?.availableSlots || [];
        const ss    = toDecSet(slots);
        setAvailSet(ss);
        if (!slots.length) { setSvrSuggested(null); return; }
        const sorted  = [...ss].sort((a, b) => a - b);
        const nearest = sorted.find(v => v >= Number(startRef.current) - 1 / 240);
        setSvrSuggested(typeof nearest === 'number' ? nearest : sorted[0]);
      } catch { setSvrSuggested(null); setAvailSet(null); }
    };
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [activeSvc?.id, form.day, form.doctor, weekAnchor, effDur]);

  useEffect(() => {
    if (!availSet || availSet.size === 0) return;
    if (inAvail(form.start, availSet)) return;
    const h = Math.max(GRID_START_HOUR, Math.min(GRID_END_HOUR, Math.floor(Number(form.start) + 1e-6)));
    const slot = QUARTER_FRACS.map(q => h + q).find(t => inAvail(t, availSet));
    if (slot != null) setForm(f => ({ ...f, start: slot }));
  }, [availSet, form.start]);

  // ── اقرب موعد ────────────────────────────────────────────────────────
  const searchNearest = useCallback(async () => {
    if (!form.doctor || !activeSvc?.id || findingNearest) return;
    setFindingNearest(true); setNearestFound(null);
    const todayDow = new Date().getDay();
    const nowDec   = new Date().getHours() + new Date().getMinutes() / 60;
    for (let off = 0; off < 7; off++) {
      const day = (todayDow + off) % 7;
      const ds  = dateStringForWorkweekDay(day, weekAnchor);
      if (!ds) continue;
      try {
        const av    = await api.getAppointmentAvailability({
          doctorId: form.doctor, date: ds, serviceId: activeSvc.id,
          durationMinutes: Math.max(1, Math.round(effDur * 60)),
        });
        const slots = (av?.availableSlots || []).filter(s => {
          const [h, m] = s.split(':').map(Number);
          const d = h + (m || 0) / 60;
          return off === 0 ? d >= nowDec + 0.5 : true;
        });
        if (slots.length) {
          const [h, m] = slots[0].split(':').map(Number);
          const start  = h + (m || 0) / 60;
          setNearestFound({ day, start, label: `${DAYS_AR[day]?.label ?? ''} · ${fmtTime(start)}` });
          setFindingNearest(false); return;
        }
      } catch { continue; }
    }
    setNearestFound({ day: null, start: null, label: null });
    setFindingNearest(false);
  }, [form.doctor, activeSvc?.id, effDur, weekAnchor, findingNearest]);

  const applyNearest = () => {
    if (!nearestFound?.label) return;
    set('day', nearestFound.day); set('start', nearestFound.start);
  };

  if (!open) return null;

  // ── Validation ────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.patient.trim()) e.patient = 'اسم المريض مطلوب';
    if (quickNew && !form.patientPhone.trim()) e.patientPhone = 'رقم الهاتف مطلوب للتسجيل السريع';
    if (!form.doctor) e.doctor = 'يجب اختيار الطبيب';
    if (!form.serviceCategory) e.serviceCategory = 'يجب اختيار فئة الخدمة';
    if (!form.visitType?.trim()) e.visitType = 'يجب اختيار الخدمة';
    if (form.doctor && !hasProcs) e.visitType = 'لا توجد خدمات مفعّلة لهذا الطبيب';
    if (!activeSvc?.id) e.visitType = 'اختر خدمة صالحة';
    if (!isEdit && isAppointmentSlotInPast(weekAnchor, Number(form.day), Number(form.start))) e.past = 'لا يمكن حجز وقت مضى';
    if (hasConflict && !overrideOB) e.conflict = 'الوقت محجوز — أكّد الحجز فوق الطاقة';
    if (availSet?.size === 0) e.avail = 'لا توجد أوقات متاحة لهذا اليوم';
    else if (availSet?.size > 0 && !inAvail(form.start, availSet)) e.avail = 'اختر ربع ساعة متاح';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      if (isEdit && prefill?.id) {
        await updateAppointment(prefill.id, { ...form, duration: effDur, serviceId: activeSvc.id });
        onClose(); return;
      }
      const res = await addAppointment(
        { ...form, duration: effDur, serviceId: activeSvc.id },
        { weekStart: weekAnchor, allowOverride: overrideOB || forceOB, confirmRepeatedOverbook: repeatOB }
      );
      if (!res?.ok) {
        setSubmitMsg(
          res.code === 'REQUIRES_REPEAT_CONFIRMATION' ? 'يلزم تأكيد مزدوج للحجز المتكرر فوق الطاقة' :
          res.code === 'CONFLICT'    ? 'تعارض — اختر وقتاً آخر أو فعّل الحجز فوق الطاقة' :
          res.code === 'PAST_SLOT'   ? 'لا يمكن حجز وقت مضى' :
          res.message || 'تعذر إنشاء الحجز'
        );
        return;
      }
      onClose();
    } finally { setSubmitting(false); }
  };

  const selDoctor = doctors.find(d => d.id === form.doctor);
  const drC       = selDoctor ? (COLOR_MAP[colorFromDoctorId(selDoctor.id)] || COLOR_MAP.blue) : null;

  // ─────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        className="bg-surface-base w-full max-w-3xl rounded-3xl shadow-deep flex flex-col"
        style={{ maxHeight: 'min(92vh, 820px)' }}
        initial={{ y: 32, scale: 0.96, opacity: 0 }}
        animate={{ y: 0,  scale: 1,    opacity: 1 }}
        exit={{    y: 16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-ink-line/30 shrink-0
                        bg-gradient-to-l from-primary-soft/15 to-surface-base">
          <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
            <CalendarDaysIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold text-ink-default">
              {isEdit ? 'تعديل الموعد' : 'حجز موعد جديد'}
            </h2>
            <p className="text-[11px] text-ink-mute">
              {isEdit ? 'عدّل التفاصيل وسيُحدَّث الحجز فوراً' : 'أكمل البيانات لتأكيد الحجز'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-surface-mid flex items-center justify-center text-ink-mute shrink-0 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body — 2-column layout on desktop ─────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* PATIENT — full width on desktop */}
          <div className="md:col-span-2">
            <Section title="المريض" icon={<div className="w-5 h-5 rounded-md bg-primary-soft text-primary text-[10px] font-black flex items-center justify-center">1</div>}>
              {form.patientId && !quickNew ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl bg-secondary-soft/60 border border-secondary/30">
                    <div className="w-9 h-9 rounded-full bg-secondary text-white flex items-center justify-center font-black text-sm shrink-0">
                      {form.patient.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-ink-default truncate">{form.patient}</p>
                      <p className="text-[11px] text-secondary flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3" /> مريض موجود
                      </p>
                    </div>
                  </div>
                  <button onClick={clearPt}
                    className="w-9 h-9 rounded-xl hover:bg-surface-mid flex items-center justify-center text-ink-mute shrink-0 transition-colors">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute pointer-events-none" />
                    <input
                      ref={pRef} value={pQuery}
                      onChange={e => { setPQuery(e.target.value); set('patient', e.target.value); set('patientId', null); setQuickNew(false); setShowDrop(true); }}
                      onFocus={() => setShowDrop(true)}
                      className="input ps-9 text-sm rounded-xl border-ink-line/40 focus:border-primary"
                      placeholder="ابحث بالاسم أو رقم الهاتف..."
                      autoFocus={!isEdit}
                    />
                    <AnimatePresence>
                      {showDrop && (
                        <motion.div ref={dropRef}
                          className="absolute z-20 top-full mt-1 w-full bg-surface-base border border-ink-line/40 rounded-2xl shadow-pop max-h-52 overflow-y-auto"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                          {searching && <p className="px-3 py-2 text-[11px] text-ink-mute border-b border-ink-line/20">جارٍ البحث...</p>}
                          {filteredPts.map(p => (
                            <button key={p.id} type="button" onMouseDown={e => { e.preventDefault(); pickPt(p); }}
                              className="w-full text-start px-3 py-2.5 hover:bg-surface-low flex items-center gap-2.5 border-b border-ink-line/20 last:border-0 transition-colors">
                              <div className="w-7 h-7 rounded-full bg-primary-soft text-primary grid place-items-center text-xs font-bold shrink-0">{p.name.charAt(0)}</div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-ink-default truncate">{p.name}</p>
                                {p.phone && <p className="text-[10px] text-ink-mute">{p.phone}</p>}
                              </div>
                            </button>
                          ))}
                          {pQuery.trim() && (
                            <button type="button" onMouseDown={e => { e.preventDefault(); quickCreate(pQuery); }}
                              className="w-full text-start px-3 py-2.5 hover:bg-primary-soft/30 flex items-center gap-2.5 text-primary transition-colors">
                              <UserPlusIcon className="w-4 h-4 shrink-0" />
                              <span className="text-[12px] font-semibold">تسجيل "{pQuery.trim()}" مريضاً جديداً</span>
                            </button>
                          )}
                          {!filteredPts.length && !pQuery.trim() && (
                            <p className="px-3 py-3 text-[11px] text-ink-mute text-center">اكتب للبحث أو تسجيل مريض جديد</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {quickNew && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-warn/30 bg-warn-soft/40">
                        <UserPlusIcon className="w-4 h-4 text-warn shrink-0" />
                        <span className="text-[11px] text-ink-variant">تسجيل سريع — يمكن إكمال الملف لاحقاً</span>
                      </div>
                      <input value={form.patientPhone} onChange={e => set('patientPhone', e.target.value)}
                        className="input w-36 text-sm rounded-xl" placeholder="هاتف *" type="tel" />
                    </div>
                  )}
                </div>
              )}
              <Err msg={errors.patient || errors.patientPhone} />
            </Section>
          </div>

          {/* DOCTOR */}
          <Section title="الطبيب" icon={<div className="w-5 h-5 rounded-md bg-primary-soft text-primary text-[10px] font-black flex items-center justify-center">2</div>}>
            {usersError ? (
              <p className="text-[12px] text-danger">{usersError}</p>
            ) : usersLoading ? (
              <p className="text-[12px] text-ink-mute">جارٍ التحميل...</p>
            ) : !doctors.length ? (
              <p className="text-[12px] text-ink-mute">لا يوجد أطباء مفعّلون</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {doctors.map(d => {
                  const c      = COLOR_MAP[colorFromDoctorId(d.id)] || COLOR_MAP.blue;
                  const active = form.doctor === d.id;
                  return (
                    <button
                      key={d.id} type="button"
                      onClick={() => { setForm(f => ({ ...f, doctor: d.id, serviceCategory: '', visitType: '', reason: '' })); setErrors(e => ({ ...e, doctor: null })); }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border-2 transition-all text-right
                        ${active ? `${c.bg} ${c.border} ring-2 ring-current` : 'border-ink-line/30 hover:border-primary/40 bg-surface-base'}`}
                    >
                      <div className={`w-9 h-9 rounded-full ${c.bar} flex items-center justify-center text-white font-black text-[11px] shrink-0`}>
                        {d.initials || d.name?.charAt(0) || '؟'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[12px] font-bold truncate ${active ? c.text : 'text-ink-default'}`}>{d.name}</p>
                        {d.dept && <p className="text-[10px] text-ink-mute truncate">{d.dept}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <Err msg={errors.doctor} />
          </Section>

          {/* SERVICE */}
          <Section title="الخدمة" icon={<div className="w-5 h-5 rounded-md bg-primary-soft text-primary text-[10px] font-black flex items-center justify-center">3</div>}>
            {form.doctor && cats.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cats.map(cat => {
                  const active = form.serviceCategory === cat;
                  return (
                    <button key={cat} type="button"
                      onClick={() => { setForm(f => ({ ...f, serviceCategory: cat, visitType: '', reason: '' })); setErrors(e => ({ ...e, serviceCategory: null, visitType: null })); }}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border-2 transition-all
                        ${active ? `${drC?.bg || 'bg-primary-soft'} ${drC?.border || 'border-primary'} ${drC?.text || 'text-primary'}`
                                  : 'border-ink-line/30 text-ink-variant hover:border-primary/40 hover:text-primary'}`}>
                      {categoryLabelAr(cat)}
                    </button>
                  );
                })}
              </div>
            )}

            {form.serviceCategory && procs.length > 0 && (
              <div className="border border-ink-line/20 rounded-2xl overflow-hidden bg-surface-base">
                {procs.map(svc => {
                  const active = form.visitType === svc.name;
                  return (
                    <button key={svc.id} type="button"
                      onClick={() => { setForm(f => ({ ...f, visitType: svc.name, reason: svc.name })); setErrors(e => ({ ...e, visitType: null })); }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-right hover:bg-surface-low transition-colors border-b border-ink-line/15 last:border-0
                        ${active ? `${drC?.bg || 'bg-primary-soft/40'}` : ''}`}>
                      <div className="flex items-center gap-2">
                        {active && <div className={`w-2 h-2 rounded-full ${drC?.bar || 'bg-primary'}`} />}
                        <span className={`text-[13px] font-semibold ${active ? drC?.text : 'text-ink-default'}`}>{svc.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-ink-mute shrink-0">
                        <span>{svc.duration === 0.5 ? '30 د' : `${svc.duration} س`}</span>
                        {svc.price > 0 && <span className="font-bold text-ink-variant">{fmtMoney(svc.price)}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!hasProcs && form.doctor && (
              <p className="text-[11px] text-warn bg-warn-soft/40 rounded-xl px-3 py-2 border border-warn/30">
                لا توجد خدمات مفعّلة لهذا الطبيب. أضف خدمات من صفحة الإجراءات أولاً.
              </p>
            )}
            {!form.doctor && (
              <p className="text-[12px] text-ink-mute italic">اختر الطبيب أولاً لعرض الخدمات</p>
            )}
            <Err msg={errors.serviceCategory || errors.visitType} />
          </Section>

          {/* اقرب موعد — full width */}
          {form.doctor && activeSvc?.id && (
            <div className="md:col-span-2 rounded-2xl border-2 border-secondary/30 bg-secondary-soft/30 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-secondary text-white flex items-center justify-center shrink-0">
                  <BoltIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-ink-default">أقرب موعد متاح</p>
                  {nearestFound?.label && <p className="text-[12px] text-secondary font-bold mt-0.5">{nearestFound.label}</p>}
                  {nearestFound?.day === null && <p className="text-[11px] text-danger mt-0.5">لا توجد مواعيد هذا الأسبوع</p>}
                  {!nearestFound && <p className="text-[10px] text-ink-mute">اضغط للبحث في كل أيام الأسبوع</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {nearestFound?.label && (
                  <button onClick={applyNearest}
                    className="px-3 py-2 rounded-xl bg-secondary text-white text-[11px] font-bold hover:bg-secondary/90 transition-colors">
                    تطبيق
                  </button>
                )}
                <button onClick={searchNearest} disabled={findingNearest}
                  className="px-3 py-2 rounded-xl border-2 border-secondary text-secondary text-[11px] font-bold hover:bg-secondary-soft/50 transition-colors disabled:opacity-50">
                  {findingNearest ? '...' : nearestFound ? 'إعادة' : 'بحث'}
                </button>
              </div>
            </div>
          )}

          {/* DAY — full width */}
          <div className="md:col-span-2">
            <Section title="اليوم" icon={<div className="w-5 h-5 rounded-md bg-primary-soft text-primary text-[10px] font-black flex items-center justify-center">4</div>}>
              <div className="flex gap-1.5">
                {DAYS_AR.map((d, i) => {
                  const date   = new Date(weekAnchor);
                  date.setDate(date.getDate() + i);
                  const past   = !isEdit && isAppointmentSlotInPast(weekAnchor, i, GRID_START_HOUR + 12);
                  const today  = new Date().getDay() === i;
                  const active = form.day === i;
                  return (
                    <button key={d.key} type="button" disabled={past} onClick={() => set('day', i)}
                      className={`flex-1 flex flex-col items-center py-3 px-1 rounded-2xl border-2 transition-all
                        ${active
                          ? 'bg-primary text-white border-primary shadow-focus'
                          : past
                          ? 'opacity-40 cursor-not-allowed border-ink-line/20 bg-surface-dim/30 text-ink-mute'
                          : today
                          ? 'border-primary/50 bg-primary-soft/30 text-primary'
                          : 'border-ink-line/30 hover:border-primary/40 bg-surface-base text-ink-default'}`}>
                      <span className="text-[10px] font-semibold">{DAY_SHORT[i]}</span>
                      <span className="text-[16px] font-black mt-0.5">{date.getDate()}</span>
                      {today && !active && <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </Section>
          </div>

          {/* TIME */}
          <Section title="الوقت" icon={<div className="w-5 h-5 rounded-md bg-primary-soft text-primary text-[10px] font-black flex items-center justify-center">5</div>}>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {HOUR_OPTIONS.map(h => {
                const hasSlot = QUARTER_FRACS.some(q => inAvail(h + q, availSet));
                const isSel   = selHour === h;
                return (
                  <button key={h} type="button"
                    onClick={() => { const pick = QUARTER_FRACS.map(q => h + q).find(t => inAvail(t, availSet)) ?? h; set('start', pick); }}
                    disabled={!!(availSet && !hasSlot)}
                    className={`shrink-0 w-12 h-10 rounded-xl border-2 text-[12px] font-bold transition-all
                      ${isSel
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : availSet && !hasSlot
                        ? 'opacity-40 bg-surface-dim/30 border-ink-line/15 text-ink-mute cursor-not-allowed'
                        : 'border-ink-line/30 text-ink-default hover:border-primary/40 hover:bg-primary-soft/30'}`}>
                    {h}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-4 gap-2 mt-1">
              {QUARTER_FRACS.map(frac => {
                const t      = selHour + frac;
                const en     = inAvail(t, availSet);
                const active = Math.abs(Math.round(form.start * 240) / 240 - Math.round(t * 240) / 240) < 1e-5;
                return (
                  <button key={frac} type="button" disabled={!en} onClick={() => set('start', t)}
                    className={`h-12 rounded-2xl border-2 text-[13px] font-bold transition-all
                      ${active
                        ? 'bg-primary text-white border-primary shadow-focus'
                        : en
                        ? 'border-ink-line/30 text-ink-default hover:border-primary/40 hover:bg-primary-soft/30'
                        : 'opacity-40 bg-surface-dim/30 border-transparent text-ink-mute cursor-not-allowed'}`}>
                    {fmtTime(t)}
                  </button>
                );
              })}
            </div>
            {availSet?.size === 0 && <p className="text-[11px] text-warn text-center mt-1">لا توجد فترات متاحة</p>}
            <Err msg={errors.avail} />
          </Section>

          {/* DURATION */}
          <Section title="المدة" icon={<div className="w-5 h-5 rounded-md bg-primary-soft text-primary text-[10px] font-black flex items-center justify-center">6</div>}>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map(d => {
                const active = Math.abs(effDur - d.v) < 0.01;
                return (
                  <button key={d.v} type="button"
                    onClick={() => { setDurTouched(true); set('duration', d.v); }}
                    className={`h-11 rounded-2xl border-2 text-[12px] font-bold transition-all
                      ${active
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'border-ink-line/30 text-ink-default hover:border-primary/40 hover:bg-primary-soft/30'}`}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Server suggestion (different from current) */}
          {!hasConflict && svrSuggested != null && Math.abs(Number(svrSuggested) - Number(form.start)) > 1 / 60 && (
            <div className="md:col-span-2 flex items-center justify-between px-4 py-2.5 rounded-xl bg-primary-soft/30 border border-primary/30">
              <p className="text-[12px] font-semibold text-primary">اقتراح الخادم: {fmtTime(svrSuggested)}</p>
              <button onClick={() => set('start', svrSuggested)}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                تطبيق
              </button>
            </div>
          )}

          {/* OPTIONS — full width */}
          <div className="md:col-span-2 flex items-center justify-between gap-4 pt-1 border-t border-ink-line/20">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative shrink-0">
                <input type="checkbox" checked={form.urgent} onChange={e => set('urgent', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 rounded-full bg-surface-mid peer-checked:bg-danger transition-colors" />
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[-20px]" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-ink-default">حالة عاجلة</p>
                <p className="text-[10px] text-ink-mute">مراجعة فورية</p>
              </div>
            </label>

            {!hasConflict && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={forceOB} onChange={e => setForceOB(e.target.checked)} className="w-4 h-4 accent-warn" />
                <span className="text-[11px] text-ink-variant">السماح بالحجز فوق الطاقة</span>
              </label>
            )}
          </div>

          {/* CONFLICT — full width */}
          {hasConflict && (
            <motion.div className="md:col-span-2 rounded-2xl border-2 border-danger/40 bg-danger-soft/40 p-4 flex flex-col gap-3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div>
                <p className="text-[14px] font-bold text-danger">⚠ تعارض في الوقت</p>
                <p className="text-[11px] text-ink-variant mt-0.5">{conflict.conflicts.length} موعد يتعارض</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {conflict.suggestedStart != null && (
                  <button onClick={() => set('start', conflict.suggestedStart)}
                    className="px-3 py-1.5 rounded-xl border border-primary/40 text-primary text-[11px] font-bold hover:bg-primary-soft/40 transition-colors">
                    أقرب وقت: {fmtTime(conflict.suggestedStart)}
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={overrideOB} onChange={e => setOverrideOB(e.target.checked)} className="w-4 h-4 accent-warn" />
                <span className="text-[12px] text-ink-variant">متابعة رغم التعارض</span>
              </label>
              {overrideOB && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={repeatOB} onChange={e => setRepeatOB(e.target.checked)} className="w-4 h-4 accent-danger" />
                  <span className="text-[12px] text-ink-variant">تأكيد الحجز المتكرر فوق الطاقة</span>
                </label>
              )}
              <Err msg={errors.conflict} />
            </motion.div>
          )}

          {errors.past && <div className="md:col-span-2 rounded-xl bg-danger-soft/40 border border-danger/30 px-3 py-2 text-[11px] text-danger font-semibold">{errors.past}</div>}
          {submitMsg && !hasConflict && <div className="md:col-span-2 rounded-xl bg-danger-soft/40 border border-danger/30 px-3 py-2 text-[11px] text-danger font-semibold">{submitMsg}</div>}
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-ink-line/30 bg-surface-dim/40 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {selDoctor && drC && (
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${drC.bg} ${drC.text} ring-1 ${drC.border}`}>
                {selDoctor.name}
              </span>
            )}
            {form.doctor && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface-mid text-ink-variant font-medium tabular-nums">
                {DAYS_AR[form.day]?.label} · {fmtTime(form.start)}
              </span>
            )}
            {activeSvc?.price > 0 && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-secondary-soft text-secondary font-bold ring-1 ring-secondary/30">
                {fmtMoney(activeSvc.price)}
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={onClose} disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-ink-line/40 text-[12px] font-semibold text-ink-variant hover:bg-surface-mid transition-colors">
              إلغاء
            </button>
            <motion.button onClick={submit} whileTap={{ scale: 0.96 }}
              disabled={!hasProcs || submitting || !doctors.length || usersLoading}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-[12px] font-bold shadow-focus hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {submitting ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'تأكيد الحجز'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
