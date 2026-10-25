import { motion } from "framer-motion";
import DualToneIcon from "./DualToneIcon.jsx";

export default function StatCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  tone = "primary",
  index = 0,
}) {
  const toneMap = {
    primary: {
      bg: "bg-primary/10",
      text: "text-primary",
      delta: "text-primary",
    },
    success: {
      bg: "bg-success-soft",
      text: "text-success",
      delta: "text-success",
    },
    warn: {
      bg: "bg-warn-soft",
      text: "text-warn",
      delta: "text-warn",
    },
    danger: {
      bg: "bg-danger-soft",
      text: "text-danger",
      delta: "text-danger",
    },
    pulse: {
      bg: "bg-pulse-soft",
      text: "text-primary",
      delta: "text-primary",
    },
  };

  const t = toneMap[tone] || toneMap.primary;
  const isPositiveDelta = delta && !delta.startsWith("-");
  const deltaColor = isPositiveDelta ? "text-success" : "text-danger";

  return (
    <motion.div
      className="card-pad flex items-start gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.32, ease: "easeOut" }}
    >
      {Icon && (
        <div
          className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${t.bg} ${t.text}`}
        >
          <DualToneIcon
            icon={Icon}
            className="w-5 h-5"
            primaryClass={t.text}
            secondaryClass="text-ink-mute/70"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="label-caps">{label}</div>
        <motion.div
          className="mt-1 flex items-baseline gap-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 + 0.1, duration: 0.3 }}
        >
          <div className="font-display font-bold text-2xl text-ink leading-none">
            {value}
          </div>
          {delta && (
            <span className={`text-xs font-semibold ${deltaColor}`}>{delta}</span>
          )}
        </motion.div>
        {hint && <div className="mt-1 text-xs text-ink-mute leading-tight">{hint}</div>}
      </div>
    </motion.div>
  );
}
