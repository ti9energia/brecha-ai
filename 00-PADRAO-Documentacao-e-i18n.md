# 00 — Padrão de Documentação & Engenharia (base compartilhada)

> **Status:** fonte da verdade. Toda plataforma do portfólio herda este documento.
> **Idiomas obrigatórios (i18n desde o dia 1):** 🇧🇷 `pt-BR` (padrão) · 🇺🇸 `en` · 🇨🇳 `zh-CN` · 🇫🇷 `fr-FR`.
> **Leitura para o Claude Code:** comece sempre por este arquivo, depois leia a spec da plataforma específica. O que está aqui **não se repete** nas specs — elas só descrevem o que é particular do produto.

---

## 0. Documentos de arquitetura transversal (leia junto)
Esta base é complementada por quatro documentos que **toda plataforma herda** (não se repetem nas specs):
- **`0A`** — IA: **Cérebro (AI Core)** desacoplado e treinável, **Copiloto** que entende o sistema inteiro e **Agente Autônomo** de decisão, com **connectors** para outros sistemas.
- **`0B`** — **Controle por WhatsApp** (IA com nome + número; comandos em linguagem natural que leem e agem no sistema).
- **`0C`** — **Painel do Dono do SaaS** + **modelo de acessos** (papéis, permissões, planos→entitlements, editor da landing).
- **`0D`** — **Arquitetura modular & API fácil**: cada aba/função é um módulo **desacoplável** (ligar/desligar/extrair).

**Capacidades que todo produto já nasce tendo:** copiloto de IA em toda tela · agente autônomo de apoio à decisão · IA destacável para servidor próprio e treino · plugabilidade a outros sistemas · controle por WhatsApp · painel do dono com gestão de usuários/planos/landing/acessos · módulos desacopláveis com API consistente e tipada.

---

## 1. Princípios de produto e engenharia

1. **i18n-first.** Nenhuma string fica hardcoded. Toda interface, e-mail, notificação e mensagem de erro nasce com chave de tradução nos 4 idiomas. Detalhes na seção 6.
2. **Mobile-first e acessível.** WCAG 2.1 AA, navegação por teclado, contraste mínimo 4.5:1, foco visível.
3. **Vender o resultado, não a inferência.** Cada produto entrega a ação final (peça protocolada, pagamento bloqueado, prontuário gerado), não só um relatório.
4. **Wedge → expansão.** O MVP ataca uma dor pontual com ROI provável em 30 dias; os módulos avançados vêm depois.
5. **Dados proprietários como fosso.** Instrumentar desde o início a coleta do dado que melhora com o uso.
6. **Auditabilidade.** Toda ação relevante gera um registro imutável (quem, o quê, quando, resultado).

---

## 2. Stack tecnológico padrão

Salvo indicação na spec da plataforma, todas usam a mesma base:

### Front end
- **Next.js (App Router) + React + TypeScript** — SSR/SSG, rotas por segmento, RSC onde fizer sentido.
- **Tailwind CSS + shadcn/ui** — design system (tokens na seção 5).
- **next-intl** — internacionalização com rotas por locale (`/[locale]/...`).
- **TanStack Query** — estado de servidor (cache, revalidação, mutações otimistas).
- **Zustand** — estado de UI local (quando React state não basta).
- **React Hook Form + Zod** — formulários e validação (Zod compartilhado com o back end).
- **Recharts / visx** — gráficos.

### Back end
- **Node.js + TypeScript** com **NestJS** (módulos, DI, guards, interceptors). Alternativa leve: Fastify.
- **PostgreSQL + Prisma ORM** — banco relacional e migrações versionadas.
- **pgvector** — embeddings/RAG quando a plataforma usa busca semântica.
- **Redis** — cache, rate-limit e fila.
- **BullMQ** — jobs assíncronos e workers (processamento pesado, integrações lentas).
- **Object storage S3-compatível** (AWS S3 / Cloudflare R2 / MinIO) — arquivos.
- **Auth:** Auth.js (NextAuth) no FE + JWT/OAuth2 no BE; RBAC por organização (multi-tenant).

### Camada de IA
- **Anthropic Claude API** como motor principal (Messages API, tool use/function calling).
- **Orquestração:** camada própria de agentes/ferramentas; prompts versionados em `packages/prompts`.
- **Guardrails:** validação de saída por schema (Zod/JSON), limites de ação e human-in-the-loop nas ações críticas.
- **RAG:** ingestão → chunking → embeddings (pgvector) → recuperação → geração.

