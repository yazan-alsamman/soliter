// Shared Arabic UI strings used across pages

/**
 * Arabic (Syria) + Gregorian calendar + Western digits 0–9 for all UI numbers/dates.
 */
export const LOCALE_AR_LATN = "ar-SY-u-ca-gregory-nu-latn";

export const STATUS_AR = {
  active: "نشط",
  inactive: "غير نشط",
  new: "جديد",
  draft: "غير مدفوعة",
  unpaid: "غير مدفوع",
  partial: "دفع جزئي",
  paid: "مدفوعة",
  due: "مستحقة",
  overdue: "متأخرة",
  ok: "متوفر",
  low: "منخفض",
  critical: "حرج",
  pending: "معلق",
  today: "اليوم",
  "on-shift": "متاح",
  "off-shift": "خارج الدوام",
  overload: "ضغط عالٍ",
};

/** أسماء أيام الأسبوع (مؤشر اليوم = JavaScript Date#getDay(): 0 أحد … 6 سبت) */
export const DAYS_AR = [
  { label: "الأحد", key: "sun" },
  { label: "الإثنين", key: "mon" },
  { label: "الثلاثاء", key: "tue" },
  { label: "الأربعاء", key: "wed" },
  { label: "الخميس", key: "thu" },
  { label: "الجمعة", key: "fri" },
  { label: "السبت", key: "sat" },
];

export const COMMON_AR = {
  cancel: "إلغاء",
  save: "حفظ",
  confirm: "تأكيد",
  edit: "تعديل",
  view: "عرض",
  archive: "أرشفة",
  delete: "حذف",
  search: "بحث",
  filter: "تصفية",
  export: "تصدير",
  add: "إضافة",
  loading: "جارٍ التحميل...",
  noData: "لا توجد بيانات",
  required: "مطلوب",
};

export function fmtMoney(n) {
  return `${Number(n || 0).toLocaleString(LOCALE_AR_LATN, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ل.س`;
}

export function fmtNumberAr(n, options = {}) {
  return new Intl.NumberFormat(LOCALE_AR_LATN, {
    maximumFractionDigits: 0,
    ...options,
  }).format(Number(n) || 0);
}

export function fmtPercentAr(n) {
  return `${fmtNumberAr(n)}٪`;
}

export function fmtTime(start) {
  const h = Math.floor(start);
  const m = Math.round((start - h) * 60);
  const period = h >= 12 ? "م" : "ص";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${String(m).padStart(2, "0")} ${period}`;
}

/** Short printable token from UUID (first 8 hex chars), stable for display only. */
export function compactIdSuffix(id) {
  const s = String(id || "").replace(/-/g, "").trim();
  return s.slice(0, 8).toLowerCase();
}

export function fmtPatientFileId(id) {
  const c = compactIdSuffix(id);
  return c ? `p-${c}` : "—";
}

export function fmtInvoiceId(id) {
  const c = compactIdSuffix(id);
  return c ? `inv-${c}` : "—";
}

export function fmtAppointmentRef(id) {
  const c = compactIdSuffix(id);
  return c ? `apt-${c}` : "—";
}

/** Clinic / tenant display handle — login still requires full UUID. */
export function fmtClinicRef(id) {
  const c = compactIdSuffix(id);
  return c ? `clinic-${c}` : "—";
}

export function fmtInventoryRef(id) {
  const c = compactIdSuffix(id);
  return c ? `stk-${c}` : "—";
}

/** Sunday 00:00 of the calendar week that contains `d` */
export function startOfSundayWeek(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function formatWeekRangeLabel(weekStartSunday) {
  const start = new Date(weekStartSunday);
  const end = new Date(weekStartSunday);
  end.setDate(start.getDate() + 6);
  const fmt = new Intl.DateTimeFormat(LOCALE_AR_LATN, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

/**
 * وقت بداية الموعد المحلي من عمود التقويم (0=أحد … 6=سبت) وساعة البداية (كسورية مثل 9.5).
 */
export function appointmentDateFromWeekSlot(weekStartSunday, dayColumn, startHour) {
  const base = weekStartSunday ? new Date(weekStartSunday) : startOfSundayWeek();
  base.setHours(0, 0, 0, 0);
  const target = new Date(base);
  target.setDate(base.getDate() + Number(dayColumn || 0));
  const hour = Math.floor(Number(startHour || 0));
  const minutes = Math.round((Number(startHour || 0) - hour) * 60);
  target.setHours(hour, minutes, 0, 0);
  return target;
}

/** لا يمكن حجز موعد قبل اللحظة الحالية */
export function isAppointmentSlotInPast(weekStartSunday, dayColumn, startHour, now = new Date()) {
  return appointmentDateFromWeekSlot(weekStartSunday, dayColumn, startHour).getTime() < now.getTime();
}

/** Invoice-style short date (Latin digits). */
export function fmtDateInvoice(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE_AR_LATN, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Date + time for logs / admin (Latin digits). */
export function fmtDateTimeLatn(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE_AR_LATN, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** YYYY-MM-DD لعمود اليوم 0..6 (أحد…سبت) ضمن أسبوع يبدأ يوم الأحد */
export function dateStringForWorkweekDay(dayColumn, weekStartSunday) {
  const ws = weekStartSunday ? new Date(weekStartSunday) : startOfSundayWeek();
  ws.setHours(0, 0, 0, 0);
  const target = new Date(ws);
  target.setDate(ws.getDate() + Number(dayColumn || 0));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

/** Start of local calendar day */
export function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Compare two dates (or ISO strings) on local calendar day */
export function isSameLocalCalendarDay(isoOrDateA, isoOrDateB) {
  if (!isoOrDateA || !isoOrDateB) return false;
  const a = new Date(isoOrDateA);
  const b = new Date(isoOrDateB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
