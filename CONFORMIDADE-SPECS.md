# Conformidade com os specs — Brecha.ai

> **Pergunta:** "estamos entregando tudo que é para ser feito?"
> **Resposta curta:** o **produto (08)** e a **base transversal (segurança, i18n, IA, WhatsApp, flags)** estão entregues e verificados. As **lacunas reais** estão sobretudo no **Painel do Dono (0C)** — que é em grande parte só-leitura — e em itens de DoD de 0A/0B/0D que dependem de infraestrutura (multi-tenant real, integrações, billing, event bus).
>
> Método: cada requisito concreto dos specs (`00-PADRAO`, `08`, `0A`, `0B`, `0C`, `0D`) foi conferido contra o código (`src/**`). Legenda: ✅ entregue · 🟡 parcial · ❌ ausente.
> Estado do build nesta entrega: **typecheck limpo · 111 testes · build OK**.
>
> **Atualização:** lacunas fechadas nesta sessão — entitlements de plano em runtime (#2), IA nos 4 idiomas no cérebro local (#3), confirmação "responda SIM" no WhatsApp (parte de #4) e o **CRUD principal do Painel do Dono** (parte de #1: tenants, planos, users globais, endpoints `/admin/*`). Ver marcações ✅/🟡 abaixo.

---

## Placar por spec

| Spec | ✅ | 🟡 | ❌ | Veredito |
|---|---|---|---|---|
| **00-PADRÃO** (envelope, i18n, segurança) | i18n 4 locales c/ paridade + fallback; envelope `{data,meta,error}`; HITL; `AUTH_SECRET` fail-closed | rate-limit não-por-org; auditoria não cobre todo PUT; IA multilíngue só com Claude | `/api/v1`, Idempotency-Key, paginação cursor, webhooks de saída assinados, multi-tenant em toda query | **Forte, com bordas** |
| **08 — Produto** | **8 telas** + **7 tools (§12)** c/ RBAC; **todos os endpoints §6**; modelo de dados | motor fiscal mock; papéis CFO/tributarista são rótulos | integrações reais (diários/ERPs), jobs de ingestão | **Entregue (MVP)** |
| **0A — IA Core** | provider trocável; tools+RBAC; copiloto everywhere; agente; feedback; auditoria; **cérebro local 4 idiomas ✅** | RAG ignora `orgId`; treino = snapshot; conectores stub | `/ai/ingest`, `/connectors/:id/sync`, memória por usuário, event bus | **Núcleo ✅, escala 🟡** |
| **0B — WhatsApp** | webhook fail-closed + HMAC; `/send`; push proativo; auditoria; mesmo cérebro; **confirmação "responda SIM" ✅**; **4 línguas ✅** | binding seedado | opt-in c/ código, mídia, gating por plano | **Canal ✅, governança 🟡** |
| **0C — Painel do Dono** | overview; **flags runtime**; auditoria; RBAC único; **entitlements (papel E plano) ✅**; **CRUD de tenants/planos + users + `/admin/*` ✅** | impersonation = mock; 2 níveis admin parciais | CMS da landing, billing, config IA/WhatsApp por tenant, matriz de permissões | **CRUD ✅, resto 🟡** |
| **0D — Modular/API** | registry de módulos; flags ligam/desligam ao vivo; contrato tipado FE↔BE; **seam de persistência (novo)** | manifesto de módulo "leve"; entitlement não aplicado; views client importam store | API versionada, SDK gerado, event bus | **Modular ✅, contrato 🟡** |

---

## As 10 lacunas reais (spec pede → falta)

1. 🟡 **PARCIAL — 0C Painel do Dono: CRUD principal ENTREGUE.** ✅ **FEITO:** criar/suspender/reativar **tenants** (`createTenant`/`setTenantStatus` + `POST/PATCH /api/owner/tenants`, na UI), **editar entitlements/preço/fee de planos** (`updatePlan` + `PUT /api/owner/plans/[id]`, editável na UI e casa com a aplicação em runtime), **listar usuários globais** (`GET /api/owner/users`, sem hash) — tudo gateado `platform_owner`, auditado e **testado** (`admin.test.ts`). **Ainda falta:** CMS da landing (4 idiomas), billing, config de IA/WhatsApp por tenant, editor de matriz de permissões, impersonation real (segue toast). *(0C §2.2/§2.3/§2.4/§8 ✅ · §2.5/§2.7/§2.8/§2.9/§2.10 ❌)*
2. ✅ **FECHADO — Entitlements de plano aplicados em runtime.** `acesso = papel E plano`: o rail e o command palette escondem módulos fora do plano (`isEntitled`), e o servidor filtra/nega tools por plano (`listTools`/`invokeTool` com `entitlements`). Testado (`entitlements.test.ts`). *(0C §4.4, §9 DoD c; 0D §3)*
3. ✅ **FECHADO — IA responde nos 4 idiomas por padrão.** O cérebro local agora puxa as respostas do catálogo (`brain.*`) no locale do usuário e detecta intenção por palavras-chave pt/en/zh/fr. Testado em zh-CN e fr-FR (`brain.test.ts`). *(00-PADRÃO §6.7e; 0A §6 DoD b; 0B DoD f)*
4. 🟡 **PARCIAL — WhatsApp: confirmação "responda SIM" FECHADA** (ação sensível guarda intenção e só executa após SIM, auditado — `gateway.ts`, testado). **Ainda faltam:** opt-in com verificação por código (binding é seedado), gating por plano do canal e entrada de mídia (áudio/foto/PDF). *(0B §3, §4, §8 DoD a/c/h)*
5. **0A §2.9 — superfície de API incompleta:** sem `POST /ai/ingest`, sem `POST /connectors/:id/sync`; `recommendations` está em path diferente do spec. RAG ignora `orgId`; sem memória por usuário; treino é snapshot. *(0A §2.2/2.3/2.7/2.9)*
6. **Convenções de API (00-PADRÃO §4 / 0D §4):** sem `/api/v1`, sem `Idempotency-Key` nas escritas, sem paginação por cursor, sem SDK gerado, sem **event bus** inter-módulos, sem webhooks de saída assinados.
7. **Multi-tenant na prática é single-tenant.** `orgId` existe na sessão mas as queries do store não são escopadas por tenant (Acme único). *(00-PADRÃO §8; 0A §2.2)* — **o seam de persistência novo é o primeiro passo para resolver isto.**
8. **Persistência (em andamento nesta entrega):** schema Prisma + seam (in-memory + Postgres) + seed + rotas de **leitura** ligadas. Falta o **write-side** (escritas persistirem no Postgres) e a migração das **views client → API** (hoje importam o store direto). *(0D §2/§9)*
9. **Módulos mais leves que o manifesto 0D:** sem `module.config` por módulo agregando tools/permissões/eventos/schema; tools centralizadas em `tools.ts`; rotas de API escritas à mão. *(0D §1, §9 DoD a/b)*
10. **Sem integrações/jobs reais:** conectores de diários/ERPs/assinatura e workers de ingestão/embeddings/conciliação são stubs/ausentes. *(08 §6; 0A §2.5)*

---

## O que está genuinamente entregue (não regredir)

As **8 telas** do produto + as **7 tools de IA (08 §12)** com RBAC; **todos os endpoints §6**; envelope `{data,meta,error}` com `code+messageKey`; **i18n 4 locales com paridade de chave travada por teste + fallback**; copiloto em toda tela com captura de feedback e **auditoria de toda ação de IA**; agente autônomo com ≥1 classe de decisão; webhook de WhatsApp **fail-closed + HMAC** + push proativo; **feature flags que ligam/desligam módulos ao vivo**; sessões JWT fail-closed, `requireRole` server-side, rate-limit duplo (IP + sujeito). E agora o **seam de persistência** Prisma/Postgres pronto para ativar.

---

## Prioridade recomendada para fechar as lacunas

1. ✅ **FEITO — Entitlements em runtime** (#2): gate por `papel E plano` no rail/palette + filtragem/negação de tools no servidor.
2. ✅ **FEITO — IA 4 idiomas no cérebro local** (#3): respostas via catálogo + detecção de intenção pt/en/zh/fr.
3. ✅ **FEITO — Confirmação "responda SIM" no WhatsApp** (#4, parte c): ação sensível só executa após SIM.
4. 🟡 **EM PARTE — CRUD do Painel do Dono + `/admin/*`** (#1): tenants (criar/suspender), planos (entitlements/preço/fee) e users globais **feitos e testados**; faltam CMS da landing, billing, config por tenant, matriz de permissões.
5. **Write-side do repositório + views via API** (#8) — leva o CRUD acima a persistir no Postgres e destrava multi-tenant (#7).
6. **Integrações/jobs reais, billing, event bus, API v1/SDK** (#5,#6,#10) — dependem de infra/decisões de produto.
7. **WhatsApp restante** (#4): opt-in com verificação por código, entrada de mídia, gating por plano.
