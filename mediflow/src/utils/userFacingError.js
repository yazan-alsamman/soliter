/**
 * Maps API / network error text to Arabic for clinic UI.
 * Messages that already contain Arabic are returned unchanged.
 */

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/;

/** @param {string} s */
export function hasArabicScript(s) {
  return typeof s === "string" && ARABIC_RE.test(s);
}

/** Appointment status tokens in backend English → Arabic labels */
const STATUS_LABEL_AR = {
  scheduled: "مجدول",
  confirmed: "مؤكد",
  arrived: "وصل",
  in_consultation: "في المعاينة",
  completed: "مكتمل",
  paid: "مدفوع",
  no_show: "لم يحضر",
  cancelled: "ملغى",
};

/** @param {string} raw */
function translateStatusToken(raw) {
  const k = String(raw || "").trim();
  return STATUS_LABEL_AR[k] || k;
}

/** Exact English (or normalized) server messages → Arabic */
const EXACT = {
  "request failed": "تعذّر تنفيذ الطلب.",
  "invalid credentials": "بيانات الدخول غير صحيحة.",
  "session is no longer valid": "انتهت صلاحية الجلسة.",
  "appointment not found": "لم يُعثر على الموعد.",
  "appointment not found after create": "تعذّر إنشاء الموعد — لم يُعثر على السجل.",
  "access denied": "تم رفض الوصول.",
  "service not found": "لم يُعثر على الإجراء/الخدمة.",
  "patient not found": "لم يُعثر على المريض.",
  "doctor not found": "لم يُعثر على الطبيب.",
  "doctor not found in this clinic": "لم يُعثر على الطبيب في هذه العيادة.",
  "user not found": "لم يُعثر على المستخدم.",
  "invoice not found": "لم يُعثر على الفاتورة.",
  "invoice not found after payment": "لم يُعثر على الفاتورة بعد تسجيل الدفع.",
  "payment not found": "لم يُعثر على الدفعة.",
  "payment not found or already voided": "لم يُعثر على الدفعة أو أُلغيت مسبقاً.",
  "clinic not found": "لم يُعثر على العيادة.",
  "invalid tenant id": "معرّف العيادة غير صالح.",
  "no doctor schedule configured for selected date": "لا يوجد جدول عمل للطبيب في التاريخ المحدد.",
  "no doctor schedule configured for this day": "لا يوجد جدول عمل للطبيب في هذا اليوم.",
  "appointment conflicts with an existing booking": "الموعد يتعارض مع حجز قائم.",
  "appointment is outside doctor working hours": "الموقع خارج ساعات عمل الطبيب.",
  "appointment overlaps doctor break time": "الموعد يتقاطع مع وقت استراحة الطبيب.",
  "invalid date value": "قيمة التاريخ غير صالحة.",
  "date must be in yyyy-mm-dd format": "يجب أن يكون التاريخ بصيغة YYYY-MM-DD.",
  "a patient with this phone number already exists": "يوجد مريض مسجّل بنفس رقم الهاتف.",
  "imageurl must use https:// or http://": "يجب أن يبدأ رابط الصورة بـ https:// أو http://",
  "current password is incorrect": "كلمة المرور الحالية غير صحيحة.",
  "doctor can only modify their own appointments": "لا يمكن للطبيب تعديل مواعيد أطباء آخرين.",
  "cannot modify appointments for another doctor": "لا يمكن تعديل مواعيد طبيب آخر.",
  "cannot change status for another doctor": "لا يمكن تغيير حالة موعد لطبيب آخر.",
  "cannot request reception help for another doctor appointment": "لا يمكن طلب الاستقبال لموعد يخص طبيباً آخر.",
  "payment amount must be greater than zero": "يجب أن يكون مبلغ الدفع أكبر من صفر.",
  "paid amount cannot exceed the remaining invoice balance": "لا يمكن أن يتجاوز المدفوع الرصيد المتبقي للفاتورة.",
  "invoice is already fully paid": "الفاتورة مدفوعة بالكامل.",
  "invoice payment state changed concurrently — please refresh and retry":
    "تغيّرت حالة دفع الفاتورة أثناء العملية — حدّث الصفحة وأعد المحاولة.",
  "tenant id is required for this account email": "معرّف العيادة مطلوب لهذا البريد الإلكتروني.",
  "too many failed login attempts. try again later.": "محاولات دخول فاشلة كثيرة — حاول لاحقاً.",
  "you do not have permission for this action": "ليست لديك صلاحية لتنفيذ هذا الإجراء.",
  "tool not allowed for this role": "هذه الأداة غير مسموحة لدورك.",
  "invalid tool plan": "خطة الأدوات غير صالحة.",
  too_many_arg_keys: "عدد مفاتيح وسائط الأداة كبير جداً.",
  args_too_deep: "بيانات وسائط الأداة معقّدة أكثر من المسموح.",
  "gemini_api_key is not set": "مفتاح خدمة الذكاء الاصطناعي غير مُعدّ على الخادم.",
  "invalid json from gemini": "رد غير صالح من خدمة الذكاء الاصطناعي.",
  "gemini response did not match expected shape": "لم يطابق رد الذكاء الاصطناعي الشكل المتوقع.",
  "ai service not configured — set gemini_api_key in .env":
    "خدمة الذكاء الاصطناعي غير مُعدّة — اضبط GEMINI_API_KEY في إعدادات الخادم.",
  "ai service unavailable": "خدمة الذكاء الاصطناعي غير متاحة مؤقتاً.",
  "database is unavailable. please try again shortly.": "قاعدة البيانات غير متاحة مؤقتاً — حاول بعد قليل.",
  "internal server error": "خطأ داخلي في الخادم.",
  "this admin email is already used by another clinic.": "هذا البريد مستخدم كمسؤول لعيادة أخرى.",
  "at least one field required": "يجب إرسال حقل واحد على الأقل.",
  "validation failed": "بيانات غير صالحة — راجع الحقول وأعد المحاولة.",
  "login failed": "تعذّر تسجيل الدخول.",
  "could not sign in": "تعذّر تسجيل الدخول.",
};

