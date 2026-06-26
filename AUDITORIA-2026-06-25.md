# Auditoria & Evolução — Brecha.ai

> **Data:** 2026-06-25 · **Escopo:** revisão completa (arquitetura, código, segurança, API, banco, front-end, i18n, infra) + execução das correções de alta prioridade.
> **Baseline na entrada:** typecheck limpo · 77 testes · build OK. **Na saída:** typecheck limpo · **111 testes** · build OK (41 páginas).
>
> **Conformidade com os specs (0A/0B/0C/0D/08/00-PADRÃO):** ver [`CONFORMIDADE-SPECS.md`](CONFORMIDADE-SPECS.md) — matriz entregue/parcial/ausente por spec + as 10 lacunas reais.

---

## 1. Diagnóstico completo

### 1.1 O que é o projeto
**Brecha.ai** — *GPS de oportunidade regulatória* (AI SaaS, mercado BR no MVP). Monitora mudanças normativas (federal/estadual/municipal), simula o impacto na estrutura fiscal/jurídica de cada cliente e **recomenda — e executa, com aprovação humana do tributarista — a reorganização ótima** (regime, enquadramento, jurisdição) antes da janela fechar. Cobra *success fee* sobre a economia capturada.

### 1.2 Estágio
**MVP/v1 demonstrável, maduro e coeso.** A spec descreve um monorepo multi-serviço (Next.js + NestJS + Postgres + Redis + pgvector + AI Core + WhatsApp); a implementação condensa tudo num **único app Next.js 15** preservando a **modularidade** (cada aba é um módulo desacoplável). ~13k linhas, 0 dependência de runtime além de `next`/`react`/`lucide-react`. Roda 100% sem chaves (dados em memória + "cérebro de domínio" determinístico; Claude opcional).

### 1.3 O que já está implementado (✅)
- **8 telas do produto** + Detalhe da oportunidade (norma-gatilho + simulação antes/depois + jogada + abertura).
- **Workspace estilo navegador**: abas abríveis/fecháveis, split view, command palette (⌘K), status bar, atalhos.
- **IA (0A)**: AI Core com provider trocável (Claude + fallback local), **registry de tools com RBAC**, RAG (keyword in-memory), connectors, pipeline de treino (snapshot de feedback). Copiloto **Vega** + Agente autônomo + feedback 👍/👎.
- **WhatsApp (0B)**: webhook bidirecional (verificação Meta + assinatura HMAC + vínculo número↔usuário), saída e push proativo, tudo auditado.
- **Painel do Dono (0C)**: MRR/tenants/satisfação da IA, planos→entitlements, **feature flags que ligam/desligam módulos em runtime**, auditoria.
- **Segurança**: sessão JWT HS256 (Web Crypto, fail-closed em prod), RBAC server-side (`requireRole`), rate-limit por IP **e por sujeito**, comparações em tempo constante, guarda anti open-redirect no middleware.
- **i18n (4 idiomas)**: pt-BR (fonte) · en · zh-CN · fr-FR, **paridade de 476 chaves** (era 466), fallback em cadeia, formatação `Intl` por locale.
- **PWA**, **a11y** (focus-trap, ARIA, navegação por teclado), **CI** (typecheck + build), **Docker/Fly/Vercel**, testes (agora 94).

### 1.4 Parcialmente implementado (🟡)
- **RAG** é índice keyword in-memory (interface pronta para `pgvector`/Qdrant — ponto `// SWAP`).
- **Connectors** são de demo (interface pronta para diários oficiais/ERPs estilo MCP).
- **Treino** é snapshot do feedback (sem curadoria→finetune→eval real).
- **Motor fiscal** é determinístico/plausível (mock), não um motor tributário real.
- **Persistência** é in-memory (muta no processo) — espelha o contrato Prisma/Postgres, mas reinicia a cada deploy.
- **Equipe & papéis** na tela de Configurações é visual (mock, sem CRUD real).

