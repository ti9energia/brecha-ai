"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/ui/Logo";
import { ThemeToggle } from "@/ui/ThemeToggle";
import { LanguageSwitcher } from "@/ui/LanguageSwitcher";
import { buttonClass } from "@/ui/primitives";
import { useTranslations, useLocale } from "@/i18n/provider";
import { cn } from "@/ui/cn";

export function SiteHeader() {
  const t = useTranslations("landing.nav");
  const locale = useLocale();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Âncoras absolutas por locale: o header também é exibido fora da home (ex.: página
  // legal), onde "#how" não existe — "/{locale}#how" navega para a home e rola.
  const links = [
    { href: `/${locale}#how`, label: t("how") },
    { href: `/${locale}#sectors`, label: t("sectors") },
    { href: `/${locale}#pricing`, label: t("pricing") },
  ];

  return (
    <header className={cn("fixed top-0 inset-x-0 z-50 transition-all duration-300", scrolled && "py-1")}>
      <div
        className={cn(
          "mx-auto max-w-7xl px-4 sm:px-6 transition-all duration-300",
          scrolled ? "mt-2" : "mt-3",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between h-14 px-3 sm:px-4 rounded-[var(--radius-lg)] transition-all duration-300",
            scrolled ? "glass shadow-[var(--shadow-md)]" : "border border-transparent",
          )}
        >
          <Link href={`/${locale}`} className="flex items-center">
            <Logo />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-2 text-sm text-ink-2 hover:text-ink transition-colors rounded-[var(--radius-sm)]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle className="hidden sm:grid" />
            <Link href={`/${locale}/login`} className="hidden sm:inline-flex text-sm text-ink-2 hover:text-ink transition-colors px-3 py-2">
              {t("login")}
            </Link>
            <Link href={`/${locale}/login`} className={buttonClass("primary", "sm", "group")}>
              {t("cta")}
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
