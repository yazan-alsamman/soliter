/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const AppDialogContext = createContext(null);

export function AppDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const closeDialog = useCallback((result) => {
    if (!dialog) return;
    dialog.resolve(result);
    setDialog(null);
  }, [dialog]);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        type: "confirm",
        title: options?.title || "تأكيد الإجراء",
        message: options?.message || "",
        confirmText: options?.confirmText || "تأكيد",
        cancelText: options?.cancelText || "إلغاء",
        tone: options?.tone || "primary",
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        type: "alert",
        title: options?.title || "تنبيه",
        message: options?.message || "",
        confirmText: options?.confirmText || "حسناً",
        tone: options?.tone || "primary",
        resolve,
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);
  const confirmBtnClass =
    dialog?.tone === "danger" ? "btn-danger" : dialog?.tone === "warn" ? "btn-secondary" : "btn-primary";

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {dialog && (
          <motion.div
            className="fixed inset-0 z-[90] bg-ink/30 backdrop-blur-sm grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (dialog.type === "confirm") closeDialog(false);
            }}
          >
            <motion.div
              className="card-modal w-full max-w-md p-6"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="h3">{dialog.title}</h3>
              {dialog.message && <p className="text-sm text-ink-variant mt-2 leading-relaxed">{dialog.message}</p>}
              <div className="flex justify-end gap-2 mt-5">
                {dialog.type === "confirm" && (
                  <button className="btn-ghost" onClick={() => closeDialog(false)}>
                    {dialog.cancelText}
                  </button>
                )}
                <button className={confirmBtnClass} onClick={() => closeDialog(true)}>
                  {dialog.confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(AppDialogContext);
  if (!context) throw new Error("useAppDialog must be used within AppDialogProvider");
  return context;
}
