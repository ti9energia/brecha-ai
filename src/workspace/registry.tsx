import {
  Crosshair, Radar, Building2, FlaskConical, ListChecks, Coins, Settings, Bot, Crown, FileText,
  type LucideIcon,
} from "lucide-react";
import type { ModuleId, Tab } from "./store";
import type { Translator } from "@/i18n/translate";
import { getOpportunity } from "@/server/domain/store";

import { OpportunitiesView } from "./views/OpportunitiesView";
import { OpportunityDetailView } from "./views/OpportunityDetailView";
import { RadarView } from "./views/RadarView";
import { StructureView } from "./views/StructureView";
import { SimulatorView } from "./views/SimulatorView";
import { ExecutionView } from "./views/ExecutionView";
import { SavingsView } from "./views/SavingsView";
import { SettingsView } from "./views/SettingsView";
import { AgentView } from "./views/AgentView";
import { OwnerView } from "./views/OwnerView";

export interface ViewProps {
  params?: Record<string, string>;
  paneId: string;
  tabId: string;
}

export interface ModuleDef {
  id: ModuleId;
  navKey: string; // chave no namespace 'nav'
  icon: LucideIcon;
  component: React.ComponentType<ViewProps>;
  group: "product" | "intelligence" | "governance";
  railHidden?: boolean;
}

export const MODULES: ModuleDef[] = [
  { id: "opportunities", navKey: "opportunities", icon: Crosshair, component: OpportunitiesView, group: "product" },
  { id: "opportunity", navKey: "detail", icon: FileText, component: OpportunityDetailView, group: "product", railHidden: true },
  { id: "radar", navKey: "radar", icon: Radar, component: RadarView, group: "product" },
  { id: "structure", navKey: "structure", icon: Building2, component: StructureView, group: "product" },
  { id: "simulator", navKey: "simulator", icon: FlaskConical, component: SimulatorView, group: "product" },
  { id: "execution", navKey: "execution", icon: ListChecks, component: ExecutionView, group: "product" },
  { id: "savings", navKey: "savings", icon: Coins, component: SavingsView, group: "product" },
  { id: "agent", navKey: "agent", icon: Bot, component: AgentView, group: "intelligence" },
  { id: "owner", navKey: "owner", icon: Crown, component: OwnerView, group: "governance" },
  { id: "settings", navKey: "settings", icon: Settings, component: SettingsView, group: "governance" },
];

export const MODULE_MAP: Record<ModuleId, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
) as Record<ModuleId, ModuleDef>;

export function tabTitle(tab: Tab, tNav: Translator): string {
  if (tab.title) return tab.title;
  if (tab.module === "opportunity" && tab.params?.id) {
    return getOpportunity(tab.params.id)?.title ?? tNav("detail");
  }
  return tNav(MODULE_MAP[tab.module].navKey);
}
