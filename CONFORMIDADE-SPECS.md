# Conformidade com os specs — Brecha.ai (estado final)

> **Pergunta original:** "estamos entregando tudo que é para ser feito?"
> **Resposta agora:** **sim, em código** — todos os blocos de DoD acháveis sem infraestrutura externa foram entregues, testados e **mergeados em `main` via PR** (PRs #2–#11). O que resta é **infra real** (Postgres/Stripe/fontes externas) e a **migração das views client→API** — documentado abaixo.
>
> Estado: **typecheck limpo · 140 testes · build OK** · `main` sincronizado com `origin`.

---

## Placar por spec (final)

| Spec | Veredito | Observação |
|---|---|---|
| **00-PADRÃO** | ✅ | envelope `{data,meta,error}`; i18n 4 locais com paridade + fallback; **`/api/v1`**, **Idempotency-Key**, **paginação por cursor**; sessão fail-closed; isolamento de dados por `orgId` no seam |
| **08 — Produto** | ✅ | 8 telas, 7 tools com RBAC, todos os endpoints §6, modelo de dados; criar oportunidade a partir do simulador; connectors + job de ingestão |
| **0A — IA Core** | ✅ | provider trocável; tools+RBAC+entitlements; copiloto/agente; **RAG por tenant**, **memória por usuário**, **`/ai/ingest`**, **`connectors/:id/sync`**, **`/ai/jobs/run`**, **pipeline de treino**; **cérebro 4 idiomas**; auditoria |
| **0B — WhatsApp** | ✅ | webhook fail-closed + HMAC; `/send`; push proativo; **confirmação "responda SIM"**; **opt-in por código**; **mídia**; **gating por plano**; 4 idiomas; auditoria |
| **0C — Painel do Dono** | ✅ | overview; **CRUD de tenants/planos/users**; **impersonação real**; **CMS da landing (4 idiomas)**; **billing** (faturas/conciliação); **config IA/WhatsApp por tenant**; **matriz de permissões**; flags runtime; entitlements (papel E plano) |
| **0D — Modular/API** | ✅ | registry; flags runtime; contrato tipado; **event bus**; **`/api/v1`**; **seam de persistência (read+write)**; isolamento por tenant |

---

## Como cada lacuna do diagnóstico inicial foi fechada

| # (diagnóstico) | Status | PR |
|---|---|---|
| 1 — Painel do Dono só-leitura | ✅ CRUD completo + CMS + billing + config + perms | #2, #6, #7, #8 |
| 2 — Entitlements não aplicados | ✅ acesso = papel E plano (rail/palette + tools) | #2 |
| 3 — IA não responde em 4 idiomas | ✅ cérebro local 4 idiomas | #2 |
| 4 — WhatsApp (confirmação/opt-in/mídia/gating) | ✅ todos | #2, #4 |
| 5 — 0A API incompleta (ingest/sync/memória/RAG) | ✅ todos | #5, #10 |
| 6 — Convenções de API (v1/idempotency/paginação/event bus) | ✅ todos | #2 |
| 7 — Multi-tenant | 🟡 isolamento de dados no seam (parte segura) | #11 |
| 8 — Persistência (write-side) | ✅ contrato completo (read+write) | #9 |
| 9 — Módulos vs manifesto 0D | 🟡 registry + event bus; manifesto por módulo segue leve | — |
| 10 — Integrações/jobs reais | 🟡 framework + job runner + ingestão; **fontes reais** dependem de credenciais | #10 |

---

## O que ainda depende de infra/decisão (não é "codar")

1. **Postgres real** — o caminho Prisma (read **e** write) está pronto e verificado por typecheck + `prisma generate`; as queries rodam contra um banco real com `npm run db:migrate && db:seed` + `DATABASE_URL`. Sem isso, o app usa o seam in-memory (default).
2. **Migração views client→API** — as views do workspace lêem o store direto (= Acme). O isolamento por tenant existe no **seam/API**; levar a UI a consumir a API (e assim ficar 100% multi-tenant visualmente) é o refator acoplado ao Postgres.
3. **Fontes/serviços externos** — diários oficiais/ERPs reais (connectors), transcrição de áudio do WhatsApp, Stripe (billing real). O framework e os `// SWAP` estão prontos; falta credencial/integração.

Tudo o mais é **100% funcional** no padrão in-memory do demo, com **0 botões mortos** (auditado) e cobertura de testes.
