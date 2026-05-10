import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SparklesIcon,
  ChevronDownIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";
import AiBookingCard from "./AiBookingCard.jsx";

const ROTATING_HINTS = [
  "موعد لراما الكاتب بوتوكس مع د. رامي الإثنين 4 العصر",
  "متابعة لسلمى السبت الساعة 11 صباحاً مع د. هدى",
  "تنظيف أسنان للمريض أحمد غداً 3 ظهراً",
];

export default function AiBookingBar({ calendarWeekStart, doctors, patients }) {
  const [open, setOpen] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const triggerRef = useRef(null);

  // Rotate placeholder hints when collapsed (premium feel — not flashy)
  useEffect(() => {
    if (open) return;
    const id = setInterval(() => setHintIdx((i) => (i + 1) % ROTATING_HINTS.length), 4200);
    return () => clearInterval(id);
  }, [open]);

  // Keyboard: Ctrl+/ opens the bar
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => {
          const ta = document.getElementById("ai-booking-input");
          if (ta) ta.focus();
        }, 200);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="border-b border-ink-line/40 bg-surface-dim/30 shrink-0">
      <div className="px-4 max-w-5xl mx-auto">
        {/* Slim trigger row */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="ai-booking-panel"
          className={`group w-full flex items-center gap-3 py-2.5 text-start transition-colors ${
            open ? "" : "hover:opacity-90"
          }`}
        >
          <motion.span
            animate={open ? { rotate: 0, scale: 1.02 } : { rotate: 0, scale: 1 }}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 grid place-items-center text-white shrink-0 shadow-sm"
          >
            <SparklesIcon className="w-4 h-4" />
          </motion.span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-ink-default truncate">
                الحجز الذكي بالذكاء الاصطناعي
              </span>
              {!open && (
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-ink-mute font-mono">
                  <CommandLineIcon className="w-3 h-3" /> Ctrl + /
                </span>
              )}
            </div>
            <AnimatePresence mode="wait">
              {!open && (
                <motion.p
                  key={hintIdx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.28 }}
                  className="text-[11px] text-ink-mute truncate leading-tight mt-0.5"
                >
                  «{ROTATING_HINTS[hintIdx]}»
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <span
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              open
                ? "bg-primary text-white shadow-focus"
                : "bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white"
            }`}
          >
            {open ? "إخفاء" : "افتح المساعد"}
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            className="text-ink-mute"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </motion.span>
        </button>

        {/* Expanded full card */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="ai-booking-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pb-3 pt-1">
                <AiBookingCard
                  calendarWeekStart={calendarWeekStart}
                  doctors={doctors}
                  patients={patients}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
