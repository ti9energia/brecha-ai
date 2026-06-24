// Intl formatters — never format money/dates by hand (00-PADRAO §6.3).
import { localeMeta, type Locale } from "./config";

export function makeFormatter(locale: Locale) {
  const intl = localeMeta[locale].intl;
  const orgCurrency = localeMeta[locale].currency;

  return {
    /** Currency. `currency` defaults to the locale's currency, but the DATA's
     *  currency (e.g. BRL) is independent of the display locale. */
    money(value: number, currency: string = orgCurrency, opts?: Intl.NumberFormatOptions) {
      return new Intl.NumberFormat(intl, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
        ...opts,
      }).format(value);
    },
    /** Compact money for big headline numbers: R$ 2,4 mi */
    moneyCompact(value: number, currency: string = orgCurrency) {
      return new Intl.NumberFormat(intl, {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    },
    number(value: number, opts?: Intl.NumberFormatOptions) {
      return new Intl.NumberFormat(intl, opts).format(value);
    },
    percent(value: number, opts?: Intl.NumberFormatOptions) {
      return new Intl.NumberFormat(intl, {
        style: "percent",
        maximumFractionDigits: 1,
        ...opts,
      }).format(value);
    },
    date(value: Date | string | number, opts?: Intl.DateTimeFormatOptions) {
      const d = value instanceof Date ? value : new Date(value);
      return new Intl.DateTimeFormat(intl, opts ?? { day: "2-digit", month: "short", year: "numeric" }).format(d);
    },
    /** "em 14 dias" / "in 14 days" */
    relativeDays(days: number) {
      return new Intl.RelativeTimeFormat(intl, { numeric: "auto", style: "long" }).format(days, "day");
    },
  };
}

export type Formatter = ReturnType<typeof makeFormatter>;
