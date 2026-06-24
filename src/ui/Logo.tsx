import { cn } from "./cn";

// A marca "Abertura": um anel (a janela regulatória) com uma fenda de luz —
// a brecha — por onde escapa a faísca (a oportunidade detectada).
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  const id = "brecha-gold";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-deep)" />
          <stop offset="0.5" stopColor="var(--brand-bright)" />
          <stop offset="1" stopColor="var(--brand-deep)" />
        </linearGradient>
      </defs>
      {/* anel externo com a fenda (a brecha) — aberto no canto superior direito */}
      <circle
        cx="24"
        cy="24"
        r="17"
        stroke={`url(#${id})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeDasharray="80 107"
        transform="rotate(-58 24 24)"
      />
      {/* anel interno fino */}
      <circle cx="24" cy="24" r="9.5" stroke="var(--brand)" strokeOpacity="0.35" strokeWidth="1.4" />
      {/* a faísca que escapa pela fenda */}
      <circle cx="36.5" cy="11.5" r="3.1" fill="var(--brand-bright)" />
      <circle cx="36.5" cy="11.5" r="3.1" fill="var(--brand-bright)" opacity="0.4" className="animate-[pulse-ring_3.2s_ease-out_infinite]" />
    </svg>
  );
}

export function Logo({
  size = 28,
  className,
  hideWordmark = false,
}: {
  size?: number;
  className?: string;
  hideWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark size={size} />
      {!hideWordmark && (
        <span className="font-display font-semibold tracking-tight text-ink text-[1.05rem]">
          Brecha<span className="text-brand">.ai</span>
        </span>
      )}
    </span>
  );
}
