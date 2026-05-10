const TONES = {
  active: "bg-secondary-soft text-secondary",
  ok: "bg-secondary-soft text-secondary",
  paid: "bg-secondary-soft text-secondary",
  new: "bg-primary-soft text-primary",
  inactive: "bg-surface-mid text-ink-mute",
  pending: "bg-warn-soft text-warn",
  due: "bg-warn-soft text-warn",
  draft: "bg-warn-soft text-warn",
  unpaid: "bg-warn-soft text-warn",
  low: "bg-warn-soft text-warn",
  partial: "bg-primary-soft text-primary",
  today: "bg-primary-soft text-primary",
  critical: "bg-danger-soft text-danger",
  overdue: "bg-danger-soft text-danger",
  overload: "bg-danger-soft text-danger",
  "on-shift": "bg-secondary-soft text-secondary",
  "off-shift": "bg-surface-mid text-ink-mute",
};

export default function Chip({ tone = "ok", children }) {
  return (
    <span className={`chip ${TONES[tone] || TONES.ok}`}>
      {children}
    </span>
  );
}
