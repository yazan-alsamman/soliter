import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../services/apiClient.js";
import { formatUserFacingError } from "../../utils/userFacingError.js";

// ─── Intent configuration ─────────────────────────────────────────────────────
const INTENT_CONFIG = {
  scheduling:    { label: "جدولة",  emoji: "📅", cls: "bg-primary-soft text-primary" },
  clinical:      { label: "سريري",  emoji: "🩺", cls: "bg-blue-50 text-blue-600" },
  finance:       { label: "مالية",  emoji: "💰", cls: "bg-emerald-50 text-emerald-700" },
  search:        { label: "بحث",    emoji: "🔍", cls: "bg-violet-50 text-violet-700" },
  communication: { label: "تواصل", emoji: "💬", cls: "bg-orange-50 text-orange-600" },
  general:       { label: "عام",    emoji: "✨", cls: "bg-surface-low text-ink-variant" },
};

// ─── Follow-up suggestions per intent ────────────────────────────────────────
const FOLLOW_UPS = {
  scheduling:    ["هل هناك أوقات متاحة غداً؟", "اعرض جدول الأطباء هذا الأسبوع"],
  clinical:      ["ما الأدوية الحالية للمريض؟", "متى الزيارة القادمة؟"],
  finance:       ["ما إجمالي الإيرادات هذا الشهر؟", "اعرض الفواتير غير المدفوعة"],
  search:        ["بحث بالاسم الكامل", "بحث برقم الهاتف"],
  communication: ["أرسل رسالة تذكير واتساب", "اعرض بيانات التواصل مع المريض"],
  general:       ["كم موعد اليوم؟", "ما الفواتير المعلقة؟"],
};

// ─── Empty-state grouped suggestions ─────────────────────────────────────────
const SUGGESTION_GROUPS = [
  {
    label: "المواعيد",
    Icon: CalendarDaysIcon,
    color: "text-primary",
    bg: "bg-primary-soft",
    items: ["كم موعد اليوم؟", "المواعيد المتاحة هذا الأسبوع", "اعرض المواعيد الملغاة"],
  },
  {
    label: "الفواتير",
    Icon: BanknotesIcon,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    items: ["الفواتير غير المدفوعة", "إجمالي إيرادات الشهر الحالي"],
  },
  {
    label: "المرضى",
    Icon: UserCircleIcon,
    color: "text-blue-600",
    bg: "bg-blue-50",
    items: ["ابحث عن مريض باسمه", "ملخص آخر زيارات هذا المريض"],
  },
];

// ─── Status badges ────────────────────────────────────────────────────────────
const APPT_STATUS = {
  scheduled:       { label: "مجدول",      cls: "bg-yellow-100 text-yellow-700" },
  confirmed:       { label: "مؤكد",       cls: "bg-blue-100 text-blue-700" },
  arrived:         { label: "وصل",        cls: "bg-teal-100 text-teal-700" },
  in_consultation: { label: "في الكشف",   cls: "bg-violet-100 text-violet-700" },
  completed:       { label: "مكتمل",      cls: "bg-emerald-100 text-emerald-700" },
  paid:            { label: "مدفوع",      cls: "bg-emerald-100 text-emerald-800" },
  no_show:         { label: "لم يحضر",    cls: "bg-red-100 text-red-700" },
  cancelled:       { label: "ملغى",       cls: "bg-surface-low text-ink-mute" },
};

