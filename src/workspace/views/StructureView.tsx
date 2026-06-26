"use client";

import { useState, type ReactNode } from "react";
import {
  Building2, Pencil, MapPin, Users, Receipt, Landmark, CalendarClock, Check, X, Plus, Sparkles,
} from "lucide-react";
import { getStructure, updateStructure } from "@/server/domain/store";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { useToast } from "@/ui/Toast";
import { ApertureRing } from "@/ui/ApertureRing";
import { Button, Chip } from "@/ui/primitives";
import { ViewScroll, ViewHeader, Section, writeJson, writeErrorKey } from "./shared";

const REGIMES = ["Lucro Real", "Lucro Presumido", "Simples Nacional"];
const UFS = ["SP", "RJ", "MG", "SC", "RS", "PR", "BA", "PE", "CE", "GO", "AM", "DF"];

export function StructureView() {
  const t = useTranslations("structure");
  const tc = useTranslations("common");
  const fmt = useFormatter();
  const { toast } = useToast();
  const base = getStructure();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    legalName: base.legalName,
    regime: base.regime,
    headquarters: base.headquarters,
    businessProfile: base.businessProfile,
    annualRevenue: base.annualRevenue,
    headcount: base.headcount,
    jurisdictions: [...base.jurisdictions],
  });
  const [newUf, setNewUf] = useState("");

  function cancel() {
    setDraft({
      legalName: base.legalName, regime: base.regime, headquarters: base.headquarters,
      businessProfile: base.businessProfile,
      annualRevenue: base.annualRevenue, headcount: base.headcount, jurisdictions: [...base.jurisdictions],
    });
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    const payload = {
      legalName: draft.legalName, regime: draft.regime, headquarters: draft.headquarters,
      businessProfile: draft.businessProfile,
      annualRevenue: draft.annualRevenue, headcount: draft.headcount, jurisdictions: draft.jurisdictions,
    };
    // Server-confirmed: só reflete no store isomórfico (a UI lê dele) DEPOIS que o
    // servidor aceitar. Em 403 (papel sem permissão) / 429 / erro, nada muda e o
    // usuário é avisado — o modo de edição continua aberto para tentar de novo.
    const res = await writeJson("/api/structure", payload, "PUT");
    setSaving(false);
    if (!res.ok) {
      toast({ title: tc("saveErrorTitle"), description: tc(writeErrorKey(res.status)), tone: "error" });
      return;
    }
    updateStructure(payload);
    setEditing(false);
    toast({ title: t("saved"), description: draft.legalName, tone: "success" });
  }

  function addUf(uf: string) {
    const u = uf.trim().toUpperCase().slice(0, 4);
    if (u && !draft.jurisdictions.includes(u)) {
      setDraft((d) => ({ ...d, jurisdictions: [...d.jurisdictions, u] }));
    }
    setNewUf("");
  }

  return (
    <ViewScroll>
      <ViewHeader
        icon={<Building2 size={20} />}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancel}><X size={14} /> {tc("cancel")}</Button>
              <Button variant="primary" size="sm" onClick={save} disabled={saving}>
                <Check size={14} /> {tc("save")}
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={14} /> {t("edit")}
            </Button>
          )
        }
      />

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2 panel hairline p-6">
          <p className="eyebrow mb-5">{t("title")}</p>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
            <Field icon={<Landmark size={13} />} label={t("legalName")}>
              {editing ? (
                <input className="input" value={draft.legalName} onChange={(e) => setDraft((d) => ({ ...d, legalName: e.target.value }))} />
              ) : (
                <span className="text-ink font-medium">{draft.legalName}</span>
              )}
            </Field>
            <Field icon={<Receipt size={13} />} label={t("taxId")}>
              <span className="mono text-ink tnum">{base.taxId}</span>
            </Field>
            <Field label={t("regime")}>
              {editing ? (
                <select className="input" value={draft.regime} onChange={(e) => setDraft((d) => ({ ...d, regime: e.target.value }))}>
                  {REGIMES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <Chip tone="gold">{draft.regime}</Chip>
              )}
            </Field>
            <Field icon={<MapPin size={13} />} label={t("headquarters")}>
              {editing ? (
                <input className="input" value={draft.headquarters} onChange={(e) => setDraft((d) => ({ ...d, headquarters: e.target.value }))} />
              ) : (
                <span className="text-ink">{draft.headquarters}</span>
              )}
            </Field>
            <Field label={t("mainActivity")} className="sm:col-span-2">
              <span className="text-ink text-pretty">{base.mainActivity}</span>
              <span className="mono text-xs text-ink-4 tnum">CNAE {base.mainCnae}</span>
            </Field>
            <Field label={t("revenue")}>
              {editing ? (
                <input type="number" step={1_000_000} min={0} className="input" value={draft.annualRevenue} onChange={(e) => setDraft((d) => ({ ...d, annualRevenue: Number(e.target.value) }))} />
              ) : (
                <>
                  <span className="font-display text-xl text-brand tnum leading-none">{fmt.money(draft.annualRevenue)}</span>
                  <span className="mono text-[0.66rem] text-ink-4">{tc("perYear")}</span>
                </>
              )}
            </Field>
            <Field icon={<Users size={13} />} label={t("headcount")}>
              {editing ? (
                <input type="number" min={0} className="input" value={draft.headcount} onChange={(e) => setDraft((d) => ({ ...d, headcount: Number(e.target.value) }))} />
              ) : (
                <span className="font-display text-xl text-ink tnum leading-none">{fmt.number(draft.headcount)}</span>
              )}
            </Field>
          </dl>
        </div>

        <div className="panel hairline p-6 flex flex-col items-center text-center">
          <ApertureRing
            value={base.completeness}
            size={132}
            center={<span className="block text-3xl font-bold text-ink tnum leading-none">{fmt.percent(base.completeness)}</span>}
            label={t("completeness")}
          />
          <p className="mt-5 text-sm text-ink-3 text-pretty max-w-[16rem]">{t("completenessHint")}</p>
          <div className="mt-5 pt-5 w-full border-t border-line flex items-center justify-center gap-1.5 text-xs text-ink-4">
            <CalendarClock size={13} className="text-ink-4" />
            <span>{t("lastReview")}</span>
            <span className="mono text-ink-3 tnum">{fmt.date(base.lastReview)}</span>
          </div>
        </div>
      </div>

      <Section title={t("businessProfile")}>
        <div className="panel hairline p-6">
          {editing ? (
            <textarea
              className="input min-h-[7rem] resize-y leading-relaxed"
              value={draft.businessProfile}
              maxLength={2000}
              placeholder={t("businessProfilePlaceholder")}
              onChange={(e) => setDraft((d) => ({ ...d, businessProfile: e.target.value }))}
            />
          ) : draft.businessProfile ? (
            <p className="text-sm text-ink-2 text-pretty leading-relaxed whitespace-pre-wrap">{draft.businessProfile}</p>
          ) : (
            <p className="text-sm text-ink-4 italic">{t("businessProfileEmpty")}</p>
          )}
          <p className="mt-3 pt-3 border-t border-line flex items-start gap-2 text-xs text-ink-4">
            <Sparkles size={13} className="text-brand shrink-0 mt-0.5" />
            <span className="text-pretty">{t("businessProfileHint")}</span>
          </p>
        </div>
      </Section>

      <Section title={t("activities")}>
        <div className="panel hairline overflow-hidden">
          <ul>
            {base.activities.map((a, i) => (
              <li key={a.code} className={"flex items-center gap-4 px-5 py-3.5" + (i > 0 ? " border-t border-line" : "")}>
                <span className="mono text-xs text-brand tnum shrink-0 rounded-[var(--radius-sm)] border border-line-gold bg-[var(--brand-soft)] px-2 py-1">{a.code}</span>
                <span className="text-sm text-ink-2 text-pretty">{a.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section
        title={t("jurisdictions")}
        actions={!editing ? <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Plus size={14} /> {t("addJurisdiction")}</Button> : undefined}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {draft.jurisdictions.map((uf) => (
            <span key={uf} className="inline-flex items-center gap-2 h-9 pl-3.5 pr-2 rounded-full border border-line-gold bg-[var(--brand-soft)] text-brand">
              <MapPin size={13} />
              <span className="mono text-sm tracking-wide">{uf}</span>
              {editing && (
                <button onClick={() => setDraft((d) => ({ ...d, jurisdictions: d.jurisdictions.filter((x) => x !== uf) }))} className="grid place-items-center size-5 rounded-full hover:bg-[var(--brand-soft)] text-brand/70 hover:text-brand" aria-label={t("removeJurisdiction", { uf })}>
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
          {editing && (
            <span className="inline-flex items-center gap-1">
              <input list="uf-list" value={newUf} onChange={(e) => setNewUf(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addUf(newUf); }} placeholder="UF" aria-label={t("addJurisdiction")} className="input !h-9 !w-24 !pl-3" maxLength={4} />
              <datalist id="uf-list">{UFS.map((u) => <option key={u} value={u} />)}</datalist>
              <button onClick={() => addUf(newUf)} className="grid place-items-center size-9 rounded-full border border-line-gold bg-[var(--brand-soft)] text-brand hover:brightness-110" aria-label={t("addJurisdiction")}><Plus size={15} /></button>
            </span>
          )}
        </div>
      </Section>

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
                {base.entities.map((e, i) => (
                  <tr key={e.cnpj} className={"transition-colors hover:bg-surface-2/60" + (i > 0 ? " border-t border-line" : "")}>
                    <td className="px-5 py-3.5 text-sm text-ink font-medium">{e.name}</td>
                    <td className="px-5 py-3.5 mono text-xs text-ink-3 tnum whitespace-nowrap">{e.cnpj}</td>
                    <td className="px-5 py-3.5"><Chip tone={e.regime === "Lucro Real" ? "gold" : "neutral"}>{e.regime}</Chip></td>
                    <td className="px-5 py-3.5 text-right"><span className="mono text-sm text-ink-2 tracking-wide">{e.uf}</span></td>
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

function Field({ icon, label, children, className }: { icon?: ReactNode; label: string; children: ReactNode; className?: string }) {
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
