"use client";

import { useState } from "react";
import { Settings, Building2, Radar, Bot, MessageCircle, Users, Check, Save, Globe } from "lucide-react";
import { getStructure, getSectors } from "@/server/domain/store";
import { useTranslations } from "@/i18n/provider";
import { locales, localeMeta } from "@/i18n/config";
import { Button, Chip } from "@/ui/primitives";
import { useToast } from "@/ui/Toast";
import { ViewScroll, ViewHeader, Section } from "./shared";
import { cn } from "@/ui/cn";

// Fusos oferecidos (rótulo amigável + valor IANA implícito no próprio texto).
const TIMEZONES = [
  "America/Sao_Paulo (BRT)",
  "UTC",
  "America/New_York",
  "Europe/Paris",
  "Asia/Shanghai",
];

// UFs disponíveis para vigilância do radar.
const JURISDICTIONS = ["SP", "SC", "MG", "RJ", "BA", "PE", "AM"];

// Tons disponíveis para a persona da IA.
const AI_TONES = ["Consultivo e direto", "Formal", "Próximo e didático"];

// Equipe simulada (somente visual — sem persistência real).
const TEAM = [
  { name: "Marina Alves", role: "CFO / controller", email: "marina.alves@acme.com.br" },
  { name: "Helena Vasconcelos", role: "Tributarista", email: "helena.v@acme.com.br" },
  { name: "Rafael Lima", role: "Analista", email: "rafael.lima@acme.com.br" },
];

