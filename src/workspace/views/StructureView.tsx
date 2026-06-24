"use client";

import type { ReactNode } from "react";
import {
  Building2, Pencil, MapPin, Users, Receipt, Landmark, CalendarClock,
} from "lucide-react";
import { getStructure } from "@/server/domain/store";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { ApertureRing } from "@/ui/ApertureRing";
import { Button, Chip } from "@/ui/primitives";
import { ViewScroll, ViewHeader, Section } from "./shared";

export function StructureView() {
  const t = useTranslations("structure");
  const tc = useTranslations("common");
  const fmt = useFormatter();
  const s = getStructure();

  return (
    <ViewScroll>
      <ViewHeader
        icon={<Building2 size={20} />}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button variant="secondary" size="sm">
            <Pencil size={14} /> {t("edit")}
          </Button>
        }
      />

      {/* identidade fiscal/jurídica + completude */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {/* esquerda: ficha de identidade */}
        <div className="lg:col-span-2 panel hairline p-6">
          <p className="eyebrow mb-5">{t("title")}</p>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
            <Field icon={<Landmark size={13} />} label={t("legalName")}>
              <span className="text-ink font-medium">{s.legalName}</span>
            </Field>
            <Field icon={<Receipt size={13} />} label={t("taxId")}>
              <span className="mono text-ink tnum">{s.taxId}</span>
            </Field>
            <Field label={t("regime")}>
              <Chip tone="gold">{s.regime}</Chip>
            </Field>
            <Field icon={<MapPin size={13} />} label={t("headquarters")}>
              <span className="text-ink">{s.headquarters}</span>
            </Field>
            <Field label={t("mainActivity")} className="sm:col-span-2">
              <span className="text-ink text-pretty">{s.mainActivity}</span>
              <span className="mono text-xs text-ink-4 tnum">CNAE {s.mainCnae}</span>
            </Field>
            <Field label={t("revenue")}>
              <span className="font-display text-xl text-brand tnum leading-none">
                {fmt.money(s.annualRevenue)}
              </span>
              <span className="mono text-[0.66rem] text-ink-4">{tc("perYear")}</span>
            </Field>
            <Field icon={<Users size={13} />} label={t("headcount")}>
              <span className="font-display text-xl text-ink tnum leading-none">
                {fmt.number(s.headcount)}
              </span>
            </Field>
          </dl>
        </div>

        {/* direita: completude do perfil */}
        <div className="panel hairline p-6 flex flex-col items-center text-center">
          <ApertureRing
            value={s.completeness}
            size={132}
            center={
              <span className="block text-3xl font-bold text-ink tnum leading-none">
                {fmt.percent(s.completeness)}
              </span>
            }
            label={t("completeness")}
          />
          <p className="mt-5 text-sm text-ink-3 text-pretty max-w-[16rem]">{t("completenessHint")}</p>
          <div className="mt-5 pt-5 w-full border-t border-line flex items-center justify-center gap-1.5 text-xs text-ink-4">
            <CalendarClock size={13} className="text-ink-4" />
            <span>{t("lastReview")}</span>
            <span className="mono text-ink-3 tnum">{fmt.date(s.lastReview)}</span>
          </div>
        </div>
      </div>

      {/* atividades (CNAE) */}
      <Section title={t("activities")}>
        <div className="panel hairline overflow-hidden">
          <ul>
            {s.activities.map((a, i) => (
              <li
                key={a.code}
                className={
                  "flex items-center gap-4 px-5 py-3.5" +
                  (i > 0 ? " border-t border-line" : "")
                }
              >
                <span className="mono text-xs text-brand tnum shrink-0 rounded-[var(--radius-sm)] border border-line-gold bg-[var(--brand-soft)] px-2 py-1">
                  {a.code}
                </span>
                <span className="text-sm text-ink-2 text-pretty">{a.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* jurisdições */}
      <Section
        title={t("jurisdictions")}
        actions={
          <Button variant="ghost" size="sm">+ {t("addJurisdiction")}</Button>
        }
      >
        <div className="flex flex-wrap gap-2.5">
          {s.jurisdictions.map((uf) => (
            <span
              key={uf}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full border border-line-gold bg-[var(--brand-soft)] text-brand"
            >
              <MapPin size={13} />
              <span className="mono text-sm tracking-wide">{uf}</span>
            </span>
          ))}
        </div>
      </Section>

      {/* entidades do grupo */}
      <Section title={t("entities")}>
        <div className="panel hairline overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-line">
                  <th className="eyebrow font-normal px-5 py-3">{t("legalName")}</th>
                  <th className="eyebrow font-normal px-5 py-3">{t("taxId")}</th>
                  <th className="eyebrow font-normal px-5 py-3">{t("regime")}</th>
                  <th className="eyebrow font-normal px-5 py-3 text-right">UF</th>
                </tr>
              </thead>
              <tbody>
                {s.entities.map((e, i) => (
                  <tr
                    key={e.cnpj}
                    className={
                      "transition-colors hover:bg-surface-2/60" +
                      (i > 0 ? " border-t border-line" : "")
                    }
                  >
                    <td className="px-5 py-3.5 text-sm text-ink font-medium">{e.name}</td>
                    <td className="px-5 py-3.5 mono text-xs text-ink-3 tnum whitespace-nowrap">{e.cnpj}</td>
                    <td className="px-5 py-3.5">
                      <Chip tone={e.regime === "Lucro Real" ? "gold" : "neutral"}>{e.regime}</Chip>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="mono text-sm text-ink-2 tracking-wide">{e.uf}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </ViewScroll>
  );
}

// Linha de definição: rótulo discreto em eyebrow, valor em destaque.
function Field({
  icon,
  label,
  children,
  className,
}: {
  icon?: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 eyebrow mb-1.5 text-ink-4">
        {icon && <span className="text-ink-4">{icon}</span>}
        {label}
      </dt>
      <dd className="flex flex-col gap-1">{children}</dd>
    </div>
  );
}
