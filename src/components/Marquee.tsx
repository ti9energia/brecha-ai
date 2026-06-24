import { cn } from "@/ui/cn";

// Faixa rolante de fontes oficiais — sem JS (CSS puro), duplicada p/ loop contínuo.
export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = [...items, ...items];
  return (
    <div className={cn("relative overflow-hidden", className)} aria-hidden>
      <div
        className="flex w-max gap-10 animate-[marquee_38s_linear_infinite] hover:[animation-play-state:paused]"
        style={{ maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}
      >
        {row.map((it, i) => (
          <span key={i} className="mono text-xs uppercase tracking-[0.18em] text-ink-4 whitespace-nowrap flex items-center gap-10">
            {it}
            <span className="size-1 rounded-full bg-brand/50" />
          </span>
        ))}
      </div>
    </div>
  );
}
