import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiIcon } from "@heroicons/react/24/outline";

/**
 * Mounts a top-of-screen banner when the browser reports no network connection.
 * Uses the standard navigator.onLine + window events — no external dependencies.
 * Disappears automatically when connectivity is restored.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{ y: -48,    opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 bg-warn text-white text-xs font-semibold py-2 px-4 shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <WifiIcon className="w-4 h-4 shrink-0" />
          <span>لا يوجد اتصال بالإنترنت — البيانات المعروضة قد لا تكون محدّثة</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
