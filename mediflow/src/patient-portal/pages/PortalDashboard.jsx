import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDaysIcon,
  BellIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  ExclamationCircleIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckSolid } from "@heroicons/react/24/solid";
import { usePatientPortalAuth } from "../context/PatientPortalAuthContext.jsx";
import { usePushNotifications } from "../hooks/usePushNotifications.js";

// ─── Mock data (replace with real API calls) ─────────────────────────────

const UPCOMING = [
  {
    id: "a1",
    service: "هيدرافيشال",
    doctor: "د. سارة الأحمد",
    status: "pending",
    statusLabel: "قيد المراجعة",
    when: "الأحد 11 مايو",
    time: "10:00 ص",
    color: "#0e7490",
  },
  {
    id: "a2",
    service: "متابعة ليزر",
    doctor: "د. خالد المنصور",
    status: "confirmed",
    statusLabel: "مؤكد",
    when: "الثلاثاء 13 مايو",
    time: "2:30 م",
    color: "#059669",
  },
];

const HISTORY = [
  { id: "h1", service: "تنظيف بشرة",     date: "2 أبريل 2026",  status: "completed", statusLabel: "مكتمل"         },
  { id: "h2", service: "استشارة تجميل",  date: "18 مارس 2026",  status: "cancelled", statusLabel: "ملغى"           },
  { id: "h3", service: "علاج بالليزر",   date: "5 مارس 2026",   status: "completed", statusLabel: "مكتمل"         },
];

// ─── Status helpers ───────────────────────────────────────────────────────

