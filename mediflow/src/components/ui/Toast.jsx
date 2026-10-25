import { AnimatePresence, motion } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

export default function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] bg-white dark-glass-panel border border-secondary/30 shadow-pop rounded-full px-4 py-2.5 flex items-center gap-2.5"
        >
          <CheckCircleIcon className="w-5 h-5 text-secondary" />
          <span className="text-sm font-semibold text-ink">{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
