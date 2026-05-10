import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

const DISMISSED_KEY = 'mediflow_pwa_banner_dismissed';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible,        setVisible]        = useState(false);
  const [isIos,          setIsIos]          = useState(false);
  const [installed,      setInstalled]      = useState(false);

  useEffect(() => {
    /* Check if already dismissed or installed */
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    /* Check if running as standalone (already installed) */
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setInstalled(true);
      return;
    }

    /* iOS detection (Safari doesn't fire beforeinstallprompt) */
    const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    if (isIosDevice) {
      setIsIos(true);
      setTimeout(() => setVisible(true), 3000);
      return;
    }

    /* Chrome / Android — wait for beforeinstallprompt */
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setVisible(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    /* Detect successful install */
    const installedHandler = () => setInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, '1');
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (installed || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-20 inset-x-3 z-[200] md:max-w-sm md:right-4 md:left-auto md:bottom-4"
      >
        <div className="bg-[#0e7490] rounded-2xl shadow-pop p-4 text-white relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl" />

          <button
            onClick={dismiss}
            className="absolute top-3 left-3 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 pr-1">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <DevicePhoneMobileIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="font-bold text-[13px] leading-tight">أضف MediFlow للشاشة الرئيسية</p>
              <p className="text-[11px] text-white/80 mt-0.5 leading-snug">
                {isIos
                  ? 'اضغط على زر المشاركة ← ثم «إضافة للشاشة الرئيسية»'
                  : 'ثبّت التطبيق للوصول السريع إلى مواعيدك وإشعاراتك'}
              </p>
            </div>
          </div>

          {!isIos && deferredPrompt && (
            <button
              onClick={install}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-[#0e7490] font-bold text-[12px] hover:bg-white/90 transition-colors active:scale-95"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              تثبيت التطبيق
            </button>
          )}

          {isIos && (
            <div className="mt-3 flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <span className="text-[11px] text-white/90 leading-snug">
                اضغط{' '}
                <span className="inline-block text-base leading-none align-middle">⬆</span>
                {' '}ثم اختر «إضافة إلى الشاشة الرئيسية»
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
