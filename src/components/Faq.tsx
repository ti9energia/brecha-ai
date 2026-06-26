"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/ui/cn";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-[color:var(--border)] border-y border-line">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              id={`faq-q-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-6 py-5 text-left group"
              aria-expanded={isOpen}
              aria-controls={`faq-a-${i}`}
            >
              <span className={cn("font-display text-base md:text-lg transition-colors", isOpen ? "text-brand" : "text-ink group-hover:text-ink")}>
                {item.q}
              </span>
              <span className={cn("grid place-items-center size-8 rounded-full border border-line shrink-0 transition-all duration-300", isOpen && "rotate-45 border-line-gold text-brand")}>
                <Plus size={16} />
              </span>
            </button>
            <div
              className="grid transition-all duration-400 ease-[var(--ease-out-expo)]"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} className="pb-6 pr-14 text-ink-3 text-pretty leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