export function SettingsView() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const structure = getStructure();
  const sectors = getSectors();

  // Estado puramente visual.
  const [sectorSel, setSectorSel] = useState<Set<string>>(() => new Set(["industry", "tech", "energy"]));
  const [ufSel, setUfSel] = useState<Set<string>>(() => new Set(["SP", "SC", "MG"]));
  const [saved, setSaved] = useState(false);

  function toggle(set: Set<string>, value: string, apply: (next: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  }

  function handleSave() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <ViewScroll>
      <ViewHeader
        icon={<Settings size={20} />}
        eyebrow={tc("updatedAt") + " · Acme Participações"}
        title={t("title")}
        actions={
          <div className="flex items-center gap-3">
            <span
              aria-live="polite"
              className={cn(
                "inline-flex items-center gap-1.5 text-sm text-positive transition-all duration-300",
                saved ? "opacity-100 translate-x-0" : "opacity-0 translate-x-1 pointer-events-none",
              )}
            >
              <span className="grid place-items-center size-5 rounded-full bg-[var(--positive-soft)]">
                <Check size={12} />
              </span>
              {t("saved")}
            </span>
            <Button onClick={handleSave}>
              <Save size={16} />
              {tc("save")}
            </Button>
          </div>
        }
      />

      {/* ── Organização ─────────────────────────────────────────────────────── */}
      <Section title={t("org")}>
        <Panel icon={<Building2 size={15} />} label={t("org")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("orgName")} className="sm:col-span-2">
              <input className="input" defaultValue={structure.legalName} />
            </Field>

            <Field label={t("defaultLocale")}>
              <select className="input" defaultValue="pt-BR">
                {locales.map((l) => (
                  <option key={l} value={l}>
                    {localeMeta[l].native}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("timezone")}>
              <select className="input" defaultValue={TIMEZONES[0]}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>
      </Section>

      {/* ── Setores monitorados ─────────────────────────────────────────────── */}
      <Section title={t("monitoredSectors")} subtitle={t("monitoredSectorsHint")}>
        <Panel icon={<Radar size={15} />} label={t("monitoredSectors")}>
          <div className="flex flex-wrap gap-2">
            {sectors.map((s) => (
              <ToggleChip
                key={s.id}
                active={sectorSel.has(s.id)}
                onClick={() => toggle(sectorSel, s.id, setSectorSel)}
              >
                {s.label}
              </ToggleChip>
            ))}
          </div>
        </Panel>
      </Section>

      {/* ── Jurisdições monitoradas ─────────────────────────────────────────── */}
      <Section title={t("monitoredJurisdictions")}>
        <Panel icon={<Globe size={15} />} label={t("monitoredJurisdictions")}>
          <div className="flex flex-wrap gap-2">
            {JURISDICTIONS.map((uf) => (
              <ToggleChip
                key={uf}
                active={ufSel.has(uf)}
                onClick={() => toggle(ufSel, uf, setUfSel)}
              >
                <span className="mono">{uf}</span>
              </ToggleChip>
            ))}
          </div>
        </Panel>
      </Section>

      {/* ── Persona da IA ───────────────────────────────────────────────────── */}
      <Section title={t("aiPersona")} subtitle={t("aiPersonaHint")}>
        <Panel icon={<Bot size={15} />} label={t("aiPersona")}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex items-center gap-3 sm:pt-7">
              <span className="grid place-items-center size-12 shrink-0 rounded-full border border-line-gold bg-[var(--brand-soft)] font-display font-semibold text-lg text-brand">
                V
              </span>
            </div>
            <div className="grid flex-1 gap-5 sm:grid-cols-2">
              <Field label={t("aiPersona")}>
                <input className="input" defaultValue="Vega" />
              </Field>
              <Field label={tc("adjust")}>
                <select className="input" defaultValue={AI_TONES[0]}>
                  {AI_TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </Panel>
      </Section>

      {/* ── WhatsApp ────────────────────────────────────────────────────────── */}
      <Section title={t("whatsapp")} subtitle={t("whatsappHint")}>
        <Panel icon={<MessageCircle size={15} />} label={t("whatsapp")}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Field label={t("whatsapp")} className="flex-1">
              <input className="input mono" defaultValue="+55 11 9 9999-0000" inputMode="tel" />
            </Field>
            <Button variant="secondary" className="shrink-0" onClick={() => toast({ title: t("whatsappConnect"), description: "+55 11 9 9999-0000 · " + t("whatsappHint"), tone: "success" })}>
              <MessageCircle size={16} className="text-positive" />
              {t("whatsappConnect")}
            </Button>
          </div>
        </Panel>
      </Section>

      {/* ── Equipe & papéis ─────────────────────────────────────────────────── */}
      <Section title={t("team")}>
        <Panel icon={<Users size={15} />} label={t("team")} flush>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-5 py-3 eyebrow font-normal">{t("orgName").split(" ")[0]}</th>
                  <th className="px-5 py-3 eyebrow font-normal">{t("role")}</th>
                  <th className="px-5 py-3 eyebrow font-normal">E-mail</th>
                </tr>
              </thead>
              <tbody>
                {TEAM.map((u, i) => (
                  <tr
                    key={u.email}
                    className={cn("border-line", i < TEAM.length - 1 && "border-b")}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-ink">{u.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Chip tone={u.role.includes("Tributarista") ? "gold" : "neutral"}>{u.role}</Chip>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="mono text-xs text-ink-3">{u.email}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </Section>
    </ViewScroll>
  );
}

// ── Painel padrão de seção (cartão com cabeçalho discreto) ─────────────────────
function Panel({
  icon,
  label,
  children,
  flush,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <div className="panel hairline overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-3">
        <span className="grid place-items-center size-7 rounded-[var(--radius-sm)] border border-line bg-surface-2 text-brand">
          {icon}
        </span>
        <span className="eyebrow">{label}</span>
      </div>
      <div className={cn(flush ? "" : "p-5")}>{children}</div>
    </div>
  );
}

// ── Campo de formulário (label acima do controle) ──────────────────────────────
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-xs font-medium text-ink-2 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

// ── Chip alternável (setores / jurisdições) ────────────────────────────────────
function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-sm transition-colors whitespace-nowrap",
        active
          ? "border-line-gold bg-[var(--brand-soft)] text-brand"
          : "border-line bg-surface-2 text-ink-3 hover:text-ink hover:border-line-strong",
      )}
    >
      {active && <Check size={13} className="-ml-0.5" />}
      {children}
    </button>
  );
}
