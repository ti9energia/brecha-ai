import { getDictionary } from "./dictionary";
import { createTranslator } from "./translate";
import { makeFormatter } from "./format";
import type { Locale } from "./config";

// Tradutor/formatador para Server Components (o hook useTranslations é client).
export function getT(locale: Locale, namespace?: string) {
  return createTranslator(getDictionary(locale), namespace);
}

export function getFmt(locale: Locale) {
  return makeFormatter(locale);
}
