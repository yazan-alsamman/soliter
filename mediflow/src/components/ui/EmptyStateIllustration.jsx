export default function EmptyStateIllustration({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-6">
      <svg width="160" height="116" viewBox="0 0 160 116" fill="none" aria-hidden="true">
        <rect x="20" y="24" width="120" height="76" rx="14" fill="#e8f6fb" />
        <rect x="34" y="40" width="92" height="10" rx="5" fill="#b9e8f2" />
        <rect x="34" y="58" width="70" height="8" rx="4" fill="#cceef5" />
        <rect x="34" y="72" width="82" height="8" rx="4" fill="#cceef5" />
        <circle cx="120" cy="18" r="12" fill="#d9f4ea" />
        <path d="M114 18h12M120 12v12" stroke="#0e9f6e" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <h3 className="text-sm font-semibold text-ink mt-1">{title}</h3>
      {subtitle ? <p className="text-xs text-ink-mute mt-1">{subtitle}</p> : null}
    </div>
  );
}
