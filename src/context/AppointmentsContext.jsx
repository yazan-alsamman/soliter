import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useBilling } from "./BillingContext.jsx";
import { getServiceByName } from "../data/services.js";
import { useProcedures } from "./ProceduresContext.jsx";
import { usePatients } from "./PatientsContext.jsx";
import { api } from "../services/apiClient.js";
import { useAuth } from "./AuthContext.jsx";
import { colorFromDoctorId } from "../utils/doctorColors.js";

const AppointmentsContext = createContext(null);
const DEFAULT_NO_SHOW_DELAY_MINUTES = 25;
const takeItems = (payload) => (Array.isArray(payload) ? payload : payload?.items || []);

/** API defaults to 50 rows per page (max 100); seed/calendar need the full set. */
async function fetchAllAppointmentRows() {
  const limit = 100;
  const acc = [];
  let page = 1;
  let totalPages = 1;
  const safetyMaxPages = 500;
  do {
    const payload = await api.getAppointments({ page, limit });
    acc.push(...takeItems(payload));
    totalPages = Math.max(1, Number(payload?.meta?.pages ?? 1) || 1);
    page += 1;
  } while (page <= totalPages && page <= safetyMaxPages);
  return acc;
}

/** @param dayColumn 0..6 = Sun..Sat (Date#getDay) within the given week */
function getAppointmentDate(dayColumn, start, weekStartSunday) {
  const base = weekStartSunday
    ? new Date(weekStartSunday)
    : (() => {
        const n = new Date();
        const w = new Date(n);
        w.setHours(0, 0, 0, 0);
        w.setDate(n.getDate() - n.getDay());
        return w;
      })();
  base.setHours(0, 0, 0, 0);
  const target = new Date(base);
  target.setDate(base.getDate() + Number(dayColumn || 0));
  const hour = Math.floor(Number(start || 0));
  const minutes = Math.round((Number(start || 0) - hour) * 60);
  target.setHours(hour, minutes, 0, 0);
  return target;
}

function normalizeReason(reason, procedures, doctorId) {
  return getServiceByName(reason, { procedures, doctorId }).name;
}

function resolveDuration(appt, procedures) {
  if (Number(appt.duration) > 0) return Number(appt.duration);
  const visitType = (appt.visitType || appt.reason || "").trim();
  const resolved = getServiceByName(visitType, { procedures, doctorId: appt.doctor });
  if (visitType && Number(resolved?.duration) > 0) return Number(resolved.duration);
  return 1;
}

function overlaps(a, b) {
  const aStart = Number(a.start);
  const aEnd = aStart + Number(a.duration);
  const bStart = Number(b.start);
  const bEnd = bStart + Number(b.duration);
  return aStart < bEnd && bStart < aEnd;
}

function findConflicts(items, candidate, ignoreId = null) {
  return items.filter((item) => {
    if (ignoreId && item.id === ignoreId) return false;
    if (item.day !== candidate.day) return false;
    if (item.doctor !== candidate.doctor) return false;
    if (item.status === "cancelled") return false;
    return overlaps(item, candidate);
  });
}

function findNearestAvailableStart(items, candidate) {
  const step = 0.5;
  let pointer = Math.max(8, Number(candidate.start));
  const lastStart = 16;
  while (pointer <= lastStart) {
    const nextCandidate = { ...candidate, start: pointer };
    if (findConflicts(items, nextCandidate).length === 0) return pointer;
    pointer = Number((pointer + step).toFixed(1));
  }
  return null;
}

function resolveServiceForAppointment(appt, procedures) {
  if (appt.serviceId) {
    const found = procedures.find((p) => p.id === appt.serviceId);
    if (found) return found;
  }
  return getServiceByName(appt.treatmentName || appt.visitType || appt.reason, {
    procedures,
    doctorId: appt.doctor,
  });
}