### 1.5 Faltando (❌) — ver Roadmap §4
Banco real + migrações; ingestão real de normas; motor fiscal real validado; multi-tenant de verdade (hoje single-tenant Acme); billing/success-fee real; observabilidade (logs estruturados/tracing/métricas); E2E e testes de carga.

### 1.6 Requisitos
- **Funcionais:** detectar janela → simular jogada → abrir oportunidade → aprovar (tributarista) → executar → conciliar economia/fee; copiloto + agente + WhatsApp; painel do dono; i18n. **Atendidos no nível de demo.**
- **Não-funcionais:** segurança (RBAC, sessão assinada, rate-limit) ✅; i18n/formatos ✅; performance (code-splitting por view, SSG das páginas públicas) ✅; a11y ✅; escalabilidade (pontos `// SWAP` desenhados) 🟡; observabilidade ❌; persistência durável ❌.

### 1.7 Inconsistências de arquitetura encontradas
1. **Componentes client importam o `store` do servidor** (`SimulatorView`, `SettingsView`, `StructureView`, `OpportunityCard`...) — empacota código/seed do servidor no bundle do cliente; sem guarda `server-only`. As rotas HTTP equivalentes (§6) existem mas **não são chamadas pela UI** (a UI lê o store direto). É a maior inconsistência estrutural (não é bug funcional no demo, vira bug ao extrair o AI Core/Postgres).
2. **Dupla fonte de verdade de metadados**: `[locale]/layout.tsx` traduz `<title>`/description num mapa inline paralelo ao catálogo i18n.
3. **Mutação in-memory não-reativa**: views re-consultam o store via `tick` após aprovar execução (anti-pattern aceitável no demo).

---

## 2. Lista de melhorias REALIZADAS nesta auditoria

> Todas verificadas: **typecheck limpo · 94 testes passando · build OK**.

### 🔴 Segurança (broken access control) — corrigido
| # | O quê | Por quê | Impacto / Risco |
|---|---|---|---|
| S1 | **`PUT /api/structure`** agora exige `manager+` (`requireRole`) + rate-limit | Antes, **qualquer sessão** (viewer/member) sobrescrevia regime, faturamento, jurisdições — inconsistente com a tool `structure:update` que já era `WRITERS`. | Fecha escalonamento horizontal de escrita. Happy-path do demo (login = Marina, *manager*) intacto. |
| S2 | **`PUT /api/settings`** agora exige `manager+` + rate-limit | Idem: viewer/member trocava nome da org, persona da IA, **número de WhatsApp**, setores. | Idem. |
| S3 | **Webhook WhatsApp fail-closed** | `POST` só verificava assinatura *se* `WHATSAPP_APP_SECRET` existisse (**fail-open**): em prod sem o segredo, qualquer POST era processado **como o usuário vinculado ao número** (impersonação + forja de auditoria + abuso de custo de IA). O verify-token do GET tinha default público `"brecha-verify"`. | Em prod, sem segredo → **503**; sem verify-token → **403**. Dev mantém retrocompat. Status corrigido 401→**403** (era status/chave divergentes). |

### 🟠 Acessibilidade & correção de front-end — corrigido
| # | O quê | Por quê |
|---|---|---|
| A1 | **Contraste WCAG AA** dos tokens `--ink-3`/`--ink-4` (temas escuro e claro) | `--ink-4` escuro = **2.3:1** e `--ink-3` = 3.97:1 (reprovavam AA), usados em StatusBar, timestamps, eyebrows. Recalibrados para **~5.1:1** (ink-3) e **~4.1:1** (ink-4), preservando a hierarquia. |
| A2 | **Hydration mismatch** de `new Date()` em 4 views | `fmt.date(new Date())` sem `timeZone` renderiza no SSR (UTC) e diverge do cliente perto da virada do dia. Centralizado num componente `UpdatedAt` que só preenche a data **após a montagem** (mesmo padrão do relógio do StatusBar) — também elimina a duplicação 4×. |

