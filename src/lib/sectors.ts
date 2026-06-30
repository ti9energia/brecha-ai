// Lista canônica de setores — espelha SECTORS de seed.ts mas reside fora do
// bundle servidor para que views cliente possam importar sem server-only.
export const SECTORS = [
  { id: "industry", label: "Indústria" },
  { id: "agribusiness", label: "Agronegócio" },
  { id: "tech", label: "Tecnologia" },
  { id: "retail", label: "Varejo" },
  { id: "logistics", label: "Logística" },
  { id: "energy", label: "Energia" },
  { id: "health", label: "Saúde" },
  { id: "finance", label: "Serviços financeiros" },
  { id: "construction", label: "Construção" },
] as const;

export type SectorItem = { id: string; label: string };
