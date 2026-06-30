"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, Building2, Radar, Bot, MessageCircle, Users, Check, Save, Globe } from "lucide-react";
import { api } from "@/lib/api/client";
import { SECTORS } from "@/lib/sectors";
import { useTranslations } from "@/i18n/provider";
import { locales, localeMeta } from "@/i18n/config";
import { Button, Chip } from "@/ui/primitives";
import { useToast } from "@/ui/Toast";
import { ViewScroll, ViewHeader, Section, writeJson, writeErrorKey } from "./shared";
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

type TeamMember = { id: string; name: string; email: string; role: string };

export function SettingsView() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { toast } = useToast();
  // Onda 6: store.ts é server-only → configurações carregadas via API no mount.
  const [orgName, setOrgName] = useState("");
  const [defaultLocale, setDefaultLocale] = useState("pt-BR");
  const [timezone, setTimezone] = useState("America/Sao_Paulo (BRT)");
  const [aiPersona, setAiPersona] = useState("Vega");
  const [aiTone, setAiTone] = useState("Consultivo e direto");
  const [whatsapp, setWhatsapp] = useState("");
  const [sectorSel, setSectorSel] = useState<Set<string>>(new Set());
  const [ufSel, setUfSel] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const savedTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    api.settings.get().then((s) => {
      setOrgName(s.orgName);
      setDefaultLocale(s.defaultLocale);
      setTimezone(s.timezone);
      setAiPersona(s.aiPersona);
      setAiTone(s.aiTone);
      setWhatsapp(s.whatsapp);
      setSectorSel(new Set(s.sectors));
      setUfSel(new Set(s.jurisdictions));
    }).catch(() => {});
  }, []);

  // Equipe real da org (substitui o antigo mock hardcoded) — via /api/team.
  useEffect(() => {
    let alive = true;
    fetch("/api/team")
      .then((r) => r.json())
      .then((j) => { if (alive) setTeam(Array.isArray(j?.data) ? j.data : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  function toggle(set: Set<string>, value: string, apply: (next: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  }

  async function handleSave() {
    const payload = {
      orgName, defaultLocale, timezone, aiPersona, aiTone, whatsapp,
      sectors: [...sectorSel], jurisdictions: [...ufSel],
    };
    setSaving(true);
    // Server-confirmed: só anuncia "Salvo" e reflete no store após o servidor aceitar.
    // 403 (papel < manager) / 429 → toast de erro, sem confirmação falsa.
    const res = await writeJson("/api/settings", payload, "PUT");
    setSaving(false);
    if (!res.ok) {
      toast({ title: tc("saveErrorTitle"), description: tc(writeErrorKey(res.status)), tone: "error" });
      return;
    }
    // Onda 6: store.ts server-only → estado local já reflete o novo valor (sem store mutation).
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 2000);
  }

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  // Rótulos localizados dos tons da IA — o VALOR persistido continua canônico (PT),
  // pois é o que o motor/persona usa; só a exibição muda por locale.
  const toneLabel: Record<string, string> = {
    "Consultivo e direto": t("toneConsultive"),
    Formal: t("toneFormal"),
    "Próximo e didático": t("toneFriendly"),
  };

  return (
    <ViewScroll>
      <ViewHeader
        icon={<Settings size={20} />}
        eyebrow={`${tc("updatedAt")} · ${orgName}`}
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
            <Button onClick={handleSave} disabled={saving}>
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
              <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </Field>

            <Field label={t("defaultLocale")}>
              <select className="input" value={defaultLocale} onChange={(e) => setDefaultLocale(e.target.value)}>
                {locales.map((l) => (
                  <option key={l} value={l}>
                    {localeMeta[l].native}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("timezone")}>
              <select className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
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
            {SECTORS.map((s) => (
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
                <input className="input" value={aiPersona} onChange={(e) => setAiPersona(e.target.value)} />
              </Field>
              <Field label={tc("adjust")}>
                <select className="input" value={aiTone} onChange={(e) => setAiTone(e.target.value)}>
                  {AI_TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {toneLabel[tone] ?? tone}
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
              <input className="input mono" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" />
            </Field>
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={async () => {
                try {
                  const res = await fetch("/api/whatsapp/optin", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ number: whatsapp }),
                  });
                  toast({ title: t("whatsappConnect"), description: res.ok ? t("whatsappCodeSent") : t("whatsappError"), tone: res.ok ? "success" : "error" });
                } catch {
                  toast({ title: t("whatsappConnect"), description: t("whatsappError"), tone: "error" });
                }
              }}
            >
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
                  <th className="px-5 py-3 eyebrow font-normal">{t("memberName")}</th>
                  <th className="px-5 py-3 eyebrow font-normal">{t("role")}</th>
                  <th className="px-5 py-3 eyebrow font-normal">{t("memberEmail")}</th>
                </tr>
              </thead>
              <tbody>
                {team.map((u, i) => (
                  <tr
                    key={u.id}
                    className={cn("border-line", i < team.length - 1 && "border-b")}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-ink">{u.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Chip tone={u.role === "platform_owner" ? "gold" : u.role === "member" ? "neutral" : "info"}>{u.role}</Chip>
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
