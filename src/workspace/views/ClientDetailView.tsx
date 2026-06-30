"use client";

import { useState, useEffect } from "react";
import { Briefcase, ArrowLeft, MapPin, Receipt, Crosshair, Sparkles } from "lucide-react";
import { api } from "@/lib/api/client";
import { SECTORS } from "@/lib/sectors";
import type { ClientDetail } from "@/lib/api/types";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { useWorkspace } from "@/workspace/store";
import { Chip, Meter } from "@/ui/primitives";
import { ViewScroll, ViewHeader, StatTiles, StatTile, Section } from "./shared";
import type { ViewProps } from "../registry";

const sectorLabel = Object.fromEntries(SECTORS.map((s) => [s.id, s.label]));

// Detalhe de UM cliente do escritório: perfil + as brechas que o MESMO detector achou
// cruzando o perfil DESTE cliente com as normas + a economia capturada. É a profundidade
// do perfil escritório — o motor serve a carteira, cliente a cliente.
export function ClientDetailView({ params }: ViewProps) {
  const t = useTranslations("clients");
  const tc = useTranslations("common");
  const fmt = useFormatter();
  const ws = useWorkspace();
  const id = params?.id ?? "";
  // Onda 6: store.ts server-only → detalhe do cliente via API.
  const [detail, setDetail] = useState<ClientDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    api.clients.get(id).then(setDetail).catch(() => {});
  }, [id]);

  const c = detail?.client ?? null;
  const brechas = detail?.brechas ?? [];
  const totalGain = brechas.reduce((s, o) => s + o.estimatedGain, 0);

  if (!c) {
    return (
      <ViewScroll>
        <div className="panel hairline py-16 grid place-items-center text-ink-3">{t("notFound")}</div>
      </ViewScroll>
    );
  }

  return (
    <ViewScroll>
      <button onClick={() => ws.open("clients")} className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink mb-4 transition-colors">
        <ArrowLeft size={15} /> {t("backToPortfolio")}
      </button>

      <ViewHeader
        icon={<Briefcase size={20} />}
        title={c.name}
        subtitle={`${sectorLabel[c.sector] ?? c.sector} · ${c.regime} · ${c.headquarters}`}
        actions={<Chip tone="neutral"><Receipt size={12} />{c.cnpj}</Chip>}
      />

      <StatTiles>
        <StatTile label={t("openBrechas")} value={fmt.number(brechas.length)} accent="gold" hint={<span className="inline-flex items-center gap-1"><Crosshair size={11} />{tc("estimated")}</span>} />
        <StatTile label={t("potentialGain")} value={fmt.moneyCompact(totalGain)} accent="info" hint={tc("perYear")} />
        <StatTile label={t("capturedYtd")} value={fmt.moneyCompact(c.capturedYtd)} accent="positive" hint={tc("realized")} />
      </StatTiles>

      <Section title={t("profile")}>
        <div className="panel hairline p-6">
          <p className="text-sm text-ink-2 text-pretty leading-relaxed whitespace-pre-wrap">{c.businessProfile}</p>
          <div className="mt-4 pt-4 border-t border-line flex flex-wrap gap-2">
            {c.jurisdictions.map((uf) => (
              <span key={uf} className="inline-flex items-center gap-1.5 chip" style={{ borderColor: "var(--border-gold)" }}>
                <MapPin size={12} className="text-brand" /><span className="mono text-xs">{uf}</span>
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t("detectedBrechas")}>
        {brechas.length === 0 ? (
          <div className="panel hairline py-12 grid place-items-center text-center text-ink-3">{t("noBrechas")}</div>
        ) : (
          <div className="space-y-3">
            {brechas.map((o) => (
              <div key={o.id} className="panel hairline gold-edge p-5">
                <div className="flex items-start gap-4">
                  <span className="grid place-items-center size-10 rounded-[var(--radius-md)] border border-line-gold bg-[var(--brand-soft)] text-brand shrink-0">
                    <Sparkles size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-ink text-balance">{o.title}</h3>
                    <p className="mt-1.5 text-sm text-ink-3 text-pretty">{o.recommendedMove.rationale.slice(0, 2).join(" · ")}</p>
                    <div className="mt-4 grid sm:grid-cols-[1fr_1fr] gap-4 items-end">
                      <div>
                        <p className="eyebrow mb-1">{t("potentialGain")}</p>
                        <p className="font-display font-semibold text-brand tnum text-lg leading-none">{fmt.moneyCompact(o.estimatedGain)}<span className="text-ink-4 text-xs ml-1">{tc("perYear")}</span></p>
                      </div>
                      <div>
                        <p className="eyebrow mb-1.5">{t("confidence")}</p>
                        <div className="flex items-center gap-2">
                          <Meter value={o.confidence} tone="positive" className="flex-1" />
                          <span className="mono text-xs text-ink-2">{fmt.percent(o.confidence)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </ViewScroll>
  );
}
