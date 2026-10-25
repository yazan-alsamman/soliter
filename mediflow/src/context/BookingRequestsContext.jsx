/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Mock طابور طلبات الحجز (بوابة المرضى → مراجعة الاستقبال).
 * يستبدل لاحقاً بـ API حقيقي.
 */

export const BOOKING_REQUEST_STATUS = {
  pending: "pending",
  ai_reviewed: "ai_reviewed",
  approved: "approved",
  rejected: "rejected",
};

function initialRequests() {
  const now = Date.now();
  return [
    {
      id: "br-001",
      patientName: "نور الشامي",
      phone: "0993112445",
      serviceName: "هيدرافيشال",
      doctorPreference: "د. ليلى خضور",
      preferredWindow: "صباحاً · الأحد القادم",
      notes: "البشرة حساسة — تجنب التقشير القوي",
      status: BOOKING_REQUEST_STATUS.pending,
      createdAt: new Date(now - 3600000 * 5),
      aiConfidence: null,
      aiSlots: [],
    },
    {
      id: "br-002",
      patientName: "كريم الأسعد",
      phone: "0995229011",
      serviceName: "بوتوكس تجميلي",
      doctorPreference: "أي طبيب حقن",
      preferredWindow: "بعد الظهر · الثلاثاء",
      notes: "",
      status: BOOKING_REQUEST_STATUS.ai_reviewed,
      createdAt: new Date(now - 3600000 * 28),
      aiConfidence: 0.87,
      aiSlots: [
        { start: "2026-05-13T13:00:00", label: "ثلاثاء 13:00 · د. رامي · 25 د", conflict: false },
        { start: "2026-05-13T15:30:00", label: "ثلاثاء 15:30 · د. رامي · 25 د", conflict: false },
        { start: "2026-05-14T10:15:00", label: "أربعاء 10:15 · د. ليلى · 25 د", conflict: true },
      ],
      aiExplanation:
        "توافق مدة الخدمة مع استراحة الغداء؛ يُفضّل الموعد الأول لتقليل التأخير المتوقع.",
    },
    {
      id: "br-003",
      patientName: "رهف العلي",
      phone: "0998776612",
      serviceName: "تبييض أسنان زوم",
      doctorPreference: "د. محمد درويش",
      preferredWindow: "مرن",
      notes: "أول زيارة للعيادة",
      status: BOOKING_REQUEST_STATUS.pending,
      createdAt: new Date(now - 3600000 * 2),
      aiConfidence: null,
      aiSlots: [],
    },
    {
      id: "br-004",
      patientName: "طارق دير الزوري",
      phone: "0991440099",
      serviceName: "جلسة ليزر مناطق محددة",
      doctorPreference: "بدون تفضيل",
      preferredWindow: "صباح الجمعة (إن توفر)",
      notes: "عمل — يحتاج تأكيد قبل 48 ساعة",
      status: BOOKING_REQUEST_STATUS.pending,
      createdAt: new Date(now - 3600000 * 52),
      aiConfidence: null,
      aiSlots: [],
    },
  ];
}

const BookingRequestsContext = createContext(null);

export function BookingRequestsProvider({ children }) {
  const [requests, setRequests] = useState(initialRequests);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === BOOKING_REQUEST_STATUS.pending || r.status === BOOKING_REQUEST_STATUS.ai_reviewed).length,
    [requests],
  );

  const runAiSuggestion = useCallback((id) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (r.status !== BOOKING_REQUEST_STATUS.pending) return r;
        return {
          ...r,
          status: BOOKING_REQUEST_STATUS.ai_reviewed,
          aiConfidence: 0.81,
          aiSlots: [
            { start: "", label: "غداً 09:30 · أقرب فراغ · بدون تعارض", conflict: false },
            { start: "", label: "غداً 11:00 · توازن الأحمال بين الأطباء", conflict: false },
            { start: "", label: "بعد غد 14:15 · بديل إن تعذّر الأول", conflict: false },
          ],
          aiExplanation:
            "تم تقييم مدة الخدمة والاستراحات؛ المواعيد المعروضة تحترم جداول الأطباء الحالية (بيانات تجريبية).",
        };
      }),
    );
  }, []);

  const approveRequest = useCallback((id, slotLabel) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: BOOKING_REQUEST_STATUS.approved, approvedSlot: slotLabel } : r)),
    );
  }, []);

  const rejectRequest = useCallback((id, reason) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: BOOKING_REQUEST_STATUS.rejected, rejectReason: reason } : r)),
    );
  }, []);

  const value = useMemo(
    () => ({
      requests,
      pendingCount,
      runAiSuggestion,
      approveRequest,
      rejectRequest,
    }),
    [requests, pendingCount, runAiSuggestion, approveRequest, rejectRequest],
  );

  return <BookingRequestsContext.Provider value={value}>{children}</BookingRequestsContext.Provider>;
}

export function useBookingRequests() {
  const ctx = useContext(BookingRequestsContext);
  if (!ctx) throw new Error("useBookingRequests must be used within BookingRequestsProvider");
  return ctx;
}
