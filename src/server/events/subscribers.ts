// Inscritos do event bus (0D §5), carregados no boot via instrumentation.ts.
// Demonstra o desacoplamento: o emissor (store) não conhece o auditor — toda
// mudança de domínio entra na trilha por reação a evento, não por chamada direta.
import { on } from "./bus";
import { recordAiAction } from "@/server/domain/store";
import { ingestDocument } from "@/server/ai-core/knowledge";

let registered = false;

export function registerSubscribers(): void {
  if (registered) return;
  registered = true;

  on<{ title?: string; opportunityId?: string }>("execution.approved", (p) =>
    recordAiAction({ actor: "event-bus", action: "execution.approved", detail: p.title ?? p.opportunityId ?? "" }),
  );
  on<{ name?: string }>("tenant.created", (p) =>
    recordAiAction({ actor: "event-bus", action: "tenant.created", detail: p.name ?? "" }),
  );
  on<{ id?: string; status?: string }>("tenant.status_changed", (p) =>
    recordAiAction({ actor: "event-bus", action: "tenant.status_changed", detail: `${p.id} → ${p.status}` }),
  );

  // Antes, estes três eventos eram emitidos mas sem assinante — "eventos mortos".
  // Agora são auditados + o RAG do AI Core é atualizado para o tenant correto.
  on<{ id?: string; gain?: number }>("savings.reconciled", (p) => {
    recordAiAction({ actor: "event-bus", action: "savings.reconciled", detail: `id=${p.id} gain=${p.gain ?? 0}` });
    ingestDocument("org-acme", {
      title: "Economia conciliada",
      text: `R$ ${(p.gain ?? 0).toLocaleString("pt-BR")} — id ${p.id ?? ""}`,
    });
  });
  on<{ id?: string; gain?: number }>("opportunity.simulated", (p) => {
    recordAiAction({ actor: "event-bus", action: "opportunity.simulated", detail: `id=${p.id} gain=${p.gain ?? 0}` });
    ingestDocument("org-acme", {
      title: "Oportunidade detectada pelo simulador",
      text: `id=${p.id ?? ""} ganho projetado R$ ${(p.gain ?? 0).toLocaleString("pt-BR")}`,
    });
  });
  on<{ id?: string; opportunityId?: string; status?: string }>("plan.updated", (p) => {
    recordAiAction({
      actor: "event-bus",
      action: "plan.updated",
      detail: `plan=${p.id ?? ""} opp=${p.opportunityId ?? ""} status=${p.status ?? ""}`,
    });
    if (p.status === "captured") {
      ingestDocument("org-acme", {
        title: "Execução concluída — economia capturada",
        text: `Oportunidade ${p.opportunityId ?? ""} chegou a 100% e gerou um SavingsRecord.`,
      });
    }
  });
}