const INVOICE_STATUS = {
  draft:   { label: "معلق",      cls: "bg-yellow-100 text-yellow-700" },
  partial: { label: "مدفوع جزئياً", cls: "bg-orange-100 text-orange-700" },
  paid:    { label: "مدفوع",     cls: "bg-emerald-100 text-emerald-700" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LOCALE_AR_LATN = "ar-SY-u-ca-gregory-nu-latn";
function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(LOCALE_AR_LATN, { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(LOCALE_AR_LATN, { day: "numeric", month: "short" });
}
function formatAmount(n) {
  return Number(n ?? 0).toLocaleString(LOCALE_AR_LATN, { maximumFractionDigits: 2 });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-2 h-2 rounded-full bg-primary/60"
          animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function CopyButton({ text, disabled }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled}
      title={copied ? "تم النسخ!" : "نسخ الرد"}
      className="inline-flex items-center gap-1 text-[11px] text-ink-mute hover:text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
    >
      {copied ? (
        <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <ClipboardDocumentIcon className="w-3.5 h-3.5" />
      )}
      {copied ? "تم" : "نسخ"}
    </button>
  );
}

function IntentBadge({ intent }) {
  const cfg = INTENT_CONFIG[intent] ?? INTENT_CONFIG.general;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.cls}`}>
      <span>{cfg.emoji}</span>
      {cfg.label}
    </span>
  );
}

function StatusPill({ cls, label }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

// ─── Result cards ─────────────────────────────────────────────────────────────
function PatientCard({ p }) {
  const statusCls = p.recordStatus === "active" ? "bg-emerald-50 text-emerald-700"
    : p.recordStatus === "inactive" ? "bg-surface-low text-ink-mute"
    : "bg-blue-50 text-blue-700";
  const statusLabel = p.recordStatus === "active" ? "نشط"
    : p.recordStatus === "inactive" ? "غير نشط" : "جديد";
  return (
    <div className="flex items-center gap-2.5 bg-surface-base border border-surface-high rounded-xl px-3 py-2.5 text-xs">
      <div className="w-8 h-8 rounded-full bg-primary-soft grid place-items-center shrink-0">
        <UserCircleIcon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink truncate">{p.name ?? "—"}</p>
        <p className="text-ink-mute truncate">{p.phone ?? "—"}</p>
      </div>
      <StatusPill cls={statusCls} label={statusLabel} />
    </div>
  );
}

function AppointmentCard({ a }) {
  const st = APPT_STATUS[a.status] ?? { label: a.status, cls: "bg-surface-low text-ink-mute" };
  return (
    <div className="bg-surface-base border border-surface-high rounded-xl px-3 py-2.5 text-xs space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink truncate">
          {a.patient?.name ?? a.patientId ?? "—"}
        </span>
        <StatusPill cls={st.cls} label={st.label} />
      </div>
      <div className="flex gap-3 text-ink-mute">
        <span>🕐 {formatTime(a.startTime)}</span>
        <span>📅 {formatDate(a.startTime)}</span>
        {a.doctor?.name && <span>👨‍⚕️ {a.doctor.name}</span>}
      </div>
      {a.service?.name && (
        <p className="text-ink-variant truncate">{a.service.name}</p>
      )}
    </div>
  );
}

function InvoiceCard({ inv }) {
  const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, cls: "bg-surface-low text-ink-mute" };
  return (
    <div className="bg-surface-base border border-surface-high rounded-xl px-3 py-2.5 text-xs space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink truncate">
          {inv.patient?.name ?? "—"}
        </span>
        <StatusPill cls={st.cls} label={st.label} />
      </div>
      <div className="flex gap-3 text-ink-mute">
        {inv.status !== "paid" && (
          <span className="font-semibold text-orange-600">
            متبقي: {formatAmount(inv.balance)}
          </span>
        )}
        <span>إجمالي: {formatAmount(inv.finalAmount ?? inv.totalAmount)}</span>
      </div>
      <p className="text-ink-mute">{formatDate(inv.createdAt)}</p>
    </div>
  );
}

function ResultItem({ item }) {
  if (!item || typeof item !== "object") return null;
  if ("phone" in item && "name" in item && !("startTime" in item) && !("totalAmount" in item)) {
    return <PatientCard p={item} />;
  }
  if ("startTime" in item || "status" in item && "patientId" in item) {
    return <AppointmentCard a={item} />;
  }
  if ("totalAmount" in item || "finalAmount" in item || "balance" in item) {
    return <InvoiceCard inv={item} />;
  }
  return null;
}

function ResultsBlock({ data }) {
  const results = data?.results_preview;
  const count = data?.result_count ?? 0;
  if (!Array.isArray(results) || results.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] font-semibold text-ink-mute">
        {count} نتيجة
        {count > results.length && ` (عرض ${results.length} فقط)`}
      </p>
      <div className="space-y-1.5">
        {results.slice(0, 5).map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <ResultItem item={item} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FinanceBlock({ data }) {
  const stats = data?.invoiceStats;
  if (!Array.isArray(stats)) return null;

  const paid = stats.find((s) => s.status === "paid");
  const draft = stats.find((s) => s.status === "draft");
  const partial = stats.find((s) => s.status === "partial");

  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {paid && (
        <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-emerald-700 font-semibold">مدفوع</p>
          <p className="text-sm font-bold text-emerald-800">{formatAmount(paid._sum?.totalPaid ?? 0)}</p>
          <p className="text-[10px] text-emerald-600">{paid._count?._all ?? 0} فاتورة</p>
        </div>
      )}
      {partial && (
        <div className="bg-orange-50 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-orange-700 font-semibold">جزئي</p>
          <p className="text-sm font-bold text-orange-800">{formatAmount(partial._sum?.balance ?? 0)}</p>
          <p className="text-[10px] text-orange-600">{partial._count?._all ?? 0} فاتورة</p>
        </div>
      )}
      {draft && (
        <div className="bg-yellow-50 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-yellow-700 font-semibold">معلق</p>
          <p className="text-sm font-bold text-yellow-800">{formatAmount(draft._sum?.balance ?? 0)}</p>
          <p className="text-[10px] text-yellow-600">{draft._count?._all ?? 0} فاتورة</p>
        </div>
      )}
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function InlineMD({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function SimpleMarkdown({ text }) {
  if (!text) return null;
  const lines = String(text).split("\n");
  const out = [];
  let listBuf = [];

  const flushList = (key) => {
    if (!listBuf.length) return;
    out.push(
      <ul key={key} className="list-disc list-inside space-y-0.5 my-1 text-sm">
        {listBuf.map((item, j) => (
          <li key={j} className="text-ink leading-relaxed">
            <InlineMD text={item} />
          </li>
        ))}
      </ul>
    );
    listBuf = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const isBullet = /^[-•*]\s+/.test(line);
    const isNumbered = /^\d+\.\s/.test(line);
    const content = isBullet
      ? line.replace(/^[-•*]\s+/, "")
      : isNumbered
      ? line.replace(/^\d+\.\s+/, "")
      : line;

    if (isBullet) {
      listBuf.push(content);
    } else if (isNumbered) {
      flushList(`list-${i}`);
      out.push(
        <p key={i} className="text-sm leading-relaxed text-ink ps-3">
          <InlineMD text={content} />
        </p>
      );
    } else if (line === "") {
      flushList(`list-${i}`);
      out.push(<div key={i} className="h-1" />);
    } else {
      flushList(`list-${i}`);
      out.push(
        <p key={i} className="text-sm leading-relaxed text-ink">
          <InlineMD text={line} />
        </p>
      );
    }
  });
  flushList("final");

  return <div className="space-y-0.5">{out}</div>;
}

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ msg, onChipClick }) {
  const isUser = msg.role === "user";
  const isError = msg.isError;

  const followUps = !isUser && !isError && !msg.streaming && msg.intent
    ? FOLLOW_UPS[msg.intent] ?? FOLLOW_UPS.general
    : [];

  const hasResults = msg.structured_data?.results_preview?.length > 0;
  const hasFinance = Array.isArray(msg.structured_data?.invoiceStats);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`max-w-[92%] rounded-2xl ${
          isUser
            ? "bg-primary text-white rounded-ee-sm px-3.5 py-2.5"
            : isError
            ? "bg-danger-soft/30 border border-danger/20 rounded-es-sm px-3.5 py-3"
            : "bg-surface-low border border-surface-high rounded-es-sm px-3.5 py-3"
        }`}
      >
        {/* Intent badge — assistant only */}
        {!isUser && !isError && msg.intent && (
          <div className="mb-2">
            <IntentBadge intent={msg.intent} />
          </div>
        )}

        {/* Error icon */}
        {isError && (
          <div className="flex items-center gap-2 mb-2 text-danger text-xs font-semibold">
            <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
            <span>حدث خطأ</span>
          </div>
        )}

        {/* Message text */}
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        ) : msg.streaming && !msg.content ? (
          <TypingDots />
        ) : (
          <SimpleMarkdown text={msg.content} />
        )}

        {/* Structured result cards */}
        {!msg.streaming && hasResults && <ResultsBlock data={msg.structured_data} />}
        {!msg.streaming && hasFinance && !hasResults && <FinanceBlock data={msg.structured_data} />}

        {/* Metadata row — assistant only */}
        {!isUser && !isError && msg.metadata && !msg.streaming && (
          <div className="mt-3 pt-2.5 border-t border-surface-high flex items-center justify-between gap-2">
            <span className="text-[10px] text-ink-mute">
              {msg.metadata.processing_time_ms != null
                ? `${Math.round(msg.metadata.processing_time_ms)} ms`
                : "—"}
              {" · "}
              {msg.metadata.model_used
                ? "vegacore AI"
                : "—"}
            </span>
            <CopyButton text={msg.content} disabled={msg.streaming} />
          </div>
        )}
      </div>

      {/* Follow-up chips */}
      {followUps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-w-[92%]">
          {followUps.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChipClick(chip)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-primary/30 text-primary bg-primary-soft/40 hover:bg-primary-soft hover:border-primary/60 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onChipClick, patientCtx }) {
  return (
    <div className="space-y-5 pt-2">
      {/* Hero */}
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-2xl bg-primary-soft grid place-items-center mx-auto mb-3">
          <SparklesIcon className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-ink">كيف يمكنني مساعدتك؟</h3>
        <p className="text-xs text-ink-mute mt-1 leading-relaxed">
          اسأل عن المواعيد، الفواتير، أو المرضى بالعربية أو الإنجليزية.
        </p>
      </div>

      {/* Patient context shortcut */}
      {patientCtx && (
        <button
          type="button"
          onClick={() => onChipClick("ملخص آخر زيارات هذا المريض")}
          className="w-full flex items-center gap-3 bg-primary-soft/30 border border-primary/20 rounded-xl px-3.5 py-3 text-start hover:bg-primary-soft/60 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-primary-soft grid place-items-center shrink-0">
            <UserCircleIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-primary">ملخص المريض الحالي</p>
            <p className="text-[11px] text-ink-mute">اضغط لعرض آخر زيارات وفواتير هذا المريض</p>
          </div>
          <PaperAirplaneIcon className="w-4 h-4 text-primary/50 ms-auto -rotate-45 group-hover:text-primary transition-colors" />
        </button>
      )}

      {/* Suggestion groups */}
      {SUGGESTION_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-5 h-5 rounded-md ${group.bg} grid place-items-center`}>
              <group.Icon className={`w-3.5 h-3.5 ${group.color}`} />
            </div>
            <span className="text-[11px] font-semibold text-ink-variant">{group.label}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.items.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onChipClick(chip)}
                className="text-xs px-3 py-1.5 rounded-full bg-surface-low border border-surface-high text-ink hover:border-primary/40 hover:text-primary hover:bg-primary-soft/30 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function CopilotPanel({ open, onClose, routePatientId }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const MAX_CHARS = 500;
  const charsLeft = MAX_CHARS - input.length;
  const charWarning = charsLeft < 60;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 180);
    }
  }, [open]);

  const send = useCallback(
    async (text) => {
      const trimmed = (text ?? input).trim();
      if (!trimmed || loading) return;
      setInput("");
      setMessages((m) => [
        ...m,
        { role: "user", content: trimmed },
        { role: "assistant", content: "", streaming: true },
      ]);
      setLoading(true);
      const body = {
        input: trimmed,
        ...(routePatientId ? { context: { patientId: routePatientId } } : {}),
      };

      try {
        let accumulated = "";
        let donePayload = null;

        for await (const ev of api.copilotAskStream(body)) {
          if (ev.type === "intent") {
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant" && last.streaming) {
                copy[copy.length - 1] = { ...last, intent: ev.intent };
              }
              return copy;
            });
          }
          if (ev.type === "chunk" && ev.text) {
            accumulated += ev.text;
            setMessages((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant" && last.streaming) {
                copy[copy.length - 1] = { ...last, content: accumulated };
              }
              return copy;
            });
          }
          if (ev.type === "done") {
            donePayload = ev;
          }
          if (ev.type === "error") {
            const err = new Error(ev.message || "");
            if (ev.code) err.code = ev.code;
            throw err;
          }
        }

        if (donePayload) {
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = {
              role: "assistant",
              content: (donePayload.response ?? accumulated) || "لم يتم الحصول على رد.",
              intent: donePayload.intent,
              tool_used: donePayload.tool_used,
              structured_data: donePayload.structured_data,
              metadata: donePayload.metadata,
              streaming: false,
            };
            return copy;
          });
        } else {
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            if (last?.streaming) {
              copy[copy.length - 1] = {
                ...last,
                content: accumulated || "لم يتم الحصول على رد.",
                streaming: false,
              };
            }
            return copy;
          });
        }
      } catch (streamErr) {
        try {
          const data = await api.copilotAsk(body);
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = {
              role: "assistant",
              content: data.response || "لم يتم الحصول على رد.",
              intent: data.intent,
              tool_used: data.tool_used,
              structured_data: data.structured_data,
              metadata: data.metadata,
              streaming: false,
            };
            return copy;
          });
        } catch (e) {
          const errMsg = formatUserFacingError(
            streamErr instanceof Error
              ? streamErr
              : e instanceof Error
                ? e
                : { message: String(streamErr || e || "") },
          );
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: errMsg, isError: true, streaming: false };
            return copy;
          });
        }
      } finally {
        setLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    },
    [input, loading, routePatientId]
  );

  const handleChipClick = useCallback(
    (chip) => {
      setInput(chip);
      send(chip);
    },
    [send]
  );

  const clearChat = () => setMessages([]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[140] bg-ink/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="copilot-title"
            className="fixed inset-y-0 start-0 z-[150] flex flex-col w-full max-w-[440px] bg-surface-base border-e border-surface-high shadow-pop"
            initial={{ x: "100%", opacity: 0.96 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
          >
            {/* ── Header ── */}
            <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-surface-high bg-surface-low/50">
              <div className="relative w-10 h-10 rounded-xl bg-primary-soft grid place-items-center text-primary shrink-0">
                <SparklesIcon className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-surface-base" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="copilot-title" className="text-sm font-bold text-ink">
                  مساعد MediFlow
                </h2>
                <p className="text-[11px] text-ink-mute">
                  قراءة فقط · لا يُنفّذ أي إجراء تلقائياً
                </p>
              </div>

              {messages.length > 0 && (
                <button
                  type="button"
                  className="btn-ghost h-8 w-8 p-0 rounded-lg shrink-0"
                  onClick={clearChat}
                  title="مسح المحادثة"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                className="btn-ghost h-8 w-8 p-0 rounded-lg shrink-0"
                onClick={onClose}
                title="إغلاق (Esc)"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </header>

            {/* Patient context banner */}
            <AnimatePresence>
              {routePatientId && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="shrink-0 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary-soft/20 border-b border-primary/15">
                    <UserCircleIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-[11px] font-semibold text-primary">
                      سياق المريض الحالي مفعّل
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Messages area ── */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <EmptyState onChipClick={handleChipClick} patientCtx={routePatientId} />
              ) : (
                messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} onChipClick={handleChipClick} />
                ))
              )}

              <div ref={bottomRef} />
            </div>

            {/* ── Footer ── */}
            <footer className="shrink-0 border-t border-surface-high p-3 bg-surface-low/30 space-y-2">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  maxLength={MAX_CHARS}
                  className="input flex-1 min-h-[44px] max-h-32 text-sm resize-none"
                  placeholder="اكتب سؤالك…"
                  value={input}
                  disabled={loading}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                    if (e.key === "Escape") onClose();
                  }}
                />
                <button
                  type="button"
                  className="btn-primary self-end h-10 w-10 p-0 shrink-0 rounded-xl disabled:opacity-40"
                  disabled={loading || !input.trim()}
                  onClick={() => send()}
                  title="إرسال (Enter)"
                >
                  <PaperAirplaneIcon className="w-4 h-4 mx-auto -rotate-45" />
                </button>
              </div>

              {/* Char counter + shortcut hint */}
              <div className="flex items-center justify-between px-0.5">
                <p className="text-[10px] text-ink-mute">
                  Enter للإرسال · Shift+Enter لسطر جديد
                </p>
                {input.length > 0 && (
                  <span className={`text-[10px] tabular-nums ${charWarning ? "text-orange-500 font-semibold" : "text-ink-mute"}`}>
                    {charsLeft}
                  </span>
                )}
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
