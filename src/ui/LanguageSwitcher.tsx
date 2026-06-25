"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { locales, localeMeta, isLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/provider";
import { cn } from "./cn";

export function LanguageSwitcher({ align = "right" }: { align?: "left" | "right" }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function switchTo(next: string) {
    const parts = pathname.split("/");
    if (isLocale(parts[1])) parts[1] = next;
    else parts.splice(1, 0, next);
    const target = parts.join("/") || `/${next}`;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setOpen(false);
    router.push(target);
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-[var(--radius-md)] border border-line bg-surface-2 text-ink-2 hover:text-ink hover:border-line-strong transition-colors text-sm"
        aria-label="Idioma"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={15} />
        <span className="hidden sm:inline">{localeMeta[locale].flag}</span>
        <span className="hidden md:inline text-xs uppercase tracking-wide">{locale.split("-")[0]}</span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Idioma"
          className={cn(
            "absolute z-50 mt-2 w-52 glass rounded-[var(--radius-md)] p-1.5 shadow-[var(--shadow-lg)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {locales.map((l) => (
            <button
              key={l}
              role="option"
              aria-selected={l === locale}
              onClick={() => switchTo(l)}
              className={cn(
                "w-full flex items-center gap-3 px-2.5 py-2 rounded-[var(--radius-sm)] text-sm text-ink-2 hover:bg-surface-3 hover:text-ink transition-colors",
                l === locale && "text-ink",
              )}
            >
              <span className="text-base">{localeMeta[l].flag}</span>
              <span className="flex-1 text-left">{localeMeta[l].native}</span>
              {l === locale && <Check size={15} className="text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
