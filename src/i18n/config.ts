// ─────────────────────────────────────────────────────────────────────────────
// i18n — os 4 idiomas obrigatórios (00-PADRAO §6). pt-BR é a fonte da verdade.
// Cadeia de fallback em runtime: <locale> → en → pt-BR.
// ─────────────────────────────────────────────────────────────────────────────

export const locales = ["pt-BR", "en", "zh-CN", "fr-FR"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-BR";

export const localeMeta: Record<
  Locale,
  { label: string; native: string; flag: string; currency: string; intl: string }
> = {
  "pt-BR": { label: "Português", native: "Português (BR)", flag: "🇧🇷", currency: "BRL", intl: "pt-BR" },
  en: { label: "English", native: "English", flag: "🇺🇸", currency: "USD", intl: "en-US" },
  "zh-CN": { label: "中文", native: "简体中文", flag: "🇨🇳", currency: "CNY", intl: "zh-CN" },
  "fr-FR": { label: "Français", native: "Français", flag: "🇫🇷", currency: "EUR", intl: "fr-FR" },
};

export const fallbackChain: Record<Locale, Locale[]> = {
  "pt-BR": ["pt-BR"],
  en: ["en", "pt-BR"],
  "zh-CN": ["zh-CN", "en", "pt-BR"],
  "fr-FR": ["fr-FR", "en", "pt-BR"],
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : defaultLocale;
}