### 🟡 i18n — corrigido
| # | O quê | Por quê |
|---|---|---|
| I1 | **`demoHint` falso em en/zh-CN/fr-FR** ("qualquer credencial entra") | O login autentica contra 4 usuários seedados (senha `demo1234`) — a dica em 3 idiomas mentia. Alinhada à realidade (igual ao pt-BR). |
| I2 | **Hacks frágeis de string no `SimulatorView`** | `tc("days").replace("dias","meses")` e `.replace("/","")` quebravam fora do pt-BR. Adicionada chave `common.months` (4 locales) e uso direto de `perYear`. Removido ternário no-op (`"Área SUDENE" : "Área SUDENE"` → `: "SP"`). |
| I3 | **Cabeçalhos de tabela frágeis no `SettingsView`** | `t("orgName").split(" ")[0]` quebrava em zh-CN (sem espaço) e em en; `<th>E-mail</th>` hardcoded. Novas chaves `settings.memberName`/`memberEmail` (4 locales). |
| I4 | **Depoimento hardcoded em PT na landing** | Frase em português aparecia para visitantes en/zh/fr. Nova chave `landing.testimonial` (4 locales). |

### 🟢 Qualidade / dedup — corrigido
| # | O quê |
|---|---|
| Q1 | Prop morta `index` em `OpportunityCard` removida (+2 call sites). |
| Q2 | Componente `EmptyState` (existia, nunca usado) **adotado** em Opportunities/Radar/Execution — remove ~8 linhas de markup duplicado por view. |
| Q3 | **+17 testes** novos: `guard.test.ts` (RBAC), `writes-rbac.test.ts` (wiring de structure/settings), `webhook/route.test.ts` (fail-closed). |
| Q4 | Docs atualizados: `DEPLOY.md` (fail-closed do WhatsApp), `README-BRECHA.md` (credencial demo real), este relatório. |

### 🟣 Segunda onda — a11y de widgets, performance e i18n (continuação) — corrigido
> Verificadas: **typecheck limpo · 94 testes · build OK**.

| # | O quê | Por quê |
|---|---|---|
| W1 | **CommandPalette** acessível: `role=combobox/listbox/option`, `aria-expanded/controls/activedescendant`, `aria-selected` e `scrollIntoView` na seleção por teclado. | Leitor de tela não anunciava nada; a seleção podia sair da viewport. |
| W2 | **Pane (abas)**: `role=tablist` passa a conter **só** tabs (o "+" virou irmão); conteúdo vira `role=tabpanel` com `aria-labelledby`; **roving tabindex**; **←/→** navegam e **Ctrl+Shift+←/→** reordenam por teclado. | tablist tinha filho inválido; tabs sem associação/roving/teclado; reordenar era só mouse. |
| W3 | **LanguageSwitcher**: navegação por **↑/↓/Home/End/Escape**, foco no idioma atual ao abrir, `aria-activedescendant`, foco retorna ao gatilho no Escape. | Abria mas era inoperável por teclado. |
| W4 | **Memoização dos contextos** (`workspace/store.tsx`, `Copilot.tsx`): fachada em `useMemo` → só muda quando o estado muda. | Objeto recriado a cada render re-renderizava NavRail/TopBar a cada tecla. |
| W5 | **Bug do Copiloto** (audit Low): prompt "Perguntar" era engolido se o painel já estivesse aberto → corrigido com `askTrigger`. | Efeito dependia só de `[open, send]`. |
| W6 | **reduced-motion**: `CountUp`/`LiveTicker` respeitam `prefers-reduced-motion` (valor estático); o ticker caiu de ~60fps p/ ~10fps. | rAF perpétuo na landing, ignorando a preferência do SO. |
| W7 | **i18n**: SEO `<title>`/description movidos p/ o catálogo (`meta.*` — fonte única, era mapa inline no layout); **tons da IA localizados** (rótulo por locale, valor canônico persistido). | Dupla fonte de verdade; dropdown de tom em PT para todos. |
| W8 | **Fronteira cliente↔servidor documentada** no `store` (por que não leva `server-only` hoje + caminho de produção). Verificado: **nenhum segredo vaza** (senhas/JWT só no servidor). | Tornar a dívida explícita e seu caminho de saída. |

