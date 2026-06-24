import {
  Factory, Wheat, Cpu, ShoppingBag, Truck, Zap, HeartPulse, Landmark, Building2,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Factory, Wheat, Cpu, ShoppingBag, Truck, Zap, HeartPulse, Landmark, Building2,
  industry: Factory, agribusiness: Wheat, tech: Cpu, retail: ShoppingBag,
  logistics: Truck, energy: Zap, health: HeartPulse, finance: Landmark, construction: Building2,
};

export function SectorIcon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const Icon = MAP[name] ?? Factory;
  return <Icon size={size} className={className} />;
}
