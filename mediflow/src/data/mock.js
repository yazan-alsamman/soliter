export const PATIENTS = [
  {
    id: "PT-8821",
    name: "سارة العتيبي",
    sex: "أنثى",
    age: 42,
    bloodType: "A+",
    status: "active",
    lastVisit: "15 نيسان 2026",
    nextAppointment: "05 أيار 2026",
    allergies: ["البنسلين"],
    meds: [{ name: "ليزينوبريل 10 ملغم", note: "حبة يومياً — ضغط الدم" }],
    vitals: { bp: "118/76", hr: 72, spo2: 99 },
  },
  {
    id: "PT-9012",
    name: "خالد المحمدي",
    sex: "ذكر",
    age: 35,
    bloodType: "O+",
    status: "new",
    lastVisit: "أمس",
    nextAppointment: "—",
    allergies: [],
    meds: [],
    vitals: { bp: "122/80", hr: 76, spo2: 98 },
  },
  {
    id: "PT-7742",
    name: "نورة القحطاني",
    sex: "أنثى",
    age: 29,
    bloodType: "B+",
    status: "inactive",
    lastVisit: "10 شباط 2026",
    nextAppointment: "—",
    allergies: ["المأكولات البحرية"],
    meds: [],
    vitals: { bp: "115/74", hr: 68, spo2: 99 },
  },
  {
    id: "PT-1029",
    name: "عبدالله الزهراني",
    sex: "ذكر",
    age: 61,
    bloodType: "AB-",
    status: "active",
    lastVisit: "23 نيسان 2026",
    nextAppointment: "اليوم 2:30 م",
    allergies: ["اللاتكس"],
    meds: [
      { name: "أتورفاستاتين 20 ملغم", note: "حبة ليلاً — اضطراب الدهون" },
      { name: "ميتفورمين 500 ملغم", note: "مرتين يومياً — السكري النوع 2" },
    ],
    vitals: { bp: "132/84", hr: 80, spo2: 96 },
  },
  {
    id: "PT-4471",
    name: "ليلى الغامدي",
    sex: "أنثى",
    age: 27,
    bloodType: "A-",
    status: "active",
    lastVisit: "21 نيسان 2026",
    nextAppointment: "غداً 10:00 ص",
    allergies: [],
    meds: [],
    vitals: { bp: "110/70", hr: 70, spo2: 99 },
  },
  {
    id: "PT-3320",
    name: "فيصل الحربي",
    sex: "ذكر",
    age: 53,
    bloodType: "O-",
    status: "active",
    lastVisit: "24 نيسان 2026",
    nextAppointment: "الخميس 9:30 ص",
    allergies: ["اليود"],
    meds: [{ name: "أملوديبين 5 ملغم", note: "حبة يومياً — ضغط الدم" }],
    vitals: { bp: "128/82", hr: 74, spo2: 98 },
  },
];

export const DOCTORS = [
  { id: "D1", name: "د. أحمد المنصور", dept: "الباطنية", color: "blue", defaultDuration: 1 },
  { id: "D2", name: "د. هدى الفهد", dept: "أمراض القلب", color: "green", defaultDuration: 1 },
  { id: "D3", name: "د. خالد السعيد", dept: "الأعصاب", color: "purple", defaultDuration: 1.5 },
  { id: "D4", name: "د. ريم العتيبي", dept: "طب الأطفال", color: "orange", defaultDuration: 0.5 },
];