### 🟤 Terceira onda — a11y fina, dedup e hygiene — corrigido
> Verificadas: **typecheck limpo · 94 testes · build OK**.

| # | O quê | Por quê |
|---|---|---|
| X1 | **TopBar "✦ Vega"**: glifo ✦ agora `aria-hidden` + `aria-pressed` (nome acessível = "Vega", casa com o rótulo visível — WCAG *Label in Name*). | Botão sem nome claro / sem estado de toggle. |
| X2 | **Gráfico de Economia**: `aria-label` descritivo (`savings.chartAria`, 4 locales) — antes era só "Realizado" num gráfico que mostra realizado **e** projetado. | Rótulo enganoso para leitor de tela. |
| X3 | **Blips do HeroInstrument**: viram botões de verdade (`onClick`+`aria-pressed`) — Enter/clique selecionam o blip, como o hover/foco. | Botão não fazia nada ao ativar por teclado. |
| X4 | **Dedup**: fração do anel (`apertureFraction`) e peso de esforço (`EFFORT_VALUE`) extraídos para `ui/opp.ts` (eram idênticos em 3 lugares). **status→tom NÃO** foi unificado: os mapas **diferem** por contexto (card/execução/detalhe) — confirmado lendo os 3. | DRY seguro; evitei merge que mudaria o visual. |
| X5 | **Hygiene de timers**: `Toast` e `SettingsView` limpam `setTimeout` no unmount (e dedup de saves rápidos). | Callback órfão após desmontar. |

### 🔵 Quarta onda — Persistência (Postgres + Prisma), read-path
> Verificadas: **typecheck limpo (valida `prisma/seed.ts` + mappers) · 99 testes · build OK**.

| # | O quê | Por quê |
|---|---|---|
| P1 | **Schema Prisma** (`prisma/schema.prisma`) — modelo de registro espelhando `domain/types.ts` (12 entidades; value-objects ricos em Json; arrays nativos; multi-tenant via orgId). | Modelo de dados real, versionável, pronto p/ `migrate`. |
| P2 | **Seam de repositório** (`src/server/db/`): interface `Repository` única + `InMemoryRepository` (delega ao seed) + `PrismaRepository` (Postgres) + `getRepository()` por `DATABASE_URL`. | Trocar o backing store vira **config, não reescrita** (padrão `// SWAP`). |
| P3 | **Rotas de leitura ligadas ao seam**: `/api/opportunities`, `/api/opportunities/[id]`, `/api/radar`. Default in-memory = comportamento idêntico (demo/testes intactos). | Prova o seam ponta a ponta sem split-brain (normas/leitura). |
| P4 | **Seed do Postgres** (`prisma/seed.ts`) a partir do **mesmo** conteúdo do demo (idempotente) + scripts `db:generate/migrate/deploy/seed/studio` + `postinstall: prisma generate`. | Fonte única; pronto p/ `npm run db:migrate && db:seed`. |
| P5 | **+5 testes** do seam (`repository.test.ts`) + docs (`.env.example`, `DEPLOY.md` "Banco de dados"). | Trava o contrato in-memory; documenta a ativação. |

> **Honestidade do estado:** o caminho Prisma é **verificado por typecheck + `prisma generate`** (queries validadas contra os tipos gerados), **não contra um Postgres real** nesta sessão. As **escritas** (PUT `/structure`, execução, settings) ainda vão ao store in-memory — o **write-side** e a migração **views client→API** são o próximo marco (§3 Alta).

