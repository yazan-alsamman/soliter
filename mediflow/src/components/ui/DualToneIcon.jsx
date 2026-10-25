export default function DualToneIcon({
  icon: Icon,
  className = "w-5 h-5",
  primaryClass = "text-primary",
  secondaryClass = "text-slate-400/70",
}) {
  if (!Icon) return null;

  return (
    <span className="relative inline-grid place-items-center">
      <Icon className={`${className} ${secondaryClass} absolute translate-x-0.5 -translate-y-0.5`} />
      <Icon className={`${className} ${primaryClass} relative`} />
    </span>
  );
}
