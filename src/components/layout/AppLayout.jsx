import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, matchPath, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import { useThemeMode } from "../../context/ThemeModeContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import CommandPalette from "../ui/CommandPalette.jsx";
import { AppDialogProvider } from "../../context/AppDialogContext.jsx";
import CopilotPanel from "../copilot/CopilotPanel.jsx";
import OfflineBanner from "../ui/OfflineBanner.jsx";
import { PollingCoordinator } from "../../context/PollingCoordinator.jsx";
import { SparklesIcon } from "@heroicons/react/24/outline";

export default function AppLayout() {
  const { revealActive, revealOrigin } = useThemeMode();
  const { can, role, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const patientRouteMatch = matchPath({ path: "/patients/:id", end: true }, location.pathname);
  const copilotPatientId = patientRouteMatch?.params?.id;

  useEffect(() => {
    const onKeyDown = (event) => {
      const isOpenShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isOpenShortcut) return;
      event.preventDefault();
      setCommandOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onCopilotShortcut = (event) => {
      if (!isAuthenticated) return;
      const openCopilot =
        (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "l";
      if (!openCopilot) return;
      event.preventDefault();
      setCopilotOpen(true);
    };
    window.addEventListener("keydown", onCopilotShortcut);
    return () => window.removeEventListener("keydown", onCopilotShortcut);
  }, [isAuthenticated]);

  const actions = useMemo(
    () =>
      [
        {
          id: "dashboard",
          group: "التنقل",
          label: "الذهاب إلى الرئيسية",
          description: "فتح لوحة القيادة",
          keywords: "dashboard home الرئيسية",
          run: () => navigate("/dashboard"),
        },
        {
          id: "appointments",
          group: "التنقل",
          label: "الذهاب إلى جدول المواعيد",
          description: "عرض جميع المواعيد",
          keywords: "appointments schedule موعد مواعيد",
          run: () => navigate("/appointments"),
        },
        can("bookingRequests") && {
          id: "booking-requests",
          group: "التنقل",
          label: "طلبات الحجز (بوابة المرضى)",
          description: "طابور المراجعة والموافقة",
          keywords: "booking portal طلبات حجز استقبال queue",
          run: () => navigate("/booking-requests"),
        },
        can("patients.view") && {
          id: "patients",
          group: "التنقل",
          label: "الذهاب إلى المرضى",
          description: "فتح سجل المرضى",
          keywords: "patients مرضى patient",
          run: () => navigate("/patients"),
        },
        can("billing.view") && {
          id: "billing",
          group: "التنقل",
          label: "الذهاب إلى الفوترة",
          description: "فتح صفحة الفواتير",
          keywords: "billing invoices فواتير فوترة",
          run: () => navigate("/billing"),
        },
        can("inventory") && {
          id: "inventory",
          group: "التنقل",
          label: "الذهاب إلى المخزون",
          description: "فتح صفحة المستلزمات",
          keywords: "inventory stock مخزون",
          run: () => navigate("/inventory"),
        },
        can("reports") && {
          id: "reports",
          group: "التنقل",
          label: "الذهاب إلى التقارير",
          description: "تحليل الأداء والإيرادات",
          keywords: "reports analytics تقارير",
          run: () => navigate("/reports"),
        },
        can("settings") && {
          id: "settings",
          group: "التنقل",
          label: "فتح الإعدادات",
          description: "تعديل تفضيلات النظام",
          keywords: "settings اعدادات",
          run: () => navigate("/settings"),
        },
        can("appointments.create") && {
          id: "new-appointment",
          group: "إجراءات سريعة",
          label: "إضافة موعد جديد",
          description: "فتح نموذج حجز الموعد مباشرة",
          keywords: "new appointment add موعد جديد",
          run: () => navigate("/appointments?create=1"),
        },
        can("aiBooking") && {
          id: "ai-booking",
          group: "إجراءات سريعة",
          label: "حجز بالذكاء الاصطناعي",
          description: "تركيز فوري على حقل AI Booking",
          keywords: "ai booking ذكاء اصطناعي",
          run: () => navigate("/appointments?focus=ai"),
        },
        isAuthenticated && {
          id: "copilot",
          group: "إجراءات سريعة",
          label: "مساعد MediFlow الذكي",
          description: "أسئلة عن المواعيد والفواتير والسجل — Ctrl+Shift+L",
          keywords: "copilot ai مساعد ذكاء مساعد",
          run: () => setCopilotOpen(true),
        },
        can("patients.create") && {
          id: "new-patient",
          group: "إجراءات سريعة",
          label: "إضافة مريض جديد",
          description: "فتح نموذج إنشاء ملف مريض",
          keywords: "new patient add مريض",
          run: () => navigate("/patients?create=1"),
        },
        role === "admin" && {
          id: "go-queue",
          group: "إجراءات سريعة",
          label: "الذهاب للوحة الطابور اللحظي",
          description: "فتح صفحة المواعيد مع الطابور",
          keywords: "queue طابور waiting",
          run: () => navigate("/appointments"),
        },
      ].filter(Boolean),
    [can, navigate, role, isAuthenticated]
  );

  const runAction = (action) => {
    action.run?.();
    setCommandOpen(false);
  };

  return (
    <div className="h-screen flex bg-[#f3f5f8] dark:bg-surface relative overflow-hidden">
      {/* Offline detection banner */}
      <OfflineBanner />
      {/* Single polling coordinator — replaces 4 separate setInterval timers */}
      {isAuthenticated && <PollingCoordinator />}
      {/* Subtle ambient (light); dark mode keeps depth */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden app-ambient">
        <div className="absolute inset-0 app-ambient-base bg-[#f3f5f8] dark:bg-gradient-to-br dark:from-[#f0f5f9] dark:via-[#edf4f8] dark:to-[#f4f0f9]" />
        <div className="blob-1 app-ambient-blob-1 absolute -top-48 -end-32 w-[500px] h-[500px] rounded-full bg-[#cffafe]/25 blur-[90px] dark:bg-[#cffafe]/45 dark:blur-[80px]" />
        <div className="blob-2 app-ambient-blob-2 absolute -bottom-48 -start-32 w-[460px] h-[460px] rounded-full bg-[#dbeafe]/20 blur-[90px] dark:bg-[#dbeafe]/40 dark:blur-[80px]" />
        <div className="blob-3 app-ambient-blob-3 absolute top-1/2 start-1/3 w-[380px] h-[380px] rounded-full bg-[#e2e8f0]/35 blur-[90px] dark:bg-[#d1fae5]/25 dark:blur-[80px]" />
      </div>

      <Sidebar />

      <AppDialogProvider>
        <div
          className={`content-shell flex-1 flex flex-col min-w-0 min-h-0 relative z-10 ${revealActive ? "theme-reveal-active" : ""}`}
          style={{
            "--theme-reveal-x": revealOrigin.x != null ? `${revealOrigin.x}px` : "92vw",
            "--theme-reveal-y": revealOrigin.y != null ? `${revealOrigin.y}px` : "64px",
          }}
        >
          <Topbar onOpenCommandPalette={() => setCommandOpen(true)} />
          <main className="flex-1 min-h-0 overflow-y-auto">
            {/* Plain wrapper: avoids rare stuck opacity:0 from page-enter motion before paint */}
            <div className="px-6 lg:px-10 py-6 max-w-[1440px] mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </AppDialogProvider>
      <CommandPalette
        key={commandOpen ? "open" : "closed"}
        open={commandOpen}
        actions={actions}
        onClose={() => setCommandOpen(false)}
        onAction={runAction}
      />

      {isAuthenticated && (
        <>
          {/* Copilot trigger button with pulse ring */}
          <div className="fixed bottom-6 end-6 z-[85]">
            {/* Animated pulse ring — only when panel is closed */}
            {!copilotOpen && (
              <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/25 pointer-events-none" />
            )}
            <button
              type="button"
              className="relative h-14 w-14 rounded-2xl shadow-pop border border-primary/20 bg-primary text-white grid place-items-center hover:brightness-110 active:scale-[0.96] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="مساعد MediFlow — Ctrl+Shift+L"
              aria-label="فتح مساعد MediFlow الذكي"
              onClick={() => setCopilotOpen(true)}
            >
              <SparklesIcon className="w-6 h-6" />
              {/* Online dot */}
              <span className="absolute -top-1 -end-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-surface-base" />
            </button>
          </div>
          <CopilotPanel
            open={copilotOpen}
            onClose={() => setCopilotOpen(false)}
            routePatientId={copilotPatientId}
          />
        </>
      )}
    </div>
  );
}