### 🟩 Quinta onda — Lacunas de spec acháveis em código (DoD de 0A/0B/0C/0D)
> Verificadas: **typecheck limpo · 105 testes · build OK**. Detalhe e matriz completa em [`CONFORMIDADE-SPECS.md`](CONFORMIDADE-SPECS.md).

| # | O quê | Spec / DoD |
|---|---|---|
| G1 | **Entitlements em runtime (acesso = papel E plano)**: `orgEntitlements`/`isModuleEntitled` no store; rail/command palette escondem módulos fora do plano; `listTools`/`invokeTool` filtram e **negam** tools por plano no servidor. +4 testes. | 0C §4.4, §9 DoD c; 0D §3 |
| G2 | **Cérebro local em 4 idiomas**: respostas vêm do catálogo (`brain.*`, 24 chaves × 4 locais) no locale do usuário; **detecção de intenção por palavras-chave pt/en/zh/fr**. Antes só pt/en. +1 teste (zh/fr). | 00-PADRÃO §6.7e; 0A §6 DoD b; 0B DoD f |
| G3 | **Confirmação "responda SIM" no WhatsApp**: ação sensível (aprovar execução) guarda a intenção por número e **só executa após SIM** (NÃO cancela), via tool governada + auditoria. +1 teste. | 0B §8 DoD c |

> **Ainda aberto** (precisa de infra ou é o maior bloco): write-side da persistência, multi-tenant real, integrações/jobs/billing, opt-in/mídia do WhatsApp. Ver `CONFORMIDADE-SPECS.md`.

### 🟧 Sexta onda — CRUD do Painel do Dono (0C §2.2/§2.3/§2.4/§8)
> Verificadas: **typecheck limpo · 111 testes · build OK**.

| # | O quê | Spec |
|---|---|---|
| O1 | **CRUD de tenants**: `createTenant` + `setTenantStatus` (suspender/reativar) no store; UI com botão "Novo tenant" e ações por linha; endpoints `POST /api/owner/tenants` e `PATCH /api/owner/tenants/[id]`. | 0C §2.2 |
| O2 | **Edição de planos**: `updatePlan` (preço/fee/entitlements); na UI os entitlements viram chips clicáveis que **ligam/desligam módulos do plano** (casa com a aplicação em runtime da 5ª onda); `PUT /api/owner/plans/[id]`. | 0C §2.4 |
| O3 | **Usuários globais**: `listUsers` (sem hash) + `GET /api/owner/users`. | 0C §2.3 |
| O4 | Todos os endpoints **gateados `platform_owner`** (middleware + handler), rate-limited, **auditados**, e **testados** (`admin.test.ts`, +6). | 0C §8, §9 DoD b/c |

> **Ainda aberto em 0C:** CMS da landing (4 idiomas), billing, config de IA/WhatsApp por tenant, matriz de permissões, impersonation real (segue toast). Persistir no Postgres depende do write-side do repositório (§3 Alta).

---

## 3. Pendências (não tratadas — por decisão de escopo/risco)

> O que sobra exige **infra externa (DB)**, é refator transversal acoplado ao Postgres, ou é cosmético/por-design.

**Alta:**
- **Migrar o `store` para Postgres/Prisma + `server-only` + views consumindo `/api/*` ou Server Actions** (inconsistência §1.7.1). Refator transversal naturalmente **acoplado à persistência real** (muda a UX instantânea do demo, então vai junto do DB). Hoje a fronteira está **documentada** no cabeçalho do `store`; verificado que **nada sensível vaza** — só seed + motor fiscal.

**Média:**
- **Dropdowns de domínio BR** (Simulator: classes/jurisdições) deixados em PT **de propósito**, como os REGIMES ("Lucro Real"…) — termos próprios do domínio fiscal brasileiro, não copy de UI. (Os **tons da IA**, que são copy, foram localizados — W7.)