### Infra & DevX
- **Monorepo** com **pnpm + Turborepo**.
- **Docker** para todos os serviços; **docker-compose** para dev local.
- **CI/CD:** GitHub Actions (lint, typecheck, testes, build, deploy).
- **Deploy:** FE em Vercel; BE em Fly.io/Render/AWS ECS; Postgres gerenciado (Neon/RDS); Redis gerenciado (Upstash).
- **Observabilidade:** OpenTelemetry + Sentry (erros) + logs estruturados (pino).
- **Testes:** Vitest (unit), Playwright (e2e), Testing Library (componentes).

---

## 3. Estrutura do monorepo (igual para todas)

```
repo/
├─ apps/
│  ├─ web/                 # Next.js (produto + landing)
│  └─ api/                 # NestJS (REST/tRPC)
├─ packages/
│  ├─ ui/                  # design system (shadcn + tokens)
│  ├─ i18n/                # catálogos de mensagens (pt-BR, en, zh-CN, fr-FR) e helpers
│  ├─ config/             # eslint, tsconfig, tailwind preset compartilhados
│  ├─ db/                  # schema Prisma + client
│  ├─ schemas/            # contratos Zod compartilhados FE↔BE
│  ├─ prompts/            # prompts de IA versionados, com variantes por locale
│  └─ sdk/                 # client tipado da API (gerado)
├─ infra/                 # docker, IaC, pipelines
└─ docs/                  # esta documentação
```

**Convenção-chave:** o pacote `i18n` é compartilhado entre `web` e `api`, garantindo que e-mails, push e erros usem o **mesmo** conjunto de idiomas que a interface.

---

## 4. Convenções de API

- **REST** versionado: `/api/v1/...` (ou tRPC quando FE/BE estão no mesmo monorepo).
- **Multi-tenant:** todo recurso pertence a uma `organization`; o `orgId` vem do token, nunca do corpo da requisição.
- **Padrão de resposta:**
  ```json
  { "data": { }, "meta": { "page": 1, "total": 0 }, "error": null }
  ```
- **Erros** com código estável + chave de tradução: `{ "error": { "code": "PAYMENT_BLOCKED", "messageKey": "errors.payment_blocked" } }`. O FE traduz pela chave.
- **Idempotência** em escritas sensíveis via header `Idempotency-Key`.
- **Paginação** por cursor; **filtros** via query params; **rate-limit** por org e por usuário.
- **Webhooks** assinados (HMAC) para integrações de saída.
- **Auditoria:** middleware grava `audit_log` em toda mutação relevante.

---

## 5. Design system (tokens compartilhados)

Cada plataforma tem uma **cor primária** e uma **de acento** (definidas na própria spec). Os tokens base:

- **Tipografia:** display `Sora`; corpo `Inter`; mono/labels `JetBrains Mono`. Fontes com `font-display: swap` e subsets para `latin` + `latin-ext`; para `zh-CN`, carregar `Noto Sans SC` como fallback.
- **Escala de espaçamento:** 4px base (4/8/12/16/24/32/48/64).
- **Raio:** sm 6px, md 10px, lg 16px.
- **Temas:** claro e escuro; cor primária da plataforma vira `--brand` e gera variações por `color-mix`.
- **Componentes-base (em `packages/ui`):** Button, Input, Select, Dialog/Sheet, Table (com paginação/ordenup), Tabs, Toast, Badge/Chip, Card, EmptyState, Skeleton, FileDropzone, CommandPalette, LanguageSwitcher.
- **Estados obrigatórios em toda tela:** `loading` (skeleton), `empty` (ilustração + CTA), `error` (mensagem + retry), `success`.

---

## 6. Internacionalização — a regra dos 4 idiomas (CRÍTICO)

> **Esta seção é mandatória para o Claude Code.** Toda tela, fluxo e mensagem deve existir em `pt-BR`, `en`, `zh-CN` e `fr-FR` **antes** de ser considerada pronta.

### 6.1 Locales e roteamento
- Locales suportados: `pt-BR` (default/source), `en`, `zh-CN`, `fr-FR`.
- Rotas com prefixo de locale: `/pt-BR/...`, `/en/...`, `/zh-CN/...`, `/fr-FR/...`.
- Detecção: cookie `NEXT_LOCALE` → `Accept-Language` → default `pt-BR`.
- `LanguageSwitcher` no header e no rodapé; troca de idioma preserva a rota atual e persiste no cookie.
- `<html lang>` e `dir="ltr"` (os 4 idiomas são LTR; manter o atributo parametrizado para futura expansão RTL).

