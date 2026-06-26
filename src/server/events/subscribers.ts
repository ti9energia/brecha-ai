// Inscritos do event bus (0D §5), carregados no boot via instrumentation.ts.
// Demonstra o desacoplamento: o emissor (store) não conhece o auditor — toda
// mudança de domínio entra na trilha por reação a evento, não por chamada direta.
import { on } from "./bus";
import { recordAiAction } from "@/server/domain/store";

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
}
