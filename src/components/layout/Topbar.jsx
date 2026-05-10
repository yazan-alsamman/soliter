import {
  MagnifyingGlassIcon,
  BellIcon,
  ArrowPathIcon,
  WifiIcon,
  MoonIcon,
  SunIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROLE_LABEL_AR, useAuth } from "../../context/AuthContext.jsx";
import { fmtPercentAr, LOCALE_AR_LATN, fmtDateTimeLatn } from "../../data/strings.js";
import { useThemeMode } from "../../context/ThemeModeContext.jsx";
import { useAppDialog } from "../../context/AppDialogContext.jsx";
import { api } from "../../services/apiClient.js";
import { useSync } from "../../sync/SyncContext.jsx";
import { unpackNotificationMessage } from "../../data/notificationMessage.js";
import { formatUserFacingError } from "../../utils/userFacingError.js";

function getWeekdayAr() {
  return new Intl.DateTimeFormat(LOCALE_AR_LATN, {
    weekday: "long",
  }).format(new Date());
}

function getGregorianDateAr() {
  return new Intl.DateTimeFormat(LOCALE_AR_LATN, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function NotificationPopover() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { alert } = useAppDialog();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [actingId, setActingId] = useState(null);
  const wrapRef = useRef(null);

  const load = async () => {
    if (!isAuthenticated) return;
    try {
      const rows = await api.getNotifications({ limit: 40 });
      setItems(Array.isArray(rows) ? rows : []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    load();
    const id = window.setInterval(load, 25000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  const barTone = (t) => {
    if (t === "critical") return "border-e-danger bg-danger-soft/10";
    if (t === "warning") return "border-e-warn bg-warn-soft/10";
    return "border-e-primary/40 bg-surface-low/20";
  };

  const onCheckin = async (n, appointmentId) => {
    if (!appointmentId || actingId) return;
    setActingId(n.id);
    try {
      await api.updateAppointmentStatus(appointmentId, { status: "arrived" });
      await api.markNotificationRead(n.id);
      await load();
      void navigate("/appointments");
    } catch (e) {
      await alert({
        title: "تعذر التنفيذ",
        message: formatUserFacingError(e) || "لا يمكن تسجيل الوصول لهذا الموعد من الإشعار.",
        confirmText: "حسناً",
      });
    } finally {
      setActingId(null);
    }
  };

  const onSendToDoctor = async (n, appointmentId) => {
    if (!appointmentId || actingId) return;
    setActingId(n.id);
    try {
      await api.updateAppointmentStatus(appointmentId, { status: "in_consultation" });
      await api.markNotificationRead(n.id);
      await load();
      void navigate("/appointments");
    } catch (e) {
      await alert({
        title: "تعذر التنفيذ",
        message: formatUserFacingError(e) || "لا يمكن إدخال الموعد للمعاينة.",
        confirmText: "حسناً",
      });
    } finally {
      setActingId(null);
    }
  };

  const onDismiss = async (n) => {
    if (actingId) return;
    setActingId(n.id);
    try {
      await api.markNotificationRead(n.id);
      await load();
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          load();
        }}
        className="relative w-10 h-10 rounded-xl hover:bg-surface-low grid place-items-center transition-colors"
      >
        <BellIcon className="w-5 h-5 text-ink-variant" />
        {unread > 0 && (
          <span className="absolute top-1.5 start-1.5 w-2 h-2 rounded-full bg-danger animate-pulse-soft ring-2 ring-surface-base" />
        )}
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-[min(100vw-2rem,380px)] rounded-xl border border-surface-high bg-surface-base shadow-pop z-[60] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-high bg-surface-low/40">
            <span className="text-xs font-bold text-ink">الإشعارات</span>
            <button
              type="button"
              className="text-[11px] text-primary font-semibold hover:underline"
              onClick={() => void api.markAllNotificationsRead().then(load)}
            >
              تعيين الكل كمقروء
            </button>
          </div>
          <div className="max-h-[min(70vh,420px)] overflow-y-auto">
            {items.length === 0 ? (
              <div className="text-xs text-ink-mute px-3 py-6 text-center">لا توجد إشعارات</div>
            ) : (
              items.map((n) => {
                const { text, meta } = unpackNotificationMessage(n.message || "");
                const canCheckin =
                  Boolean(meta?.appointmentId) &&
                  (!meta.actions?.length || meta.actions.includes("checkin"));
                const canSendToDoctor =
                  Boolean(meta?.appointmentId) && meta.actions?.includes("send_to_doctor");
                return (
                  <div
                    key={n.id}
                    role="group"
                    className={`w-full text-start px-3 py-2.5 border-b border-surface-high/80 border-e-[3px] ${barTone(n.type)} ${
                      !n.read ? "font-semibold" : ""
                    }`}
                  >
                    <div className="text-[11px] text-ink-mute">
                      {fmtDateTimeLatn(n.createdAt)}
                    </div>
                    <div className="text-sm text-ink mt-0.5 leading-snug">{text}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {canCheckin && (
                        <button
                          type="button"
                          disabled={!!actingId}
                          onClick={() => void onCheckin(n, meta.appointmentId)}
                          className="min-h-[40px] px-3 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-50"
                        >
                          {actingId === n.id ? "…" : "تسجيل وصول"}
                        </button>
                      )}
                      {canSendToDoctor && (
                        <button
                          type="button"
                          disabled={!!actingId}
                          onClick={() => void onSendToDoctor(n, meta.appointmentId)}
                          className="min-h-[40px] px-3 rounded-lg bg-secondary text-white text-xs font-bold disabled:opacity-50"
                        >
                          {actingId === n.id ? "…" : "إدخال للطبيب"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!!actingId}
                        onClick={() => void onDismiss(n)}
                        className="min-h-[40px] px-3 rounded-lg border border-surface-high bg-surface-low/60 text-xs font-semibold text-ink-variant hover:bg-surface-low disabled:opacity-50"
                      >
                        تجاهل
                      </button>
                      {!n.read && !canCheckin && !canSendToDoctor && (
                        <button
                          type="button"
                          className="min-h-[40px] px-3 rounded-lg text-xs font-semibold text-primary hover:underline"
                          onClick={() => void onDismiss(n)}
                        >
                          تعيين كمقروء
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function todayIsoRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Live load proxy: share of today's non-cancelled appointments currently at clinic (وصول أو معاينة). */
function computeOccupancyPct(appointments) {
  const list = Array.isArray(appointments) ? appointments : [];
  const booked = list.filter((a) => a?.status !== "cancelled");
  if (booked.length === 0) return { pct: null, inClinic: 0, total: 0 };
  const inClinic = booked.filter((a) =>
    ["arrived", "in_consultation"].includes(a.status),
  ).length;
  const pct = Math.min(100, Math.round((100 * inClinic) / booked.length));
  return { pct, inClinic, total: booked.length };
}

export default function Topbar({ onOpenCommandPalette }) {
  const { role, user, isAuthenticated } = useAuth();
  const { darkMode, toggleDarkMode } = useThemeMode();
  const { confirm, alert } = useAppDialog();
  const sync = useSync();
  const [occupancy, setOccupancy] = useState({
    pct: null,
    inClinic: 0,
    total: 0,
    loading: true,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setOccupancy({ pct: null, inClinic: 0, total: 0, loading: false });
      return undefined;
    }
    let cancelled = false;
    const loadOcc = async () => {
      try {
        const { start, end } = todayIsoRange();
        const res = await api.getAppointments({
          from: start.toISOString(),
          to: end.toISOString(),
          limit: 500,
        });
        if (cancelled) return;
        const raw = res?.items ?? res;
        const arr = Array.isArray(raw) ? raw : [];
        setOccupancy({ ...computeOccupancyPct(arr), loading: false });
      } catch {
        if (!cancelled) setOccupancy({ pct: null, inClinic: 0, total: 0, loading: false });
      }
    };
    void loadOcc();
    const id = window.setInterval(loadOcc, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isAuthenticated]);

  const online = sync.online;
  const syncTone =
    !online || sync.failedCount > 0 ? "s-pill-amber" : sync.syncHealth === "degraded" ? "s-pill-amber" : "s-pill-teal";
  const syncDot =
    !online ? "bg-warn" : sync.failedCount > 0 ? "bg-danger" : sync.pendingCount > 0 ? "bg-secondary" : "bg-success";

  const syncLabelBold = !online
    ? "غير متصل"
    : sync.syncing
      ? "مزامنة…"
      : sync.failedCount > 0
        ? "تنبيه مزامنة"
        : sync.pendingCount > 0
          ? `متصل · ${sync.pendingCount} معلّق`
          : "متصل";

  const syncMeta = (() => {
    if (!online) return "التطبيق يعمل محلياً — ستُرفع التغييرات عند عودة الشبكة";
    const parts = [];
    if (sync.lastSyncedAt) {
      parts.push(
        `آخر مزامنة ${new Intl.DateTimeFormat(LOCALE_AR_LATN, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(sync.lastSyncedAt))}`,
      );
    }
    if (sync.pendingCount > 0) parts.push(`${sync.pendingCount} تغيير بانتظار الرفع`);
    if (sync.failedCount > 0) parts.push(`${sync.failedCount} عملية فاشلة`);
    if (sync.lastError) parts.push(sync.lastError.slice(0, 120));
    if (parts.length === 0) return "متصل بالخادم — لا طلبات معلّقة";
    return parts.join(" · ");
  })();

  const occTitle =
    occupancy.total === 0
      ? "لا مواعيد مسجّلة لهذا اليوم بعد"
      : `${occupancy.inClinic} في العيادة الآن من أصل ${occupancy.total} موعد اليوم (غير الملغاة)`;

  const triggerEmergency = async () => {
    const approved = await confirm({
      title: "تأكيد الحالة الطارئة",
      message: "هل تريد تفعيل حالة طارئة الآن؟",
      confirmText: "تأكيد",
      cancelText: "إلغاء",
      tone: "danger",
    });
    if (!approved) return;
    await alert({
      title: "تم التنفيذ",
      message: "تم تسجيل تنبيه الحالة الطارئة بنجاح.",
      confirmText: "حسناً",
    });
  };

  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-surface-high">
      {/* Status strip */}
      <div className="px-4 lg:px-7 py-1 border-b border-surface-mid/50 bg-gradient-to-r from-surface-low/40 via-white/20 to-surface-low/40">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-mute me-1">
            Clinic Pulse
          </span>
          <div className="w-px h-3 bg-surface-high" />
          <button
            type="button"
            title={
              online
                ? `${syncMeta}${sync.pendingCount || sync.failedCount ? " — انقر للمزامنة الآن" : ""}`
                : "لا يوجد اتصال بالخادم"
            }
            onClick={() => {
              if (online && isAuthenticated) void sync.syncNow();
            }}
            className={`${syncTone} cursor-pointer hover:opacity-95 disabled:cursor-default`}
            disabled={!online || !isAuthenticated || sync.syncing}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${syncDot}`} />
            <WifiIcon className={`w-3 h-3 shrink-0 ${!online ? "opacity-50" : ""}`} />
            <span>الاتصال</span>
            <span className="font-bold truncate max-w-[10rem]">{syncLabelBold}</span>
            {sync.syncing && <ArrowPathIcon className="w-3 h-3 animate-spin shrink-0" />}
            {!sync.syncing && online && (sync.pendingCount > 0 || sync.failedCount > 0) && (
              <ArrowPathIcon className="w-3 h-3 shrink-0 opacity-70" />
            )}
          </button>
          <div
            className="s-pill-blue"
            title={occTitle}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                occupancy.loading
                  ? "bg-surface-mid animate-pulse"
                  : occupancy.pct == null || occupancy.total === 0
                    ? "bg-surface-mid"
                    : occupancy.pct >= 70
                      ? "bg-secondary"
                      : occupancy.pct >= 40
                        ? "bg-warn"
                        : "bg-success"
              }`}
            />
            <span>الإشغال</span>
            <span className="font-bold tabular-nums">
              {occupancy.loading ? "…" : occupancy.pct == null ? "—" : fmtPercentAr(occupancy.pct)}
            </span>
          </div>
          <div className="ms-auto hidden xl:flex items-center gap-1.5 text-[11px] text-ink-mute">
            <span className="font-medium text-ink-variant">{getWeekdayAr()}</span>
            <span>·</span>
            <span>{getGregorianDateAr()}</span>
            <span>·</span>
            <span>{syncMeta}</span>
          </div>
        </div>
      </div>

      {/* Main toolbar */}
      <div className="px-4 lg:px-7 py-1.5 flex items-center gap-2.5">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute end-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
            <input
              readOnly
              onFocus={() => onOpenCommandPalette?.()}
              onClick={() => onOpenCommandPalette?.()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenCommandPalette?.();
                }
              }}
              className="input pe-10 h-10 text-sm bg-surface-low/60 border-surface-high/70"
              placeholder="لوحة أوامر: اكتب إجراءً سريعاً..."
            />
            <kbd className="absolute start-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold text-ink-mute bg-surface-mid border border-surface-high">
              ⌘K
            </kbd>
          </div>
        </div>

        <NotificationPopover />
        <button
          onClick={triggerEmergency}
          className="h-9 px-2.5 rounded-lg border border-danger/25 text-danger hover:bg-danger-soft/30 transition-colors text-xs font-semibold flex items-center gap-1.5"
          title="حالة طارئة"
        >
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span className="hidden xl:inline">حالة طارئة</span>
        </button>
        <button
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            toggleDarkMode({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
          }}
          className="w-10 h-10 rounded-xl hover:bg-surface-low grid place-items-center transition-colors"
          title={darkMode ? "الوضع النهاري" : "الوضع الليلي"}
        >
          {darkMode ? (
            <SunIcon className="w-4 h-4 text-amber-400" />
          ) : (
            <MoonIcon className="w-4 h-4 text-ink-variant" />
          )}
        </button>

        <div className="hidden lg:flex items-center gap-2.5 ps-3 border-s border-surface-high">
          <div className="text-end leading-tight">
            <div className="text-sm font-semibold text-ink">{user.name}</div>
            <div className="label-caps">
              {ROLE_LABEL_AR[role]} · {user.title}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0891b2] to-[#0e7490] text-white grid place-items-center font-semibold text-xs shadow-[0_2px_8px_rgba(14,116,144,0.3)]">
            {user.initials}
          </div>
        </div>
      </div>
    </header>
  );
}