export const APPOINTMENTS = [
  { id: "A1", day: 0, start: 9, duration: 1, patient: "محمد آل سعد", reason: "فحص عام", color: "blue", doctor: "D1", status: "confirmed" },
  { id: "A2", day: 1, start: 9, duration: 1, patient: "سارة العتيبي", reason: "تنظيف أسنان", color: "green", doctor: "D2", status: "arrived" },
  { id: "A3", day: 1, start: 10, duration: 1.5, patient: "ميشيل العنزي", reason: "استشارة جراحية", color: "red", doctor: "D3", urgent: true, status: "in_consultation" },
  { id: "A4", day: 2, start: 11, duration: 1, patient: "بسمة العمري", reason: "مراجعة نتائج تحاليل", color: "blue", doctor: "D1", status: "completed" },
  { id: "A5", day: 3, start: 9, duration: 1, patient: "إيمان الصبيحي", reason: "جلسة علاج طبيعي", color: "purple", doctor: "D2", status: "paid" },
  { id: "A6", day: 3, start: 13, duration: 1, patient: "ضيف الله القرني", reason: "فحص نظر", color: "green", doctor: "D4", status: "scheduled" },
  { id: "A7", day: 4, start: 14, duration: 1, patient: "جمال الحربي", reason: "متابعة", color: "blue", doctor: "D1", status: "confirmed" },
  { id: "A8", day: 0, start: 15, duration: 1, patient: "ستانلي القحطاني", reason: "أمراض القلب", color: "red", doctor: "D2", status: "confirmed", overbooked: true },
];

export const INVOICES = [
  { id: "INV-2026-0118", patient: "سارة العتيبي", date: "24 نيسان 2026", amount: 240.0, status: "paid", appointmentId: "A2", patientId: "PT-8821" },
  { id: "INV-2026-0117", patient: "خالد المحمدي", date: "24 نيسان 2026", amount: 65.0, status: "paid", patientId: "PT-9012" },
  { id: "INV-2026-0116", patient: "عبدالله الزهراني", date: "23 نيسان 2026", amount: 1280.5, status: "due", patientId: "PT-1029" },
  { id: "INV-2026-0115", patient: "ليلى الغامدي", date: "23 نيسان 2026", amount: 95.0, status: "paid", patientId: "PT-4471" },
  { id: "INV-2026-0114", patient: "فيصل الحربي", date: "22 نيسان 2026", amount: 320.0, status: "overdue", patientId: "PT-3320" },
  { id: "INV-2026-0113", patient: "نورة القحطاني", date: "21 نيسان 2026", amount: 180.0, status: "paid", patientId: "PT-7742" },
];

export const INVENTORY = [
  { id: "ITM-001", name: "قفازات جراحية مقاس M", category: "مستهلكات", stock: 1240, threshold: 300, status: "ok" },
  { id: "ITM-002", name: "ليدوكائين 2% 20 مل", category: "صيدلية", stock: 42, threshold: 50, status: "low" },
  { id: "ITM-003", name: "محاقن طبية 5 مل", category: "مستهلكات", stock: 980, threshold: 200, status: "ok" },
  { id: "ITM-004", name: "كمامات N95", category: "وقاية", stock: 28, threshold: 100, status: "critical" },
  { id: "ITM-005", name: "أموكسيسيلين 500 ملغم (علبة)", category: "صيدلية", stock: 64, threshold: 40, status: "ok" },
  { id: "ITM-006", name: "بخاخ معقم 1 لتر", category: "تعقيم", stock: 18, threshold: 25, status: "low" },
];

export const REVENUE = [
  { month: "كانون الثاني", '2025': 92, '2026': 110 },
  { month: "شباط", '2025': 88, '2026': 115 },
  { month: "آذار", '2025': 95, '2026': 122 },
  { month: "نيسان", '2025': 100, '2026': 128 },
  { month: "أيار", '2025': 105, '2026': 132 },
  { month: "حزيران", '2025': 108, '2026': 138 },
  { month: "تموز", '2025': 115, '2026': 142 },
  { month: "آب", '2025': 118, '2026': 148 },
  { month: "أيلول", '2025': 120, '2026': 152 },
  { month: "تشرين الأول", '2025': 122, '2026': 142 },
];

export const STAFF = [
  { id: "S1", name: "د. خالد السعيد", dept: "الأعصاب", current: 8, max: 10, status: "on-shift", load: 80 },
  { id: "S2", name: "د. إيلين كستيك", dept: "الباطنية", current: 3, max: 12, status: "on-shift", load: 25 },
  { id: "S3", name: "د. روبرت توان", dept: "الأشعة", current: 0, max: 8, status: "off-shift", load: 0 },
  { id: "S4", name: "د. ريم العتيبي", dept: "طب الأطفال", current: 11, max: 12, status: "overload", load: 92 },
];