/** Error codes (Nest / app) → Arabic — applied after message-specific maps */
const BY_CODE = {
  VALIDATION_ERROR: "بيانات الطلب غير صالحة — راجع الحقول وأعد المحاولة.",
  DOCTOR_SCHEDULE_NOT_FOUND: "لا يوجد جدول عمل للطبيب في هذا التاريخ.",
  APPOINTMENT_CONFLICT: "الموعد يتعارض مع حجز قائم.",
  OUTSIDE_DOCTOR_HOURS: "الموعد خارج ساعات عمل الطبيب.",
  DOCTOR_BREAK_CONFLICT: "الموعد يتقاطع مع وقت استراحة الطبيب.",
  APPOINTMENT_IN_PAST: "لا يمكن جدولة موعد في وقت مضى.",
  APPOINTMENT_NOT_EDITABLE: "لا يمكن تعديل الجدولة أو التسعير لهذا الموعد في حالته الحالية.",
  APPOINTMENT_NOT_DELETABLE: "لا يمكن حذف الموعد في حالته الحالية.",
  MAX_MEDIA_REACHED: "يُسمح بحد أقصى 3 صور لكل نوع مرفق.",
  INVALID_DATETIME: "تاريخ أو وقت غير صالح.",
  INVALID_DATE: "تاريخ غير صالح.",
  INVALID_SCHEDULE_TIME: "صيغة وقت الجدول غير صالحة.",
  INVALID_APPOINTMENT_TRANSITION: "انتقال غير مسموح بين حالات الموعد.",
  RECEPTION_REQUEST_NOT_APPLICABLE: "لا يوجد إجراء مطلوب من الاستقبال في هذه الحالة.",
  DOCTOR_SCOPE_VIOLATION: "لا يمكن للطبيب تعديل مواعيد غير مواعيده.",
  AI_NOT_CONFIGURED: "خدمة الذكاء الاصطناعي غير مُعدّة على الخادم.",
  AI_QUOTA_EXCEEDED: "تجاوزت حصة استخدام الذكاء الاصطناعي مؤقتاً — حاول بعد دقيقة.",
  AI_UPSTREAM_ERROR: "خدمة الذكاء الاصطناعي غير متاحة مؤقتاً — حاول مجدداً.",
  AI_STREAM_EMPTY: "انقطع تدفق الرد من الخادم — حاول بعد قليل.",
  STREAM_ERROR: "تعذّر إكمال الرد. حاول مجدداً.",
};

/**
 * @param {number} [status]
 * @returns {string | null}
 */
function messageForHttpStatus(status) {
  if (status == null || Number.isNaN(Number(status))) return null;
  const s = Number(status);
  if (s === 400) return "طلب غير صالح.";
  if (s === 401) return "انتهت الجلسة أو بيانات الدخول غير صالحة. سجّل الدخول مجدداً.";
  if (s === 403) return "لا تملك صلاحية لتنفيذ هذا الطلب.";
  if (s === 404) return "المورد غير موجود.";
  if (s === 409) return "تعارض مع بيانات موجودة — راجع وأعد المحاولة.";
  if (s === 422) return "بيانات غير صالحة — راجع الحقول.";
  if (s === 429) return "طلبات كثيرة مؤقتاً — حاول بعد قليل.";
  if (s === 502 || s === 503 || s === 504) return "الخادم غير متاح مؤقتاً. حاول لاحقاً.";
  if (s >= 500) return "حدث خطأ في الخادم. حاول لاحقاً.";
  return `تعذّر تنفيذ الطلب (رمز ${s}). حاول مجدداً.`;
}

/**
 * @param {string} raw
 * @param {{ status?: number, code?: string }} [opts]
 */
