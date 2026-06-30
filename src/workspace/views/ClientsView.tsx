"use client";

import { useState, useEffect } from "react";
import { Briefcase, Users, Crosshair, Coins, ChevronRight } from "lucide-react";
import { api } from "@/lib/api/client";
import { SECTORS } from "@/lib/sectors";
import type { FirmClient, PortfolioStats } from "@/lib/api/types";
import { useFormatter, useTranslations } from "@/i18n/provider";
import { useWorkspace } from "@/workspace/store";
import { Chip } from "@/ui/primitives";
import { ViewScroll, ViewHeader, StatTiles, StatTile, Section } from "./shared";
import { cn } from "@/ui/cn";

type ClientRow = FirmClient & { brechasCount: number };

const STATUS_TONE: Record<FirmClient["status"], "positive" | "info" | "warning"> = {
  active: "positive",
  onboarding: "info",
  review: "warning",
};

const sectorLabel = Object.fromEntries(SECTORS.map((s) => [s.id, s.label]));

// Carteira de clientes do ESCRITÓRIO (perfil "firm"). Hub do advogado/contador que
// assessora várias empresas: portfólio + brechas abertas + economia capturada por cliente.
export function ClientsView() {
  const t = useTranslations("clients");
  const tc = useTranslations("common");
  const fmt = useFormatter();
  const ws = useWorkspace();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [p, setP] = useState<PortfolioStats>({ clients: 0, openBrechas: 0, capturedYtd: 0, activeClients: 0 });

  // Onda 6: store.ts server-only → carteira via API. brechasCount vem pré-calculado.
  useEffect(() => {
    api.clients.list().then(({ clients: rows, portfolio }) => {
      setClients(rows as ClientRow[]);
      setP(portfolio);
    }).catch(() => {});
  }, []);

  return (
    <ViewScroll>
      <ViewHeader icon={<Briefcase size={20} />} title={t("title")} subtitle={t("subtitle")} />

      <StatTiles>
        <StatTile
          label={t("clientsCount")}
          value={fmt.number(p.clients)}
          accent="gold"
          hint={<span className="inline-flex items-center gap-1"><Users size={11} />{t("activeClients", { n: String(p.activeClients) })}</span>}
        />
        <StatTile
          label={t("openBrechas")}
          value={fmt.number(p.openBrechas)}
          accent="info"
          hint={<span className="inline-flex items-center gap-1"><Crosshair size={11} />{tc("estimated")}</span>}
        />
        <StatTile
          label={t("capturedYtd")}
          value={fmt.moneyCompact(p.capturedYtd)}
          accent="positive"
          hint={<span className="inline-flex items-center gap-1"><Coins size={11} />{tc("realized")}</span>}
        />
      </StatTiles>

      <Section title={t("portfolio")}>
        <div className="panel hairline overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left border-collapse">
              <thead>
                <tr className="bg-surface-2 border-b border-line">
                  <th className="eyebrow font-normal px-5 py-3">{t("colClient")}</th>
                  <th className="eyebrow font-normal px-5 py-3">{t("colSector")}</th>
                  <th className="eyebrow font-normal px-5 py-3">{t("colRegime")}</th>
                  <th className="eyebrow font-normal px-5 py-3 text-right">{t("colBrechas")}</th>
                  <th className="eyebrow font-normal px-5 py-3 text-right">{t("colCaptured")}</th>
                  <th className="eyebrow font-normal px-5 py-3 text-right">{tc("status")}</th>
                  <th className="px-3 py-3" aria-hidden></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => {
                  const open = () => ws.open("client", { id: c.id }, c.name);
                  return (
                    <tr
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
                      aria-label={t("openClient", { name: c.name })}
                      className={cn("cursor-pointer transition-colors hover:bg-surface-2/60 focus:bg-surface-2 focus:outline-none", i > 0 && "border-t border-line")}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-ink font-medium text-pretty">{c.name}</p>
                        <p className="mono text-xs text-ink-4 tnum">{c.cnpj}</p>
                      </td>
                      <td className="px-5 py-3.5"><Chip tone="neutral">{sectorLabel[c.sector] ?? c.sector}</Chip></td>
                      <td className="px-5 py-3.5"><Chip tone={c.regime === "Lucro Real" ? "gold" : "neutral"}>{c.regime}</Chip></td>
                      <td className="px-5 py-3.5 text-right tnum text-brand font-medium">{c.brechasCount}</td>
                      <td className="px-5 py-3.5 text-right text-sm text-positive tnum whitespace-nowrap font-medium">{fmt.money(c.capturedYtd)}</td>
                      <td className="px-5 py-3.5 text-right"><Chip tone={STATUS_TONE[c.status]}>{t(`status_${c.status}`)}</Chip></td>
                      <td className="px-3 py-3.5 text-right text-ink-4"><ChevronRight size={16} className="inline" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </ViewScroll>
  );
}
