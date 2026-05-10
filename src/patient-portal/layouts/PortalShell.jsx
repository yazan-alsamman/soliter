import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  SparklesIcon,
  HomeIcon,
  CalendarDaysIcon,
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  CalendarDaysIcon as CalendarSolid,
  BellIcon as BellSolid,
  UserCircleIcon as UserSolid,
} from "@heroicons/react/24/solid";
import { useState, useEffect } from "react";
import { usePatientPortalAuth } from "../context/PatientPortalAuthContext.jsx";
import PWAInstallBanner from "../components/PWAInstallBanner.jsx";

// ─── Bottom navigation (mobile) ───────────────────────────────────────────

const BOTTOM_NAV = [
  {
    to: "/portal",
    end: true,
    label: "الرئيسية",
    Icon: HomeIcon,
    IconActive: HomeIconSolid,
  },
  {
    to: "/portal/services",
    label: "الخدمات",
    Icon: SparklesIcon,
    IconActive: SparklesIcon,
  },
  {
    to: "/portal/request",
    label: "حجز موعد",
    Icon: CalendarDaysIcon,
    IconActive: CalendarSolid,
    primary: true,
  },
  {
    to: "/portal/notifications",
    label: "إشعارات",
    Icon: BellIcon,
    IconActive: BellSolid,
  },
  {
    to: "/portal/dashboard",
    label: "حسابي",
    Icon: UserCircleIcon,
    IconActive: UserSolid,
    requiresAuth: true,
    loginFallback: "/portal/login",
  },
];

function BottomNav({ isAuthenticated }) {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center">
        {BOTTOM_NAV.map((item) => {
          const to = item.requiresAuth && !isAuthenticated ? item.loginFallback || "/portal/login" : item.to;
          const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = isActive ? item.IconActive : item.Icon;

          if (item.primary) {
            return (
              <Link
                key={item.to}
                to={to}
                className="flex-1 flex flex-col items-center justify-center py-1.5 relative"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0e7490] shadow-lg shadow-teal-900/20 flex items-center justify-center -mt-5 mb-0.5 transition-transform active:scale-95">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-bold text-[#0e7490]">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                isActive ? "text-[#0e7490]" : "text-slate-400"
              }`}
            >
              <Icon className="w-5.5 h-5.5 w-[22px] h-[22px]" />
              <span className={`text-[10px] font-semibold ${isActive ? "font-bold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Desktop top navigation ───────────────────────────────────────────────

const DESKTOP_NAV = [
  { to: "/portal",              label: "الرئيسية",  end: true },
  { to: "/portal/services",     label: "الخدمات"              },
  { to: "/portal/offers",       label: "العروض"               },
  { to: "/portal/doctors",      label: "الأطباء"              },
];

// ─── Mobile drawer menu ───────────────────────────────────────────────────

function MobileDrawer({ open, onClose, isAuthenticated, logout }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] md:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-72 bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0e7490] to-[#0891b2] grid place-items-center">
              <SparklesIcon className="w-4 h-4 text-white" />
            </span>
            <span className="font-bold text-slate-900">MediFlow</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <XMarkIcon className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { to: "/portal",           label: "الرئيسية", end: true },
            { to: "/portal/services",  label: "الخدمات"             },
            { to: "/portal/offers",    label: "العروض"              },
            { to: "/portal/doctors",   label: "الأطباء"             },
            { to: "/portal/request",   label: "طلب موعد جديد"      },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? "bg-[#e0f2fe] text-[#0e7490]" : "text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          {isAuthenticated ? (
            <div className="space-y-2">
              <Link
                to="/portal/dashboard"
                onClick={onClose}
                className="flex w-full items-center justify-center px-4 py-3 rounded-xl bg-[#0e7490] text-white font-bold text-sm"
              >
                لوحتي
              </Link>
              <button
                type="button"
                onClick={() => { logout(); onClose(); }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm"
              >
                تسجيل الخروج
              </button>
            </div>
          ) : (
            <Link
              to="/portal/login"
              onClick={onClose}
              className="flex w-full items-center justify-center px-4 py-3 rounded-xl bg-[#0e7490] text-white font-bold text-sm"
            >
              دخول
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Portal Shell ─────────────────────────────────────────────────────────

export default function PortalShell() {
  const { isAuthenticated, logout } = usePatientPortalAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#eef6fb] via-[#f7fafc] to-white"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 64px)" }}
    >
      {/* ── Desktop + Mobile header ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-4 h-14 sm:h-16">
          {/* Logo */}
          <Link to="/portal" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#0e7490] to-[#0891b2] grid place-items-center shadow-md">
              <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </span>
            <div className="leading-tight">
              <div className="font-bold text-slate-900 text-sm tracking-tight">MediFlow</div>
              <div className="hidden sm:block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                بوابة المرضى
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {DESKTOP_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "px-3 py-2 rounded-xl text-sm font-semibold transition-colors",
                    isActive ? "bg-[#e0f2fe] text-[#0e7490]" : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0 ms-auto">
            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/portal/dashboard"
                    className="inline-flex px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    لوحتي
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    خروج
                  </button>
                </>
              ) : (
                <Link
                  to="/portal/login"
                  className="inline-flex px-4 py-2 rounded-xl text-sm font-bold bg-[#0e7490] text-white shadow-sm hover:bg-[#0f766e] transition-colors"
                >
                  دخول
                </Link>
              )}
            </div>

            {/* Mobile: notification bell + hamburger */}
            <Link
              to="/portal/notifications"
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 relative"
            >
              <BellIcon className="w-5 h-5" />
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isAuthenticated={isAuthenticated}
        logout={logout}
      />

      {/* Page content */}
      <main
        className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8"
        style={{ minHeight: "calc(100dvh - 64px - env(safe-area-inset-bottom, 0px))" }}
      >
        <Outlet />
      </main>

      {/* Desktop footer */}
      <footer className="hidden md:block border-t border-slate-200/80 bg-white/90 mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row gap-4 justify-between items-center text-sm text-slate-600">
          <p>© {new Date().getFullYear()} MediFlow — تجربة رقمية للعيادة.</p>
          <div className="flex gap-4">
            <Link to="/login" className="font-semibold text-[#0e7490] hover:underline">
              دخول الموظفين
            </Link>
            <span className="text-slate-300">|</span>
            <Link to="/portal/request" className="hover:underline">
              طلب موعد
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile bottom navigation */}
      <BottomNav isAuthenticated={isAuthenticated} />

      {/* PWA install banner */}
      <PWAInstallBanner />
    </div>
  );
}