**Baixa:**
- fr-FR `savings.successFee` = "Success fee" (loanword consistente com `feeBase`/`feeRate`/`feeDue` no mesmo painel — **de propósito**).
- `EmptyState` do `AgentView` (estrutura própria) e `Stat`/`StatTile`/`Skeleton` ociosos ainda não unificados. O mapa **status→tom** segue duplicado **de propósito** (difere por contexto card/execução/detalhe); a **fração do anel/esforço foi unificada** (`ui/opp.ts` — X4) e os **timers, limpos** (X5).
- Equipe & papéis (Configurações) seguem mock visual.

---

## 4. Roadmap futuro

### Prioridade ALTA
| Item | Complexidade | Dependências | Estimativa | Riscos |
|---|---|---|---|---|
| **Persistência real** (Postgres + Prisma; trocar o `store` in-memory mantendo a interface) | Alta | Provider de DB (Neon/Vercel Marketplace) | 1–2 sem | Migrar mutações in-memory → transações; manter contrato dos testes |
| **`server-only` + UI via API/Server Actions** | Média | — | 2–4 dias | Regressão de bundle/SSR; cobrir com E2E |
| **Observabilidade** (logs estruturados, tracing, métricas, alarmes) | Média | Provedor (Vercel/OTel) | 3–5 dias | — |
| **Hardening multi-tenant** (hoje single-tenant Acme; isolar por `orgId` em todas as queries) | Alta | Persistência | 1 sem | Vazamento cross-tenant se incompleto |

### Prioridade MÉDIA
| Item | Complexidade | Dependências | Estimativa |
|---|---|---|---|
| **RAG real** (`pgvector`/Qdrant: embeddings + ANN) no ponto `// SWAP` de `knowledge.ts` | Alta | DB/serviço de vetor | 1 sem |
| **Connectors reais** (diários oficiais federal/estadual/municipal; ERPs) estilo MCP | Alta | Acesso às fontes | 2–4 sem |
| **Billing & success-fee** real (Stripe/medição de economia conciliada) | Alta | Persistência | 1–2 sem |
| **E2E (Playwright)** dos fluxos críticos: login→workspace, aprovar execução, trocar locale | Média | — | 3–5 dias |

### Prioridade BAIXA
| Item | Complexidade | Estimativa |
|---|---|---|
| Pipeline de treino real (curadoria→finetune→eval→`modelo@vN`+rollback) | Alta | 2–4 sem |
| Unificar `Stat`/`EmptyState`/`Skeleton` restantes; limpeza de timers e duplicações menores | Baixa | 1 dia |
| Testes de carga (k6) das rotas de IA/simulador | Média | 2–3 dias |

---

## 5. Arquitetura atualizada

```
src/
├─ app/
│  ├─ [locale]/            # pt-BR | en | zh-CN | fr-FR  (SSG)
│  │  ├─ page.tsx          # landing  ├─ login/  ├─ app/ (workspace)  ├─ legal/
│  ├─ api/                 # route handlers — envelope { data, meta, error }
│  │  ├─ auth/ health/ opportunities/ radar/ structure/ settings/ simulator/
│  │  ├─ savings/ owner/ agent/ ai/{chat,feedback,tools,tools/invoke,connectors,agent/run}
│  │  └─ whatsapp/{webhook,send}     ← webhook agora FAIL-CLOSED em prod
│  └─ manifest.ts / robots.ts / sitemap.ts
├─ middleware.ts           # locale + auth de páginas/API (gate primário)
├─ server/
│  ├─ domain/  (types, seed normas reais 2026, store = motor fiscal in-memory)
│  ├─ ai/      (brain determinístico, claude provider)
│  ├─ ai-core/ (provider trocável, tools+RBAC, knowledge/RAG, connectors, training)
│  ├─ auth/    (session JWT HS256, users seedados, guard requireRole)  ← writes manager+
│  ├─ security/(rateLimit por IP e por sujeito)
│  └─ whatsapp/(gateway: número↔usuário, assinatura HMAC, saída/push)
├─ workspace/ (shell: store/registry/Pane/NavRail/TopBar/CommandPalette + views/)
│  └─ views/shared.tsx  ← novo <UpdatedAt/> (corrige hydration; centraliza eyebrow)
├─ i18n/      (4 catálogos · 476 chaves · engine + fallback + Intl)
├─ ui/        (design system; EmptyState agora adotado)
└─ components/(Copilot, OpportunityCard, SiteHeader/Footer, Hero…)
```

