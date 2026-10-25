import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Squares2X2Icon,
  CalendarDaysIcon,
  UsersIcon,
  CreditCardIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { ROLES, useAuth } from "../../context/AuthContext.jsx";
import { useAppointments } from "../../context/AppointmentsContext.jsx";
import { useBilling } from "../../context/BillingContext.jsx";
import { useBookingRequests } from "../../context/BookingRequestsContext.jsx";
import mediflowLogo from "../../assets/mediflow-logo.png";

const ICONS = {
  dashboard: Squares2X2Icon,
  appointments: CalendarDaysIcon,
  schedule: CalendarDaysIcon,
  patients: UsersIcon,
  billing: CreditCardIcon,
  inventory: ArchiveBoxIcon,
  reports: ChartBarIcon,
  procedures: ClipboardDocumentListIcon,
  settings: Cog6ToothIcon,
  bookingRequests: QueueListIcon,
};

function navForRole(role) {
  if (role === ROLES.RECEPTIONIST) {
    return [
      { to: "/dashboard", label: "الرئيسية", icon: "dashboard" },
      { to: "/appointments", label: "المواعيد", icon: "appointments", badgeKey: "appointments" },
      { to: "/booking-requests", label: "طلبات الحجز", icon: "bookingRequests", badgeKey: "bookingRequests" },
      { to: "/patients", label: "المرضى", icon: "patients" },
      { to: "/billing", label: "الفوترة", icon: "billing", badgeKey: "billing" },
      { to: "/settings", label: "الإعدادات", icon: "settings" },
    ];
  }
  if (role === ROLES.DOCTOR) {
    return [
      { to: "/dashboard", label: "الرئيسية", icon: "dashboard" },
      { to: "/appointments", label: "المواعيد", icon: "schedule", badgeKey: "appointments" },
      { to: "/patients", label: "المرضى", icon: "patients" },
      { to: "/procedures", label: "إجراءاتي", icon: "procedures" },
      { to: "/settings", label: "الإعدادات", icon: "settings" },
    ];
  }
  return [
    { to: "/dashboard", label: "الرئيسية", icon: "dashboard" },
    { to: "/appointments", label: "المواعيد", icon: "appointments", badgeKey: "appointments" },
    { to: "/booking-requests", label: "طلبات الحجز", icon: "bookingRequests", badgeKey: "bookingRequests" },
    { to: "/patients", label: "المرضى", icon: "patients" },
    { to: "/billing", label: "الفوترة", icon: "billing", badgeKey: "billing" },
    { to: "/inventory", label: "المخزون", icon: "inventory" },
    { to: "/reports", label: "التقارير", icon: "reports" },
    { to: "/procedures", label: "إجراءات الأطباء", icon: "procedures" },
    { to: "/settings", label: "الإعدادات", icon: "settings" },
  ];
}

export default function Sidebar() {
  const { role, user, logout } = useAuth();
  const { items: appts } = useAppointments();
  const { invoices } = useBilling();
  const { pendingCount: bookingPending } = useBookingRequests();
  const [collapsed, setCollapsed] = useState(false);

  const items = navForRole(role);

  const badges = {
    appointments: appts.filter((a) => a.day === 0).length || appts.length,
    billing: invoices.filter((i) => i.status === "overdue" || i.status === "due").length,
    bookingRequests: bookingPending,
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ type: "spring", stiffness: 340, damping: 34 }}
      className="sidebar-shell shrink-0 hidden md:flex flex-col h-screen sticky top-0 z-20 overflow-hidden bg-gradient-to-b from-[#0f172a] to-[#0e1f35]"
      style={{ minWidth: collapsed ? 72 : 240 }}
    >
      <div className={`px-3 pt-5 pb-4 flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/[0.08] shrink-0 ring-1 ring-white/10">
          <img
            src={mediflowLogo}
            alt="MediFlow logo"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="leading-tight overflow-hidden"
            >
              <div className="font-display font-bold text-white text-[15px] whitespace-nowrap">
                ميدي فلو
              </div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                بوابة العيادة
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="mx-2.5 mb-2 flex items-center justify-center h-8 rounded-lg text-slate-400 hover:bg-white/[0.07] hover:text-slate-200 transition-colors"
        title={collapsed ? "توسيع القائمة" : "طي القائمة"}
      >
        {collapsed ? (
          <ChevronLeftIcon className="w-4 h-4" />
        ) : (
          <div className="w-full flex items-center gap-2 px-2 text-xs">
            <ChevronRightIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-medium whitespace-nowrap">طي القائمة</span>
          </div>
        )}
      </button>

      <div className="mx-3 mb-2 h-px bg-white/[0.07]" />

      <nav className="px-2 flex-1 space-y-0.5 overflow-hidden">
        {items.map((it, idx) => {
          const Icon = ICONS[it.icon];
          const badgeCount = it.badgeKey ? badges[it.badgeKey] : 0;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              title={collapsed ? it.label : undefined}
              className={({ isActive }) =>
                [
                  "relative flex items-center rounded-xl text-sm font-medium cursor-pointer transition-colors",
                  collapsed ? "h-11 justify-center px-0" : "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-[rgba(6,182,212,0.16)] text-[#67e8f9] font-semibold border-s-[3px] border-[#06b6d4]"
                    : "text-slate-400 hover:bg-white/[0.07] hover:text-slate-100 border-s-[3px] border-transparent",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.035 }}
                    className={`shrink-0 ${collapsed ? "w-full flex justify-center" : ""}`}
                  >
                    <Icon
                      className={`w-[21px] h-[21px] ${
                        isActive ? "text-[#06b6d4]" : "text-current"
                      }`}
                    />
                  </motion.div>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 whitespace-nowrap"
                      >
                        {it.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!collapsed && badgeCount > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                        it.badgeKey === "billing"
                          ? "bg-danger text-white shadow-sm"
                          : "bg-[#06b6d4] text-[#071828] shadow-sm"
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.07] px-2.5 py-3 space-y-0.5 mt-auto">
        {!collapsed && (
          <>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
            >
              <QuestionMarkCircleIcon className="w-5 h-5 shrink-0" />
              مركز المساعدة
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0 scale-x-[-1]" />
              تسجيل خروج
            </button>
          </>
        )}
        <div className={`px-1.5 pt-2 flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#06b6d4] to-[#0e7490] text-white grid place-items-center font-semibold text-xs shrink-0 shadow-sm">
            {user.initials}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden min-w-0"
              >
                <div className="text-xs font-semibold text-slate-100 whitespace-nowrap truncate max-w-[132px]">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-400 whitespace-nowrap truncate">
                  {user.title}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
