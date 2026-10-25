import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function CommandPalette({ open, actions, onClose, onAction }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((action) =>
      `${action.label} ${action.group || ""} ${action.keywords || ""}`.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  const safeActiveIndex = Math.min(activeIndex, Math.max(filteredActions.length - 1, 0));

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(filteredActions.length - 1, 0)));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const selected = filteredActions[safeActiveIndex];
        if (selected) onAction(selected);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredActions, onAction, onClose, open, safeActiveIndex]);

  const grouped = useMemo(() => {
    return filteredActions.reduce((acc, action, idx) => {
      const key = action.group || "عام";
      if (!acc[key]) acc[key] = [];
      acc[key].push({ ...action, idx });
      return acc;
    }, {});
  }, [filteredActions]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] bg-ink/30 backdrop-blur-sm p-4 grid place-items-start pt-[10vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl card-modal p-0 overflow-hidden"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-surface-high bg-surface-low/50">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                className="input h-10 bg-surface-base"
                placeholder="اكتب أمراً: إضافة موعد، فتح المرضى، الفوترة..."
              />
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2 space-y-2">
              {filteredActions.length === 0 && (
                <div className="px-3 py-5 text-sm text-ink-mute text-center">لا توجد أوامر مطابقة.</div>
              )}
              {Object.entries(grouped).map(([group, groupActions]) => (
                <div key={group}>
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
                    {group}
                  </div>
                  <div className="space-y-1">
                    {groupActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => onAction(action)}
                        className={`w-full rounded-xl px-3 py-2 text-start transition-colors ${
                          action.idx === safeActiveIndex
                            ? "bg-primary-soft/60 text-primary"
                            : "hover:bg-surface-low text-ink"
                        }`}
                      >
                        <div className="text-sm font-semibold">{action.label}</div>
                        {action.description && (
                          <div className="text-xs text-ink-mute mt-0.5">{action.description}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-surface-high text-[11px] text-ink-mute flex items-center justify-between">
              <span>Enter للتنفيذ · Esc للإغلاق</span>
              <span>⌘K / Ctrl+K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
