import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useAppointments } from '../context/AppointmentsContext.jsx';
import { useUsers }        from '../context/UsersContext.jsx';
import { useAuth }         from '../context/AuthContext.jsx';
import { usePatients }     from '../context/PatientsContext.jsx';
import { colorFromDoctorId } from '../utils/doctorColors.js';
import {
  getSundayOfWeek, addDays, isSameDay, fmtDay, fmtDayShort,
} from '../utils/calendarUtils.js';
import DayListView          from '../components/appointments/DayListView.jsx';
import WeekStripView        from '../components/appointments/WeekStripView.jsx';
import AgendaView           from '../components/appointments/AgendaView.jsx';
import ClinicPulse          from '../components/appointments/ClinicPulse.jsx';
import AiBookingBar         from '../components/appointments/AiBookingBar.jsx';
import SmartContextPanel    from '../components/appointments/SmartContextPanel.jsx';
import NewAppointmentDialog from '../components/appointments/NewAppointmentDialog.jsx';
import QueueBoard           from '../components/dashboard/QueueBoard.jsx';
import DoctorQueueBoard     from '../components/dashboard/DoctorQueueBoard.jsx';

/* RTL: first item sits visually on the right — طابور first for reception workflow */
const VIEWS = [
  { id: 'queue',  label: 'طابور', icon: '▥' },
  { id: 'day',    label: 'يوم',   icon: '⊞' },
  { id: 'week',   label: 'أسبوع', icon: '≡' },
  { id: 'agenda', label: 'جدول',  icon: '☰' },
];

const DENSITIES = [
  { id: 'comfortable', label: 'مريح',  hint: 'مساحة واسعة' },
  { id: 'compact',     label: 'مدمج', hint: 'متوسط' },
  { id: 'dense',       label: 'مكثف', hint: 'حجم كبير' },
];

const DENSITY_KEY = 'mediflow:scheduleDensity';

// ─── Department filter tabs ────────────────────────────────────────────────