function normalizeAppointment(appt, procedures) {
  const service = resolveServiceForAppointment(appt, procedures);
  return {
    ...appt,
    serviceId: appt.serviceId || service?.id,
    doctor: appt.doctor || "",
    color: appt.color || colorFromDoctorId(appt.doctor),
    visitType: appt.visitType || normalizeReason(appt.reason, procedures, appt.doctor),
    duration: resolveDuration(appt, procedures),
    status: appt.status || "scheduled",
    treatmentName: appt.treatmentName || service.name,
    treatmentPrice: Number(appt.treatmentPrice) > 0 ? Number(appt.treatmentPrice) : service.price,
    priceConfirmed: !!appt.priceConfirmed,
    overbooked: !!appt.overbooked,
    reminderStatus: appt.reminderStatus || "idle",
    reminderWindow: appt.reminderWindow || "2h",
    reminderText: appt.reminderText || "",
    media: Array.isArray(appt.media) ? appt.media : [],
  };
}

function getSundayOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

function mapApiAppointment(appt, procedures) {
  const startDate = new Date(appt.startTime);
  const endDate = new Date(appt.endTime);
  const start = startDate.getHours() + startDate.getMinutes() / 60;
  const duration = Math.max(0.25, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  const appointmentServices = appt.appointmentServices || [];
  const serviceNames = appointmentServices.map((x) => x.service?.name).filter(Boolean);
  const serviceTotal =
    appointmentServices.length > 0
      ? appointmentServices.reduce((sum, x) => sum + Number(x.lineTotal || 0), 0)
      : Number(appt.service?.price || 0);
  const appointmentServiceLines = appointmentServices.map((x) => ({
    name: x.service?.name || "خدمة",
    qty: Number(x.quantity) > 0 ? Number(x.quantity) : 1,
    lineTotal: Number(x.lineTotal || 0),
  }));
  return normalizeAppointment(
    {
      id: appt.id,
      patientId: appt.patientId,
      doctor: appt.doctorId,
      patient: appt.patient?.name || appt.patientName || "—",
      reason: serviceNames[0] || appt.service?.name || "استشارة",
      visitType: serviceNames[0] || appt.service?.name || "استشارة",
      treatmentName: serviceNames.join(" + ") || appt.service?.name || "استشارة",
      treatmentPrice: Number(appt.finalTotal ?? serviceTotal),
      serviceIds: appointmentServices.map((x) => x.serviceId),
      serviceId: appt.serviceId || appt.service?.id || appointmentServices[0]?.serviceId,
      baseTotal: Number(appt.baseTotal ?? serviceTotal),
      discount: Number(appt.discount ?? 0),
      finalTotal: Number(appt.finalTotal ?? serviceTotal),
      consentObtained: !!appt.consentObtained,
      treatmentDetails: appt.treatmentDetails || "",
      doctorRemarks: appt.doctorRemarks || "",
      specialConditions: appt.specialConditions || "",
      media: Array.isArray(appt.media) ? appt.media : [],
      day: startDate.getDay(),
      start,
      duration,
      status: appt.status,
      notes: appt.notes || "",
      overbooked: !!appt.overbooked,
      _weekStart: getSundayOfWeek(startDate),
      appointmentStart: appt.startTime,
      appointmentServiceLines,
    },
    procedures
  );
}

export function AppointmentsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { procedures } = useProcedures();
  const { patients, addPatient } = usePatients();
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState(null);
  const [pendingStatusIds, setPendingStatusIds] = useState([]);
  const [noShowDelayMinutes] = useState(DEFAULT_NO_SHOW_DELAY_MINUTES);
  const { refreshInvoices } = useBilling();

  const refreshAppointments = useCallback(async () => {
    const rows = await fetchAllAppointmentRows();
    setItems((prevItems) =>
      rows.map((row) => {
        const mapped = mapApiAppointment(row, procedures);
        const old = prevItems.find((x) => x.id === mapped.id);
        const bad =
          !mapped.patient ||
          mapped.patient === "—" ||
          String(mapped.patient).trim() === "";
        if (
          bad &&
          old &&
          typeof old.patient === "string" &&
          old.patient.trim() &&
          old.patient !== "—"
        ) {
          return { ...mapped, patient: old.patient };
        }
        return mapped;
      })
    );
  }, [procedures]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    // Initial load only — recurring polling is handled by PollingCoordinator
    refreshAppointments().catch(() => setItems([]));
  }, [isAuthenticated, refreshAppointments]);

  const showToast = useCallback((message) => {
    setToast({ message, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const addAppointment = useCallback(async (appt, options = {}) => {
    if (!appt.doctor) {
      return { ok: false, code: "DOCTOR_REQUIRED", message: "تعذر إنشاء الموعد: الطبيب غير محدد." };
    }
    const duration = resolveDuration(appt, procedures);
    const selectedService = resolveServiceForAppointment(appt, procedures);
    if (!selectedService?.id) {
      return {
        ok: false,
        code: "SERVICE_REQUIRED",
        message: "الإجراء غير محدد أو غير متوافق مع الطبيب المختار.",
      };
    }
    const base = {
      day: Number(appt.day),
      start: Number(appt.start),
      duration,
      patient: appt.patient,
      reason: normalizeReason(appt.reason, procedures, appt.doctor),
      visitType: appt.visitType || normalizeReason(appt.reason, procedures, appt.doctor),
      treatmentName: selectedService.name,
      treatmentPrice: selectedService.price,
      priceConfirmed: false,
      doctor: appt.doctor,
      color: colorFromDoctorId(appt.doctor),
      urgent: !!appt.urgent,
      status: appt.status || "scheduled",
      overbooked: false,
      reminderStatus: "idle",
      reminderWindow: appt.reminderWindow || "2h",
      reminderText: appt.reminderText || "",
    };
    const startDatePreview = getAppointmentDate(base.day, base.start, options.weekStart);
    const draftWeek = getSundayOfWeek(startDatePreview);
    const weekItems = items.filter((item) => !item._weekStart || item._weekStart === draftWeek);
    const conflicts = findConflicts(weekItems, base);
    const nearestStart = findNearestAvailableStart(weekItems, base);
    try {
      const startDate = getAppointmentDate(base.day, base.start, options.weekStart);
      if (startDate.getTime() < Date.now()) {
        return {
          ok: false,
          code: 'PAST_SLOT',
          message: 'لا يمكن حجز موعد في وقت مضى.',
        };
      }
      let patient;
      if (appt.patientId) {
        patient = patients.find((p) => p.id === appt.patientId);
      }
      if (!patient) {
        patient = patients.find((p) => p.name === appt.patient);
      }
      if (!patient) {
        patient = await addPatient({
          name: appt.patient,
          phone: appt.patientPhone || `AUTO-${appt.patient.trim()}`,
          quickRegistration: true,
        });
      }
      const created = await api.createAppointment({
        patientId: patient.id,
        doctorId: base.doctor,
        serviceId: selectedService.id,
        serviceIds: appt.serviceIds?.length ? appt.serviceIds : [selectedService.id],
        startTime: startDate.toISOString(),
        allowOverbook: !!options.allowOverride,
        notes: base.reason,
        discount: Number(appt.discount || 0) || undefined,
        manualPriceOverride: Number(appt.treatmentPrice || 0) > 0 ? Number(appt.treatmentPrice) : undefined,
        consentObtained: !!appt.consentObtained,
      });
      const next = mapApiAppointment(created, procedures);
      setItems((arr) => [...arr, next]);
      showToast("تم إنشاء الحجز بنجاح");
      return { ok: true, appointment: next, conflicts, suggestedStart: nearestStart };
    } catch (error) {
      const errorCode = error?.code || "CONFLICT";
      return {
        ok: false,
        code: errorCode,
        message: error.message,
        conflicts,
        suggestedStart: nearestStart,
      };
    }
  }, [addPatient, items, patients, procedures, showToast]);

  const updateAppointment = useCallback(async (id, patch) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;
    const merged = normalizeAppointment({ ...current, ...patch }, procedures);
    const ws = current._weekStart != null ? new Date(current._weekStart) : undefined;
    const startDate = getAppointmentDate(Number(merged.day), merged.start, ws);
    const service = resolveServiceForAppointment(merged, procedures);
    const patient = patients.find((p) => p.name === merged.patient);
    const updated = await api.updateAppointment(id, {
      patientId: patient?.id || current.patientId || patients[0]?.id,
      doctorId: merged.doctor,
      serviceId: service.id,
      serviceIds: merged.serviceIds?.length ? merged.serviceIds : [service.id],
      startTime: startDate.toISOString(),
      notes: merged.reason,
      overbooked: merged.overbooked,
      discount: Number(merged.discount || 0) || undefined,
      manualPriceOverride: Number(merged.treatmentPrice || 0) > 0 ? Number(merged.treatmentPrice) : undefined,
      consentObtained: !!merged.consentObtained,
      treatmentDetails: merged.treatmentDetails || undefined,
      doctorRemarks: merged.doctorRemarks || undefined,
      specialConditions: merged.specialConditions || undefined,
    });
    setItems((arr) =>
      arr.map((item) => {
        if (item.id !== id) return item;
        const mapped = mapApiAppointment(updated, procedures);
        const prev = typeof item.patient === "string" ? item.patient.trim() : "";
        const bad =
          !mapped.patient ||
          mapped.patient === "—" ||
          String(mapped.patient).trim() === "";
        if (bad && prev && prev !== "—") return { ...mapped, patient: prev };
        return mapped;
      })
    );
  }, [items, patients, procedures]);

  const setAppointmentStatus = useCallback(async (id, status) => {
    if (pendingStatusIds.includes(id)) {
      return { ok: false, message: "الطلب قيد التنفيذ" };
    }
    setPendingStatusIds((arr) => [...arr, id]);
    try {
      const updated = await api.updateAppointmentStatus(id, { status });
      setItems((arr) =>
        arr.map((a) => {
          if (a.id !== id) return a;
          const mapped = mapApiAppointment(updated, procedures);
          const prev =
            typeof a.patient === "string" ? a.patient.trim() : "";
          const bad =
            !mapped.patient ||
            mapped.patient === "—" ||
            String(mapped.patient).trim() === "";
          if (bad && prev && prev !== "—") {
            return { ...mapped, patient: prev };
          }
          return mapped;
        })
      );
      if (status === "arrived") {
        showToast("تم تسجيل الوصول");
      } else if (status === "in_consultation") {
        showToast("تم بدء المعاينة");
      } else if (status === "completed") {
        await refreshInvoices();
        showToast("تم إنهاء المعاينة وإنشاء فاتورة غير مدفوعة");
      } else if (status === "paid") {
        await refreshInvoices();
        showToast("تم تسجيل الدفع");
      }
      return { ok: true, appointment: updated };
    } catch (error) {
      showToast(error?.message || "تعذر تحديث حالة الموعد");
      return { ok: false, message: error?.message || "تعذر تحديث حالة الموعد" };
    } finally {
      setPendingStatusIds((arr) => arr.filter((x) => x !== id));
    }
  }, [pendingStatusIds, procedures, refreshInvoices, showToast]);

  const confirmDoctorSession = useCallback(async (id, payload) => {
    try {
      const transitioned = await api.finalizeAppointmentSession(id, {
        serviceIds: payload.serviceIds?.length ? payload.serviceIds : undefined,
        manualPriceOverride: Number(payload.treatmentPrice) || undefined,
        doctorRemarks: payload.doctorRemarks?.trim() || undefined,
        treatmentDetails:
          payload.treatmentDetails?.trim() ||
          `${payload.treatmentName || ""} · ${payload.treatmentPrice || ""} ل.س`.trim() ||
          undefined,
        markCompleted: true,
      });
      setItems((arr) =>
        arr.map((a) =>
          a.id === id
            ? normalizeAppointment(
                {
                  ...mapApiAppointment(transitioned, procedures),
                  treatmentName: payload.treatmentName || a.treatmentName || a.visitType || a.reason,
                  treatmentPrice: Number(payload.treatmentPrice) || a.treatmentPrice || 0,
                  priceConfirmed: true,
                },
                procedures
              )
            : a
        )
      );
      await refreshInvoices();
      showToast("تم اعتماد العلاج والسعر وتحويل الحالة للاستقبال");
    } catch (error) {
      showToast(error?.message || "تعذر اعتماد الجلسة");
    }
  }, [procedures, refreshInvoices, showToast]);

  const advanceAppointment = useCallback((id) => {
    const appt = items.find((item) => item.id === id);
    if (!appt) return;
    const flow = {
      scheduled: "arrived",
      confirmed: "arrived",
      arrived: "in_consultation",
      in_consultation: "completed",
      completed: "paid",
    };
    const next = flow[appt.status];
    if (!next) return;
    setAppointmentStatus(id, next);
  }, [items, setAppointmentStatus]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setItems((arr) => arr.map((appt) => normalizeAppointment(appt, procedures)));
    });
    return () => window.cancelAnimationFrame(raf);
  }, [procedures]);

  const getConflictsForDraft = useCallback((draft, ignoreId = null, opts = {}) => {
    const calendarWeekStart = opts.calendarWeekStart;
    const startDate = getAppointmentDate(Number(draft.day), Number(draft.start), calendarWeekStart);
    const draftWeek = getSundayOfWeek(startDate);
    const candidate = {
      ...draft,
      day: Number(draft.day),
      start: Number(draft.start),
      duration: resolveDuration(draft, procedures),
    };
    const thisWeekItems = items.filter(
      (item) => !item._weekStart || item._weekStart === draftWeek,
    );
    const conflicts = findConflicts(thisWeekItems, candidate, ignoreId);
    return {
      conflicts,
      suggestedStart: findNearestAvailableStart(thisWeekItems, candidate),
      duration: candidate.duration,
    };
  }, [items, procedures]);

  const setReminderStatus = useCallback((id, status, patch = {}) => {
    setItems((arr) =>
      arr.map((a) =>
        a.id === id ? normalizeAppointment({ ...a, reminderStatus: status, ...patch }, procedures) : a
      )
    );
  }, [procedures]);

  const bulkUpdateStatus = useCallback(async (ids, status) => {
    await Promise.all(ids.map((id) => setAppointmentStatus(id, status)));
  }, [setAppointmentStatus]);

  const deleteAppointment = useCallback(async (id) => {
    try {
      await api.deleteAppointment(id);
      setItems((arr) => arr.filter((a) => a.id !== id));
      showToast("تم حذف الموعد");
    } catch (error) {
      showToast(error?.message || "تعذر حذف الموعد");
    }
  }, [showToast]);

  const createNextSession = useCallback(async (id, payload = {}) => {
    try {
      const created = await api.createNextSession(id, payload);
      const next = (created || []).map((row) => mapApiAppointment(row, procedures));
      if (next.length) {
        setItems((arr) => [...arr, ...next]);
      }
      showToast("تم إنشاء الجلسة القادمة");
      return { ok: true, appointments: next };
    } catch (error) {
      showToast(error?.message || "تعذر إنشاء الجلسة القادمة");
      return { ok: false, message: error?.message || "تعذر إنشاء الجلسة القادمة" };
    }
  }, [procedures, showToast]);

  const addAppointmentMedia = useCallback(async (id, payload) => {
    try {
      const media = await api.addAppointmentMedia(id, payload);
      setItems((arr) =>
        arr.map((item) =>
          item.id === id
            ? normalizeAppointment(
                {
                  ...item,
                  media: [...(item.media || []), media],
                },
                procedures
              )
            : item
        )
      );
      showToast("تمت إضافة الصورة");
      return { ok: true, media };
    } catch (error) {
      showToast(error?.message || "تعذر إضافة الصورة");
      return { ok: false, message: error?.message || "تعذر إضافة الصورة" };
    }
  }, [procedures, showToast]);

  const value = useMemo(
    () => ({
      items,
      refreshAppointments,
      addAppointment,
      updateAppointment,
      setAppointmentStatus,
      confirmDoctorSession,
      advanceAppointment,
      getConflictsForDraft,
      setReminderStatus,
      bulkUpdateStatus,
      deleteAppointment,
      createNextSession,
      addAppointmentMedia,
      pendingStatusIds,
      noShowDelayMinutes,
      toast,
      showToast,
    }),
    [
      items,
      refreshAppointments,
      addAppointment,
      updateAppointment,
      setAppointmentStatus,
      confirmDoctorSession,
      advanceAppointment,
      getConflictsForDraft,
      setReminderStatus,
      bulkUpdateStatus,
      deleteAppointment,
      createNextSession,
      addAppointmentMedia,
      pendingStatusIds,
      noShowDelayMinutes,
      toast,
      showToast,
    ]
  );

  return <AppointmentsContext.Provider value={value}>{children}</AppointmentsContext.Provider>;
}

export function useAppointments() {
  const ctx = useContext(AppointmentsContext);
  if (!ctx) throw new Error("useAppointments must be used within AppointmentsProvider");
  return ctx;
}