### 6.2 Estrutura dos catálogos
```
packages/i18n/messages/
├─ pt-BR.json   (fonte da verdade)
├─ en.json
├─ zh-CN.json
└─ fr-FR.json
```
- Chaves **namespaced por feature**: `dashboard.title`, `billing.invoice.status.paid`.
- Uso no FE: `const t = useTranslations('dashboard'); t('title')`.
- **Nunca** concatenar strings traduzidas; usar interpolação ICU: `t('greeting', { name })`.
- Plurais e gênero via ICU MessageFormat (`fr-FR` e `pt-BR` têm categorias de plural; `zh-CN` não pluraliza, mas as chaves seguem o mesmo formato).

### 6.3 Formatação por locale
- Datas, números e moeda via `Intl` / formatadores do next-intl (nunca formatar à mão).
- Moeda exibida conforme contexto do produto (ex.: BRL no Brasil, USD/EUR/CNY nos mercados-alvo) — a moeda do **dado** é separada da **localização** da formatação.
- Fuso horário por usuário; armazenar sempre em UTC.

### 6.4 Conteúdo dinâmico e IA
- Respostas de IA: o prompt recebe o `locale` do usuário e instrui o modelo a responder **no idioma do usuário**. Prompts têm variantes por locale em `packages/prompts`.
- Conteúdo de domínio inerentemente localizado (textos legais, modelos de prontuário, normas) é versionado **por locale** no banco.
- E-mails/notificações/push: renderizados a partir dos catálogos `i18n`, no idioma de preferência do usuário.

### 6.5 Back end e i18n
- Erros retornam **código + messageKey**; a tradução acontece no cliente (ou no serviço de e-mail) pelo catálogo.
- Resolução de locale no BE: `user.locale` → header `Accept-Language` → default.

### 6.6 Qualidade e workflow de tradução
- `pt-BR` é a fonte; toda chave nova entra primeiro lá.
- **Lint de i18n** no CI: falha o build se uma chave existir em um catálogo e faltar em outro (os 4 ficam sempre em sincronia).
- Fallback em runtime: `zh-CN`/`fr-FR`/`en` ausente → cai para `en` → `pt-BR`.
- **Pseudo-locale** (`xx`) para QA visual de expansão de texto.
- Notas de expansão de texto a considerar no layout: `fr-FR` ~ +15–20% mais longo que `pt-BR`; `zh-CN` costuma ser mais curto, porém exige fontes CJK e quebras corretas. Layouts não podem assumir comprimento fixo de string.

### 6.7 Definition of Done de cada tela
Uma tela só está pronta quando: (a) zero strings hardcoded; (b) chaves presentes nos 4 catálogos; (c) datas/números/moeda formatados por locale; (d) testada com pseudo-locale sem quebra de layout; (e) respostas de IA saem no idioma do usuário.

---

## 7. Template de documentação (toda spec de plataforma segue esta ordem)

1. **Visão geral** — o que é, problema, proposta de valor, tipo (SaaS/TaaS/etc.), cor primária/acento.
2. **Personas & casos de uso** — quem usa e os jobs-to-be-done.
3. **Arquitetura de informação** — mapa de abas/telas (a navegação completa).
4. **UX detalhada por tela** — objetivo, componentes, estados (loading/empty/error/success), interações.
5. **Front end** — rotas, componentes-chave, estado, integração i18n, pontos de design.
6. **Back end** — módulos/serviços, modelo de dados (entidades), endpoints da API, auth, integrações, jobs/workers.
7. **Fluxos ponta a ponta** — os fluxos centrais, passo a passo, com o dado cruzando FE↔BE↔IA.
8. **Internacionalização** — particularidades de i18n do produto (além do padrão desta seção 6).
9. **Landing page** — seções, direção de copy, CTAs, SEO, i18n da LP.
10. **Modelo de negócio & métricas** — preço e métricas a instrumentar.
11. **Roadmap de construção (MVP → v1)** — ordem de build para o Claude Code.

---

## 8. Segurança & conformidade (base)

- **LGPD/GDPR/PIPL:** consentimento, minimização de dados, direito de exclusão, registro de tratamento. (PIPL é relevante por causa do `zh-CN`.)
- **Criptografia:** em trânsito (TLS) e em repouso; segredos em vault, nunca no código.
- **Auditoria** imutável de ações sensíveis.
- **Isolamento multi-tenant** garantido em toda query (linha de `orgId`).
- **Human-in-the-loop** obrigatório para ações irreversíveis executadas por IA.
