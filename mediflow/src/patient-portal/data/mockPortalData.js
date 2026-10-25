/** بيانات تجريبية لبوابة المرضى — تُستبدل لاحقاً بـ API */

export const PORTAL_SERVICES = [
  {
    id: "svc-hydra",
    name: "هيدرافيشال",
    teaser: "تنظيف عميق وترطيب فوري للبشرة",
    durationMin: 55,
    priceFrom: 175000,
    category: "skincare",
    doctorIds: ["d1", "d2"],
  },
  {
    id: "svc-botox",
    name: "بوتوكس تجميلي",
    teaser: "تنعيم خطوط التعبير تحت إشراف طبي",
    durationMin: 25,
    priceFrom: 320000,
    category: "injectables",
    doctorIds: ["d3"],
  },
  {
    id: "svc-laser",
    name: "ليزر مناطق محددة",
    teaser: "جلسات ليزر مع خطط متابعة آمنة",
    durationMin: 45,
    priceFrom: 180000,
    category: "laser",
    doctorIds: ["d1"],
  },
  {
    id: "svc-whiten",
    name: "تبييض أسنان زوم",
    teaser: "ابتسامة أفتح في جلسة واحدة عادةً",
    durationMin: 50,
    priceFrom: 280000,
    category: "dental",
    doctorIds: ["d2"],
  },
];

export const PORTAL_DOCTORS = [
  {
    id: "d1",
    name: "د. محمد درويش",
    title: "اختصاص جلدية وليزر",
    tags: ["ليزر", "هيدرافيشال"],
    bio: "خبرة واسعة في الجلدية التجميلية والليزر الطبي.",
  },
  {
    id: "d2",
    name: "د. ليلى خضور",
    title: "أسنان تجميلية",
    tags: ["تبييض", "ابتسامة"],
    bio: "تركيز على تجميل الأسنان وتجارب مريحة للمرضى.",
  },
  {
    id: "d3",
    name: "د. رامي سليمان",
    title: "حقن وتجميل غير جراحي",
    tags: ["بوتوكس", "فيلر"],
    bio: "خطط علاجية محافظة ونتائج طبيعية.",
  },
];

export const PORTAL_OFFERS = [
  {
    id: "off-1",
    title: "باقة الترحيب — هيدرافيشال + تنظيف",
    endsAt: Date.now() + 86400000 * 9,
    sessions: 2,
    price: 265000,
    was: 310000,
    terms: "للمرضى الجدد · حسب توفر المواعيد · لا يُجمع مع عروض أخرى",
  },
  {
    id: "off-2",
    title: "ليزر مناطق — جلسة ثانية بخصم",
    endsAt: Date.now() + 86400000 * 14,
    sessions: 2,
    price: 299000,
    was: 360000,
    terms: "يشترط تأكيد الطبيب · صالح لمدة 30 يوماً من أول جلسة",
  },
];

export const PORTAL_TESTIMONIALS = [
  { quote: "طلبت موعداً من البوابة وتم التأكيد خلال ساعات — تجربة مرتبة.", name: "سارة م.", city: "دمشق" },
  { quote: "الاستقبال اتصلوا لتوضيح البدائل قبل تأكيد الموعد.", name: "ليان ك.", city: "حلب" },
];