export function translateUserFacingMessage(raw, opts = {}) {
  const { status, code } = opts;
  let s = typeof raw === "string" ? raw.trim() : "";
  if (Array.isArray(raw)) {
    s = raw.map((x) => String(x ?? "").trim()).filter(Boolean).join("، ");
  }

  if (!s) {
    return messageForHttpStatus(status) || "حدث خطأ. حاول مجدداً.";
  }

  if (hasArabicScript(s)) return s;

  const c = code != null ? String(code).trim() : "";

  const reqFail = /^request failed\s*\((\d+)\)\s*$/i.exec(s);
  if (reqFail) {
    const st = Number(reqFail[1]);
    return messageForHttpStatus(st) || `تعذّر تنفيذ الطلب (رمز ${st}).`;
  }

  const mEdit = /^Cannot modify scheduling or pricing of an appointment in '([^']+)' status$/i.exec(s);
  if (mEdit) {
    return `لا يمكن تعديل الجدولة أو التسعير للموعد في حالة «${translateStatusToken(mEdit[1])}».`;
  }

  const mDel = /^Cannot delete an appointment in '([^']+)' status$/i.exec(s);
  if (mDel) {
    return `لا يمكن حذف الموعد في حالة «${translateStatusToken(mDel[1])}».`;
  }

  const mCancel = /^Cannot cancel an appointment that is already '([^']+)'\. Use a refund flow instead\.$/i.exec(s);
  if (mCancel) {
    return `لا يمكن إلغاء موعد في حالة «${translateStatusToken(
      mCancel[1],
    )}». استخدم مسار الاسترجاع بدلاً من ذلك.`;
  }

  const mTrans = /^Invalid appointment transition:\s*(\S+)\s*→\s*(\S+)$/i.exec(s);
  if (mTrans) {
    return `انتقال غير مسموح بين «${translateStatusToken(mTrans[1])}» و«${translateStatusToken(mTrans[2])}».`;
  }

  const mMedia = /^Only up to 3 (\w+) images are allowed$/i.exec(s);
  if (mMedia) {
    return `يُسمح بحد أقصى 3 صور لنوع «${mMedia[1]}».`;
  }

  const mIso = /^(\w+) must be a valid ISO datetime$/i.exec(s);
  if (mIso) {
    return `يجب أن يكون الحقل «${mIso[1]}» تاريخاً ووقتاً بصيغة ISO صالحة.`;
  }

  if (/^Invalid schedule time format:/i.test(s)) {
    return "صيغة وقت الجدول غير صالحة.";
  }

  const lower = s.toLowerCase();
  if (EXACT[lower]) return EXACT[lower];

  const patterns = [
    [/network error|failed to fetch|load failed|networkerror/i, "تعذّر الاتصال بالخادم. تحقق من الشبكة وحاول مجدداً."],
    [/gemini_api_key|gemini api key|set gemini|ai service not configured|not configured.*api/i, "خدمة الذكاء الاصطناعي غير مُعدّة على الخادم."],
    [/quota|rate\s*limit|too many requests/i, "تجاوزت حصة الاستخدام مؤقتاً — حاول بعد دقيقة."],
    [/unauthorized/i, "انتهت الجلسة أو بيانات الدخول غير صالحة. سجّل الدخول مجدداً."],
    [/forbidden/i, "لا تملك صلاحية لتنفيذ هذا الطلب."],
    [/not found/i, "المورد غير موجود."],
    [/timeout|timed out/i, "انتهت مهلة الاتصال. حاول مجدداً."],
    [/no elements in sequence|stream empty|ai_stream_empty/i, "انقطع تدفق الرد — حاول بعد قليل."],
    [/copilot stream failed|stream failed/i, "تعذّر إكمال الرد. حاول مجدداً."],
    [/bad gateway|bad request|internal server error|service unavailable/i, "الخادم واجه مشكلة مؤقتاً. حاول لاحقاً."],
    [/unexpected token|invalid json/i, "رد غير صالح من الخادم. حاول إعادة الصياغة."],
    [/error in assistant|copilot failed/i, "تعذّر المساعد في إكمال الطلب. حاول مجدداً."],
  ];
  for (const [re, ar] of patterns) {
    if (re.test(lower)) return ar;
  }

  if (c && BY_CODE[c]) return BY_CODE[c];

  if (c === "VALIDATION_ERROR" || /^\s*\w+\s*:/.test(s)) {
    return "بيانات الطلب غير صالحة — راجع الحقول وأعد المحاولة.";
  }

  const byStatus = messageForHttpStatus(status);
  if (byStatus && (/^request failed/i.test(s) || s.length < 3)) return byStatus;

  return "تعذّر إتمام الطلب. إن استمرت المشكلة، راجع مسؤول النظام.";
}

/**
 * @param {unknown} err
 */
export function formatUserFacingError(err) {
  if (err == null) return "حدث خطأ غير متوقع.";
  const o = typeof err === "object" && err !== null ? err : {};
  const status = "status" in o ? /** @type {{ status?: number }} */ (o).status : undefined;
  const code = "code" in o ? /** @type {{ code?: string }} */ (o).code : undefined;
  const message = "message" in o && o.message != null ? String(o.message) : typeof err === "string" ? err : "";
  return translateUserFacingMessage(message, { status, code });
}
