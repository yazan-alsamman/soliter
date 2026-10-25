import { Link } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

export default function NotAllowed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[60vh] grid place-items-center"
    >
      <div className="card-pad text-center max-w-md">
        <div className="w-14 h-14 rounded-full bg-primary-soft text-primary grid place-items-center mx-auto">
          <LockClosedIcon className="w-7 h-7" />
        </div>
        <h2 className="h2 mt-4">منطقة محظورة</h2>
        <p className="text-ink-variant mt-2">
          صلاحياتك لا تسمح بالوصول إلى هذا القسم. يرجى التحول إلى دور بصلاحيات مناسبة
          أو التواصل مع المدير.
        </p>
        <Link to="/dashboard" className="btn-primary mt-6">
          العودة إلى الرئيسية
        </Link>
      </div>
    </motion.div>
  );
}
