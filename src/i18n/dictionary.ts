// Server-side dictionary loader. Applies the fallback chain (00-PADRAO §6.6)
// and produces a single merged catalog per locale, passed to the client provider.

import { fallbackChain, type Locale } from "./config";
import ptBR from "./messages/pt-BR";
import en from "./messages/en";
import zhCN from "./messages/zh-CN";
import frFR from "./messages/fr-FR";
import { deepMerge, type Dict } from "./translate";

const catalogs: Record<Locale, Dict> = {
  "pt-BR": ptBR as Dict,
  en: en as Dict,
  "zh-CN": zhCN as Dict,
  "fr-FR": frFR as Dict,
};

const cache = new Map<Locale, Dict>();

export function getDictionary(locale: Locale): Dict {
  const cached = cache.get(locale);
  if (cached) return cached;

  // fallbackChain is ordered most→least specific; deepMerge wants least→most,
  // so we reverse and let the locale itself win.
  const order = [...fallbackChain[locale]].reverse().map((l) => catalogs[l]);
  const merged = deepMerge(...order);
  cache.set(locale, merged);
  return merged;
}