function DeptBar({ departments, selected, onChange, doctors }) {
  const countFor = (dept) =>
    dept === 'all'
      ? doctors.length
      : doctors.filter(d => (d.dept || 'عام') === dept).length;

  const tabs = [{ id: 'all', label: 'كل الأقسام' }, ...departments.map(d => ({ id: d, label: d }))];

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-ink-line/40 bg-surface-base overflow-x-auto shrink-0">
      {tabs.map(dept => {
        const active = selected === dept.id;
        return (
          <button
            key={dept.id}
            onClick={() => onChange(dept.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all
              ${active
                ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'text-ink-variant hover:bg-surface-mid/60 hover:text-ink-default'}`}
          >
            {dept.label}
            <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold
              ${active ? 'bg-primary text-white' : 'bg-surface-mid text-ink-mute'}`}>
              {countFor(dept.id)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Top navigation bar ────────────────────────────────────────────────────

function CalendarNav({
  view, setView, currentDate, setCurrentDate, onNewAppt, canCreate,
  density, setDensity,
}) {
  const today   = new Date();
  const isToday = isSameDay(currentDate, today);
  const weekStart = getSundayOfWeek(currentDate);

  const navigate = (delta) => {
    setCurrentDate(d => addDays(d, view === 'week' ? delta * 7 : delta));
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-ink-line/40 bg-surface-base shrink-0 gap-3 flex-wrap">
      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentDate(today)}
          className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all border
            ${isToday
              ? 'bg-primary text-white border-primary shadow-focus'
              : 'bg-surface-mid text-ink-variant border-ink-line/40 hover:border-primary/30'}`}
        >
          اليوم
        </button>
        <div className="flex items-center">
          <button onClick={() => navigate(1)}  className="w-8 h-8 rounded-xl hover:bg-surface-mid flex items-center justify-center text-ink-variant transition-colors text-lg">‹</button>
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl hover:bg-surface-mid flex items-center justify-center text-ink-variant transition-colors text-lg">›</button>
        </div>
        <h2 className="text-[14px] font-bold text-ink-default whitespace-nowrap">
          {view === 'week'
            ? `${fmtDayShort(weekStart)} — ${fmtDayShort(addDays(weekStart, 6))}`
            : fmtDay(currentDate)
          }
        </h2>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Density switcher (day view only) */}
        {view === 'day' && (
          <div className="hidden md:flex items-center gap-0.5 bg-surface-mid/60 rounded-xl p-0.5 border border-ink-line/30">
            {DENSITIES.map(d => (
              <button
                key={d.id}
                onClick={() => setDensity(d.id)}
                title={d.hint}
                className={`px-2.5 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all
                  ${density === d.id
                    ? 'bg-surface-base shadow-sm text-ink-default'
                    : 'text-ink-mute hover:text-ink-default'}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        {/* View switcher */}
        <div className="flex items-center gap-0.5 bg-surface-mid/60 rounded-xl p-0.5 border border-ink-line/30">
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all flex items-center gap-1
                ${view === v.id
                  ? 'bg-surface-base shadow-sm text-ink-default'
                  : 'text-ink-mute hover:text-ink-default'}`}
            >
              <span className="text-[10px]">{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>

        {/* New appointment */}
        {canCreate && (
          <motion.button
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[12px] font-bold shadow-focus hover:bg-primary/90 transition-colors"
            whileTap={{ scale: 0.95 }}
            onClick={onNewAppt}
          >
            <span className="text-base leading-none font-black">+</span>
            موعد جديد
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ─── Main Appointments page ────────────────────────────────────────────────

export default function Appointments() {
  const { items: appointments } = useAppointments();
  const { users }               = useUsers();
  const { patients }            = usePatients();
  const { can, user }           = useAuth();

  const [view,         setView]         = useState('day');
  const [currentDate,  setCurrentDate]  = useState(new Date());
  const [selectedDept, setSelectedDept] = useState('all');
  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [prefill,      setPrefill]      = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);   // Smart Context Panel
  const [density,      setDensity]      = useState(() => {
    if (typeof window === 'undefined') return 'comfortable';
    try { return localStorage.getItem(DENSITY_KEY) || 'comfortable'; }
    catch { return 'comfortable'; }
  });

  useEffect(() => {
    try { localStorage.setItem(DENSITY_KEY, density); } catch { /* ignore */ }
  }, [density]);

  const canCreate = can('appointments.create');
  const isDoctor  = user?.role === 'doctor';

  // ── URL params: ?create=1, ?focus=ai, ?reschedule=<id> ──
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Doctors & departments ──────────────────────────────────────────────
  const allDoctors = useMemo(() =>
    users
      .filter(u => u.role === 'doctor' && u.active !== false)
      .map(u => ({ ...u, color: u.color || colorFromDoctorId(u.id) })),
    [users]
  );

  const departments = useMemo(() =>
    [...new Set(allDoctors.map(d => d.dept || 'عام'))].sort(),
    [allDoctors]
  );

  const filteredDoctors = useMemo(() => {
    if (isDoctor) return allDoctors.filter(d => d.id === user?.id);
    return selectedDept === 'all'
      ? allDoctors
      : allDoctors.filter(d => (d.dept || 'عام') === selectedDept);
  }, [allDoctors, selectedDept, isDoctor, user?.id]);

  // ── Enrich appointments ────────────────────────────────────────────────
  const enrichedAppts = useMemo(() => {
    const map = Object.fromEntries(allDoctors.map(d => [d.id, d]));
    const base = appointments.map(a => ({
      ...a,
      doctorName: map[a.doctor]?.name || '',
      color: a.color || colorFromDoctorId(a.doctor),
    }));
    if (isDoctor) return base.filter(a => a.doctor === user?.id);
    return base;
  }, [appointments, allDoctors, isDoctor, user?.id]);

  const calendarWeekStart = useMemo(() => getSundayOfWeek(currentDate), [currentDate]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSlotClick = useCallback((doctorId, decimal) => {
    if (!canCreate) return;
    setSelectedAppt(null);
    setPrefill({ doctor: doctorId || '', day: currentDate.getDay(), start: decimal });
    setDialogOpen(true);
  }, [canCreate, currentDate]);

  // Single click → Smart Context Panel (no modal)
  const handleApptClick = useCallback((appt) => {
    setSelectedAppt(prev => prev?.id === appt.id ? null : appt);
  }, []);

  // Edit from Smart Context Panel → open dialog
  const handleEditFromPanel = useCallback((appt) => {
    setPrefill({
      id: appt.id, patient: appt.patient, patientId: appt.patientId,
      doctor: appt.doctor, day: appt.day, start: appt.start,
      duration: appt.duration, serviceCategory: appt.serviceCategory,
      visitType: appt.visitType, reason: appt.reason, urgent: appt.urgent,
    });
    setDialogOpen(true);
  }, []);

  const handleDayClick  = useCallback((date) => { setCurrentDate(date); setView('day'); }, []);
  const handleNewAppt   = useCallback(() => { setSelectedAppt(null); setPrefill(null); setDialogOpen(true); }, []);
  const handleClose     = useCallback(() => { setDialogOpen(false); setPrefill(null); }, []);
  const handleClosePanel = useCallback(() => setSelectedAppt(null), []);

  // Keep selected appt data fresh when appointments update
  useEffect(() => {
    if (!selectedAppt) return;
    const fresh = appointments.find(a => a.id === selectedAppt.id);
    if (fresh) setSelectedAppt(prev => ({ ...prev, ...fresh }));
  }, [appointments, selectedAppt?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep-link: /appointments?view=queue (command palette)
  useEffect(() => {
    const v = searchParams.get('view');
    if (!v || !['day', 'week', 'agenda', 'queue'].includes(v)) return;
    setView(v);
    const next = new URLSearchParams(searchParams);
    next.delete('view');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Handle URL params on mount + when params change
  useEffect(() => {
    if (!appointments.length) return;
    const create = searchParams.get('create');
    const reschedule = searchParams.get('reschedule');
    if (create === '1' && !dialogOpen) {
      setPrefill(null);
      setDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    } else if (reschedule && !dialogOpen) {
      const appt = appointments.find((a) => a.id === reschedule);
      if (appt) {
        setPrefill({
          id: appt.id, patient: appt.patient, patientId: appt.patientId,
          doctor: appt.doctor, day: appt.day, start: appt.start,
          duration: appt.duration, serviceCategory: appt.serviceCategory,
          visitType: appt.visitType, reason: appt.reason, urgent: appt.urgent,
        });
        setDialogOpen(true);
      }
      const next = new URLSearchParams(searchParams);
      next.delete('reschedule');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, appointments, dialogOpen]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-surface-base overflow-hidden">
      {/* Navigation */}
      <CalendarNav
        view={view} setView={setView}
        currentDate={currentDate} setCurrentDate={setCurrentDate}
        onNewAppt={handleNewAppt} canCreate={canCreate}
        density={density} setDensity={setDensity}
      />

      {/* Dept tabs (admin/receptionist only) */}
      {!isDoctor && departments.length > 1 && (
        <DeptBar
          departments={departments} selected={selectedDept}
          onChange={setSelectedDept} doctors={allDoctors}
        />
      )}

      {/* AI Booking — slim collapsible bar */}
      {canCreate && (
        <AiBookingBar
          calendarWeekStart={calendarWeekStart}
          doctors={filteredDoctors}
          patients={patients}
        />
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left: Clinic Pulse sidebar (hidden on طابور — full width for queue board) */}
        {view !== 'queue' && (
          <ClinicPulse
            currentDate={currentDate}
            onChange={setCurrentDate}
            appointments={enrichedAppts}
            doctors={filteredDoctors}
          />
        )}

        {/* Center: Calendar views or reception queue (same stages as dashboard, per doctor when applicable) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            className="flex-1 flex flex-col overflow-hidden min-h-0"
            initial={{ opacity: 0, x: 6  }}
            animate={{ opacity: 1,  x: 0  }}
            exit={{    opacity: 0,  x: -6 }}
            transition={{ duration: 0.15 }}
          >
            {view === 'queue' && (
              <div className="flex-1 overflow-y-auto min-h-0 min-h-[min(480px,70vh)] p-3 md:p-4">
                {isDoctor ? (
                  <DoctorQueueBoard
                    anchorDate={currentDate}
                    title="طابور الطبيب"
                  />
                ) : (
                  <QueueBoard
                    anchorDate={currentDate}
                    groupByDoctor={!isDoctor}
                    doctors={filteredDoctors}
                    title="طابور الاستقبال"
                  />
                )}
              </div>
            )}
            {view === 'day' && (
              <DayListView
                currentDate={currentDate}
                doctors={filteredDoctors}
                appointments={enrichedAppts}
                onSlotClick={handleSlotClick}
                onApptClick={handleApptClick}
                isDoctor={isDoctor}
                doctorUser={user}
                density={density}
                selectedApptId={selectedAppt?.id}
              />
            )}
            {view === 'week' && (
              <WeekStripView
                currentDate={currentDate} appointments={enrichedAppts}
                onDayClick={handleDayClick} onApptClick={handleApptClick}
              />
            )}
            {view === 'agenda' && (
              <AgendaView
                currentDate={currentDate} doctors={filteredDoctors}
                appointments={enrichedAppts} onApptClick={handleApptClick}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Right: Smart Context Panel */}
        <AnimatePresence>
          {selectedAppt && (
            <SmartContextPanel
              key={selectedAppt.id}
              appt={selectedAppt}
              onClose={handleClosePanel}
              onEdit={handleEditFromPanel}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Create / Edit dialog */}
      <NewAppointmentDialog
        open={dialogOpen} onClose={handleClose}
        prefill={prefill} calendarWeekStart={calendarWeekStart}
      />
    </div>
  );
}
