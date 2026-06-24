import Link from "next/link";
import { ArrowLeft, Radar } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { Logo, Mark } from "@/ui/Logo";
import { ThemeToggle } from "@/ui/ThemeToggle";
import { LanguageSwitcher } from "@/ui/LanguageSwitcher";
import { getT } from "@/i18n/server";
import { resolveLocale } from "@/i18n/config";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = getT(locale, "auth");
  const tc = getT(locale, "common");

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      {/* ── Painel de marca ── */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-line bg-[var(--canvas-deep)]">
        <div className="aurora" />
        <div className="radar-sweep opacity-40" />
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40" />

        <div className="relative">
          <Link href={`/${locale}`} className="inline-flex">
            <Logo size={32} />
          </Link>
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 chip" style={{ borderColor: "var(--border-gold)" }}>
            <span className="relative grid place-items-center size-4">
              <Radar size={13} className="text-brand" />
            </span>
            <span className="text-brand">{t("secure")}</span>
          </span>
          <h2 className="mt-6 font-display font-bold text-4xl text-ink text-balance leading-[1.05]">
            {t("brandHeadline")}
          </h2>
          <p className="mt-5 text-ink-2 text-lg text-pretty">{t("brandSub")}</p>

          <div className="mt-10 flex items-center gap-6">
            <Stat value="1.247" label={tc("source") + "s"} />
            <span className="h-10 w-px bg-[color:var(--border)]" />
            <Stat value="R$ 4,8 bi" label="janelas/ano" />
            <span className="h-10 w-px bg-[color:var(--border)]" />
            <Stat value="312 min" label="norma → alerta" />
          </div>
        </div>

        <p className="relative mono text-xs text-ink-4">© 2026 Brecha.ai · São Paulo / SP</p>
      </aside>

      {/* ── Formulário ── */}
      <main className="relative flex flex-col">
        <header className="flex items-center justify-between p-5 sm:p-6">
          <Link href={`/${locale}`} className="lg:hidden">
            <Logo />
          </Link>
          <Link href={`/${locale}`} className="hidden lg:inline-flex items-center gap-2 text-sm text-ink-3 hover:text-ink transition-colors">
            <ArrowLeft size={15} /> {tc("back")}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 grid place-items-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <div className="lg:hidden mb-8 flex justify-center">
              <Mark size={44} />
            </div>
            <h1 className="font-display font-bold text-3xl text-ink">{t("title")}</h1>
            <p className="mt-2 text-ink-3">{t("subtitle")}</p>
            <div className="mt-8">
              <LoginForm />
            </div>
            <p className="mt-8 text-center text-xs text-ink-4 text-pretty max-w-xs mx-auto">{t("terms")}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display font-bold text-xl text-ink tnum">{value}</p>
      <p className="mono text-[0.65rem] text-ink-4 mt-0.5">{label}</p>
    </div>
  );
}