const STATUS_STYLES = {
  pending:   { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-100"  },
  confirmed: { bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-100"},
  completed: { bg: "bg-slate-50",   text: "text-slate-600",  border: "border-slate-100"  },
  cancelled: { bg: "bg-red-50",     text: "text-red-600",    border: "border-red-100"    },
};

// ─── Upcoming appointment card ────────────────────────────────────────────

function UpcomingCard({ appt, index }) {
  const s = STATUS_STYLES[appt.status] || STATUS_STYLES.pending;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden"
    >
      {/* Color bar */}
      <div className="h-1" style={{ backgroundColor: appt.color }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-[15px] leading-tight">{appt.service}</p>
            <p className="text-sm text-slate-500 mt-0.5">{appt.doctor}</p>
          </div>
          <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
            {appt.statusLabel}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-1.5">
            <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
            <span>{appt.when}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4 text-slate-400" />
            <span>{appt.time}</span>
          </div>
        </div>

        {appt.status === "pending" && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
            <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
            طلبك قيد المراجعة من فريق الاستقبال. سيُبلَّغ بالتأكيد قريباً.
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Push notifications block ─────────────────────────────────────────────

function NotificationsBlock() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, sendTestNotification } =
    usePushNotifications();

  if (!isSupported) return null;

  if (isSubscribed) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
        <CheckSolid className="w-5 h-5 text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800">إشعارات المواعيد مفعّلة</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">ستصلك تذكيرات تلقائية قبل كل موعد</p>
        </div>
        <button
          onClick={sendTestNotification}
          className="shrink-0 text-[11px] font-bold text-emerald-700 underline hover:no-underline"
        >
          تجربة
        </button>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
        <BellIcon className="w-5 h-5 text-slate-400 shrink-0" />
        <p className="text-sm text-slate-500">
          الإشعارات محجوبة. افتح إعدادات المتصفح لتفعيلها.
        </p>
      </div>
    );
  }

  return (
    <motion.button
      onClick={subscribe}
      disabled={isLoading}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-3 bg-gradient-to-l from-[#ecfeff] to-[#f0fdfa] border border-teal-100 rounded-2xl px-4 py-3.5 text-right transition-all hover:shadow-sm active:scale-[0.99] disabled:opacity-60"
    >
      <div className="w-10 h-10 rounded-xl bg-[#0e7490] flex items-center justify-center shrink-0">
        <BellIcon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-slate-900 leading-tight">
          {isLoading ? "جارٍ التفعيل…" : "فعّل تذكيرات المواعيد"}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">إشعارات فورية عند تأكيد أو تغيير موعدك</p>
      </div>
      <ArrowRightIcon className="w-4 h-4 text-[#0e7490] shrink-0 rtl:rotate-180" />
    </motion.button>
  );
}

// ─── History item ──────────────────────────────────────────────────────────

function HistoryItem({ item }) {
  const s = STATUS_STYLES[item.status] || STATUS_STYLES.completed;
  return (
    <li className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg} shrink-0`}>
        {item.status === "completed"
          ? <CheckCircleIcon className={`w-4 h-4 ${s.text}`} />
          : <ClockIcon className={`w-4 h-4 ${s.text}`} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 leading-tight">{item.service}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{item.date}</p>
      </div>
      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
        {item.statusLabel}
      </span>
    </li>
  );
}

// ─── Quick action card ────────────────────────────────────────────────────

function QuickAction({ to, icon: Icon, iconColor, label, description, highlight }) {
  return (
    <Link
      to={to}
      className={`rounded-2xl border p-4 flex flex-col gap-2 transition-all active:scale-[0.97] ${
        highlight
          ? "bg-gradient-to-br from-[#0e7490] to-[#0891b2] border-transparent text-white shadow-lg shadow-teal-900/15"
          : "bg-white border-slate-100 shadow-sm hover:border-teal-100 hover:shadow-md"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        highlight ? "bg-white/20" : "bg-slate-50"
      }`}>
        <Icon className={`w-5 h-5 ${highlight ? "text-white" : iconColor}`} />
      </div>
      <div>
        <p className={`font-bold text-[13px] leading-tight ${highlight ? "text-white" : "text-slate-900"}`}>
          {label}
        </p>
        <p className={`text-[11px] mt-0.5 leading-snug ${highlight ? "text-white/80" : "text-slate-500"}`}>
          {description}
        </p>
      </div>
    </Link>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────

export default function PortalDashboard() {
  const { isAuthenticated, session } = usePatientPortalAuth();
  if (!isAuthenticated) return <Navigate to="/portal/login" replace />;

  const initials = (session?.name || "م").charAt(0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── Greeting hero ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0e7490] to-[#0891b2] flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-[11px] text-slate-500 font-medium">مرحباً بك،</p>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">
            {session?.name}
          </h1>
        </div>
        <Link
          to="/portal/notifications"
          className="ms-auto w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-[#0e7490] hover:border-teal-100 transition-colors relative"
        >
          <BellIcon className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#0e7490]" />
        </Link>
      </motion.div>

      {/* ── Push notification prompt ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <NotificationsBlock />
      </motion.div>

      {/* ── Upcoming appointments ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-slate-900">المواعيد القادمة</h2>
          <Link to="/portal/request" className="text-[12px] font-bold text-[#0e7490] flex items-center gap-1">
            طلب جديد
            <ArrowRightIcon className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>

        {UPCOMING.length > 0 ? (
          <div className="space-y-3">
            {UPCOMING.map((appt, i) => (
              <UpcomingCard key={appt.id} appt={appt} index={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-8 text-center">
            <CalendarDaysIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">لا مواعيد قادمة</p>
            <p className="text-sm text-slate-500 mt-1">احجز موعدك الأول الآن</p>
            <Link
              to="/portal/request"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0e7490] text-white font-bold text-sm shadow-sm"
            >
              <CalendarDaysIcon className="w-4 h-4" />
              طلب موعد
            </Link>
          </div>
        )}
      </section>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[15px] font-bold text-slate-900 mb-3">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickAction
            to="/portal/request"
            icon={CalendarDaysIcon}
            iconColor="text-[#0e7490]"
            label="طلب موعد"
            description="نموذج طلب سريع"
            highlight
          />
          <QuickAction
            to="/portal/notifications"
            icon={BellIcon}
            iconColor="text-amber-500"
            label="الإشعارات"
            description="تأكيدات وتذكيرات"
          />
          <QuickAction
            to="/portal/services"
            icon={SparklesIcon}
            iconColor="text-violet-500"
            label="خدماتنا"
            description="تصفح الخدمات"
          />
          <QuickAction
            to="/portal/doctors"
            icon={PhoneIcon}
            iconColor="text-emerald-500"
            label="أطباؤنا"
            description="استشر الطبيب المناسب"
          />
          <QuickAction
            to="/portal/offers"
            icon={DocumentTextIcon}
            iconColor="text-orange-500"
            label="العروض"
            description="عروض وخصومات"
          />
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 flex flex-col gap-2 opacity-75">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="font-bold text-[13px] text-slate-600 leading-tight">الفواتير</p>
              <p className="text-[11px] text-slate-400 mt-0.5">قريباً</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Visit history ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-slate-900">سجل الزيارات</h2>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-2">
          <ul>
            {HISTORY.map((item) => (
              <HistoryItem key={item.id} item={item} />
            ))}
          </ul>
        </div>
      </section>

      {/* ── Account info ────────────────────────────────────────────────── */}
      <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-slate-900">{session?.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums" dir="ltr">
              {session?.phone}
            </p>
          </div>
          <button
            className="text-[12px] font-semibold text-slate-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-xl hover:bg-red-50"
            onClick={() => {}}
          >
            تعديل
          </button>
        </div>
      </section>

    </div>
  );
}
