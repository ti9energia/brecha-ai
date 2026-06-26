// Intl formatters — never format money/dates by hand (00-PADRAO §6.3).
import { localeMeta, type Locale } from "./config";

export function makeFormatter(locale: Locale) {
  const intl = localeMeta[locale].intl;

  return {
    /** Currency. Os valores do produto são em BRL (plataforma fiscal brasileira) —
     *  a moeda dos DADOS é independente do locale de exibição. Default BRL; passe
     *  `currency` só quando o registro tiver moeda própria. */
    money(value: number, currency: string = "BRL", opts?: Intl.NumberFormatOptions) {
      return new Intl.NumberFormat(intl, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
        ...opts,
      }).format(value);
    },
    /** Compact money for big headline numbers: R$ 2,4 mi */
    moneyCompact(value: number, currency: string = "BRL") {
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
      // Datas "só-data" (ex.: "2026-07-01") são meia-noite UTC; sem timeZone fixo o
      // Intl usa o fuso do runtime e, a oeste de UTC (Brasil, UTC-3), exibe o dia
      // anterior — e diverge entre SSR e cliente (hydration mismatch). Fixar UTC
      // torna determinístico e correto para prazos/vigências.
      const base = opts ?? { day: "2-digit", month: "short", year: "numeric" };
      return new Intl.DateTimeFormat(intl, { timeZone: "UTC", ...base }).format(d);
    },
    /** "em 14 dias" / "in 14 days" */
    relativeDays(days: number) {
      return new Intl.RelativeTimeFormat(intl, { numeric: "auto", style: "long" }).format(days, "day");
    },
  };
}

export type Formatter = ReturnType<typeof makeFormatter>;