**Camadas de troca para escala (já contratadas, `// SWAP`):** Modelo → `selfHostedProvider`; Tools → por módulo (`module.config`); RAG → pgvector/Qdrant; Connectors → integrações reais; Treino → finetune/eval. **O produto fala só com a fachada `aiChat()`.**

---

## 6. Estimativa de evolução do projeto
- **Hoje:** demo premium fiel à spec, segura no nível de sessão/RBAC/rate-limit, i18n sólida, pronta para impressionar e validar produto. **Não é produção** (sem DB durável, sem dados reais, single-tenant).
- **→ Piloto real (1 cliente):** Persistência + observabilidade + `server-only` + 1 connector real + ingestão básica. **~3–5 semanas.**
- **→ Produção multi-tenant:** + hardening multi-tenant + RAG real + billing/success-fee + E2E/carga. **~2–3 meses** acumulados.
- **→ Escala/IA própria:** + finetune/eval + connectors amplos + extração do AI Core como serviço. **trimestral, contínuo.**

---

## 7. Riscos técnicos
1. **Persistência in-memory** — perda de estado a cada deploy/restart; não escala horizontalmente. *Mitigação:* Postgres no ponto de troca do `store`.
2. **Código de servidor no bundle do cliente** (sem `server-only`) — risco de vazar lógica/seed e quebrar ao extrair serviços. *Mitigação:* `server-only` + API/Server Actions.
3. **Single-tenant disfarçado de multi-tenant** — `orgId` existe mas o store é único (Acme). *Mitigação:* escopar toda query por tenant antes de abrir para 2+ clientes.
4. **Motor fiscal mock** — números plausíveis, não auditáveis juridicamente. *Mitigação:* motor real + validação tributarista (o fluxo de aprovação humana já existe).
5. **Rate-limit/sessão in-memory** — não consistente entre instâncias. *Mitigação:* KV (Upstash/Vercel) na mesma interface.
6. **Sem observabilidade** — incidentes difíceis de diagnosticar em produção. *Mitigação:* logs estruturados + tracing + alarmes.
7. **WhatsApp**: agora fail-closed (bom), mas os **vínculos número↔usuário são seedados no repo** — em produção exigem opt-in com verificação por código.

---

## 8. Próximos passos recomendados (ordem)
1. **Persistência (Postgres + Prisma)** trocando o `store` pela mesma interface — destrava multi-tenant, billing e durabilidade.
2. **`import "server-only"` no store** + migrar views client para as rotas HTTP/Server Actions.
3. **Observabilidade** (logs estruturados + tracing + métricas) antes do primeiro cliente real.
4. **1 connector real** (ex.: Diário Oficial da União) + ingestão/embeddings reais (RAG `pgvector`).
5. **E2E (Playwright)** dos fluxos críticos + **carga (k6)** nas rotas de IA/simulador.
6. **A11y de widgets compostos** + memoização de contextos (varredura rápida, alto retorno de UX).
7. **Hardening multi-tenant** + **billing/success-fee** quando entrar o 2º tenant.

---

### Anexo — como verificar esta entrega
```bash
npm run typecheck   # limpo
npm test            # 94 passando (16 arquivos)
npm run build       # compila, 39 páginas, exit 0
```
