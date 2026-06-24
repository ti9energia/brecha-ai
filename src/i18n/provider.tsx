"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { type Locale } from "./config";
import { createTranslator, type Dict, type Translator } from "./translate";
import { makeFormatter, type Formatter } from "./format";

interface I18nContextValue {
  locale: Locale;
  messages: Dict;
  fmt: Formatter;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Dict;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({ locale, messages, fmt: makeFormatter(locale) }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

export function useTranslations(namespace?: string): Translator {
  const { messages } = useI18n();
  return useMemo(() => createTranslator(messages, namespace), [messages, namespace]);
}

export function useLocale(): Locale {
  return useI18n().locale;
}

export function useFormatter(): Formatter {
  return useI18n().fmt;
}
