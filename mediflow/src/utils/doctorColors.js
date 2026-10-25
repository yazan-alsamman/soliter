/**
 * Stable per-doctor colors for calendar cards, filters, and forms.
 * Uses a hash of doctor id so legend + events always match.
 */
export const DOCTOR_COLOR_KEYS = ["blue", "green", "purple", "orange", "mint", "coral"];

export const COLOR_MAP = {
  blue: {
    bar: "bg-primary",
    bg: "bg-primary-soft/60",
    text: "text-primary",
    border: "border-primary/30",
  },
  green: {
    bar: "bg-secondary",
    bg: "bg-secondary-soft/60",
    text: "text-secondary",
    border: "border-secondary/30",
  },
  red: {
    bar: "bg-danger",
    bg: "bg-danger-soft",
    text: "text-danger",
    border: "border-danger/30",
  },
  purple: {
    bar: "bg-tertiary",
    bg: "bg-tertiary-soft/50",
    text: "text-tertiary",
    border: "border-tertiary/35",
  },
  orange: {
    bar: "bg-warn",
    bg: "bg-warn-soft/45",
    text: "text-warn",
    border: "border-warn/35",
  },
  mint: {
    bar: "bg-success",
    bg: "bg-success-soft",
    text: "text-success",
    border: "border-success/35",
  },
  coral: {
    bar: "bg-pulse",
    bg: "bg-pulse-soft",
    text: "text-pulse",
    border: "border-pulse/35",
  },
};

/** @returns {keyof typeof COLOR_MAP} */
export function colorFromDoctorId(doctorId) {
  if (!doctorId) return "blue";
  const seed = String(doctorId)
    .split("")
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return DOCTOR_COLOR_KEYS[seed % DOCTOR_COLOR_KEYS.length];
}
