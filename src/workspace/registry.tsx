import dynamic from "next/dynamic";
import {
  Crosshair, Radar, Building2, FlaskConical, ListChecks, Coins, Settings, Bot, Crown, FileText, Briefcase,
  type LucideIcon,
} from "lucide-react";
import type { ModuleId, Tab } from "./store";
import type { AccountType } from "./session";
import type { Translator } from "@/i18n/translate";
import { getOpportunity, getFirmClient } from "@/server/domain/store";

export interface ViewProps {
  params?: Record<string, string>;
  paneId: string;
  tabId: string;
}

// Fallback enquanto o chunk da view carrega (code splitting por aba).
function ViewLoading() {
  return (
    <div className="h-full grid place-items-center">
      <span className="size-7 rounded-full border-2 border-line border-t-brand animate-spin" />
    </div>
  );
}

const lazy = (loader: () => Promise<{ default: React.ComponentType<ViewProps> }>) =>
  dynamic(loader, { loading: () => <ViewLoading /> });

// Cada view num chunk próprio: o bundle inicial do workspace carrega só a aba aberta.
const OpportunitiesView = lazy(() => import("./views/OpportunitiesView").then((m) => ({ default: m.OpportunitiesView })));
const OpportunityDetailView = lazy(() => import("./views/OpportunityDetailView").then((m) => ({ default: m.OpportunityDetailView })));
const RadarView = lazy(() => import("./views/RadarView").then((m) => ({ default: m.RadarView })));
const StructureView = lazy(() => import("./views/StructureView").then((m) => ({ default: m.StructureView })));
const SimulatorView = lazy(() => import("./views/SimulatorView").then((m) => ({ default: m.SimulatorView })));
const ExecutionView = lazy(() => import("./views/ExecutionView").then((m) => ({ default: m.ExecutionView })));
const SavingsView = lazy(() => import("./views/SavingsView").then((m) => ({ default: m.SavingsView })));
const SettingsView = lazy(() => import("./views/SettingsView").then((m) => ({ default: m.SettingsView })));
const AgentView = lazy(() => import("./views/AgentView").then((m) => ({ default: m.AgentView })));
const OwnerView = lazy(() => import("./views/OwnerView").then((m) => ({ default: m.OwnerView })));
const ClientsView = lazy(() => import("./views/ClientsView").then((m) => ({ default: m.ClientsView })));
const ClientDetailView = lazy(() => import("./views/ClientDetailView").then((m) => ({ default: m.ClientDetailView })));

// Atalhos de perfil (definidos em users.ts/sessão).
const PRODUCT: AccountType[] = ["company", "firm"]; // abas de produto: autônomo e escritório

export interface ModuleDef {
  id: ModuleId;
  navKey: string; // chave no namespace 'nav'
  icon: LucideIcon;
  component: React.ComponentType<ViewProps>;
  group: "product" | "intelligence" | "governance";
  railHidden?: boolean;
  personas: AccountType[]; // quais perfis veem este módulo (0C + perfis de produto)
}

export const MODULES: ModuleDef[] = [
  // Escritório: a carteira de clientes é o hub — primeira aba.
  { id: "clients", navKey: "clients", icon: Briefcase, component: ClientsView, group: "product", personas: ["firm"] },
  { id: "client", navKey: "clientDetail", icon: Briefcase, component: ClientDetailView, group: "product", railHidden: true, personas: ["firm"] },
  { id: "opportunities", navKey: "opportunities", icon: Crosshair, component: OpportunitiesView, group: "product", personas: PRODUCT },
  { id: "opportunity", navKey: "detail", icon: FileText, component: OpportunityDetailView, group: "product", railHidden: true, personas: PRODUCT },
  { id: "radar", navKey: "radar", icon: Radar, component: RadarView, group: "product", personas: PRODUCT },
  { id: "structure", navKey: "structure", icon: Building2, component: StructureView, group: "product", personas: PRODUCT },
  { id: "simulator", navKey: "simulator", icon: FlaskConical, component: SimulatorView, group: "product", personas: PRODUCT },
  { id: "execution", navKey: "execution", icon: ListChecks, component: ExecutionView, group: "product", personas: PRODUCT },
  { id: "savings", navKey: "savings", icon: Coins, component: SavingsView, group: "product", personas: PRODUCT },
  { id: "agent", navKey: "agent", icon: Bot, component: AgentView, group: "intelligence", personas: PRODUCT },
  { id: "owner", navKey: "owner", icon: Crown, component: OwnerView, group: "governance", personas: ["owner"] },
  { id: "settings", navKey: "settings", icon: Settings, component: SettingsView, group: "governance", personas: ["company", "firm", "owner"] },
];

// Perfil → módulos que ele pode ver (rail + abas reidratáveis) e o módulo de partida.
export function modulesForPersona(accountType: AccountType): ModuleDef[] {
  return MODULES.filter((m) => m.personas.includes(accountType));
}
export function allowedModuleIds(accountType: AccountType): ReadonlySet<string> {
  return new Set(modulesForPersona(accountType).map((m) => m.id));
}
export function defaultModuleFor(accountType: AccountType): ModuleId {
  if (accountType === "firm") return "clients";
  if (accountType === "owner") return "owner";
  return "opportunities";
}

export const MODULE_MAP: Record<ModuleId, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
) as Record<ModuleId, ModuleDef>;

export function tabTitle(tab: Tab, tNav: Translator): string {
  if (tab.title) return tab.title;
  if (tab.module === "opportunity" && tab.params?.id) {
    return getOpportunity(tab.params.id)?.title ?? tNav("detail");
  }
  if (tab.module === "client" && tab.params?.id) {
    return getFirmClient(tab.params.id)?.name ?? tNav("clientDetail");
  }
  return tNav(MODULE_MAP[tab.module].navKey);
}
