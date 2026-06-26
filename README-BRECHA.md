# Brecha.ai — GPS de Oportunidade Regulatória

**▲ Em produção: [brecha-ai.vercel.app](https://brecha-ai.vercel.app)**

[![CI](https://github.com/ti9energia/brecha-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ti9energia/brecha-ai/actions/workflows/ci.yml)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fti9energia%2Fbrecha-ai&project-name=brecha-ai&repository-name=brecha-ai)
&nbsp;`Next.js 15` · `TypeScript` · `Tailwind v4` · `Prisma` · `140 testes` · `4 idiomas` · `PWA`

> **Detecta a janela. Simula a jogada. Executa antes de fechar.**
> Plataforma SaaS premium construída de ponta a ponta a partir das specs (`08-Brecha-ai.md` + arquitetura transversal `0A`/`0B`/`0C`/`0D`).

Brecha.ai monitora cada mudança normativa (federal, estadual, municipal), simula o impacto na estrutura fiscal/jurídica do cliente e **recomenda — e executa, com aprovação humana — a reorganização ótima** (enquadramento, regime, jurisdição) no timing certo, antes da janela fechar. Cobra success fee sobre a economia capturada.

---

## ▶ Como rodar

```bash
npm install
npm run dev          # http://localhost:3000  → redireciona para /pt-BR
```

Build de produção:

```bash
npm run build && npm start
```

**Roda 100% sem nenhuma configuração.** Nenhuma chave, banco ou infra externa é necessária — os dados vivem em memória (seed regulatório brasileiro real) e o Copiloto usa um "cérebro de domínio" determinístico que consulta esses dados.

### Ligar o Claude de verdade (opcional)

O AI Core já fala com a Anthropic. Crie `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...      # liga o Claude (claude-opus-4-8)
# AI_CORE_MODEL=claude-opus-4-8   # opcional
```

Sem a chave, o Copiloto continua funcionando (cérebro local). Com a chave, o Claude refina as respostas mantendo as ações e fontes calculadas sobre os dados reais.

---

## ✦ O que foi entregue

| Área | Entregue |
|---|---|
| **Landing page** | Herói "surreal" com radar/aurora animados, instrumento de radar com blips das oportunidades reais, ticker de "dinheiro na mesa" ao vivo, como-funciona, setores, success fee, planos (do CMS), FAQ, CTA. |
| **Login** | Split-screen premium (painel de marca + formulário): e-mail/senha, Google, link mágico. Demo: `marina.alves@acme.com.br` · senha `demo1234` (4 usuários seedados com papéis distintos; comparação de hash em tempo constante). |
| **Workspace (estilo Chrome)** | **Abas** abríveis/fecháveis por painel + **split view** (vertical/horizontal). Nav rail, command palette (`⌘/Ctrl+K`), status bar ao vivo, atalhos (`⌘K`, `⌘J`, `⌘\`). |
| **8 telas do produto** | Oportunidades · Detalhe (norma-gatilho + simulação antes/depois + jogada + Abertura) · Radar normativo · Minha estrutura · Simulador · Execução (aprovação + trilha) · Economia capturada · Configurações. |
| **Inteligência** | Copiloto **Vega** em toda tela (`⌘J`) + Agente autônomo (fila de recomendações) + feedback 👍/👎 que alimenta o dataset de treino do AI Core. |
| **Painel do Dono (0C)** | Visão geral (MRR, tenants, satisfação da IA), tenants, planos & entitlements, **feature flags que ligam/desligam módulos ao vivo**, auditoria. |
| **Backend** | Camada de domínio modular + route handlers (`/api/...`) no envelope `{ data, meta, error }`. |
| **i18n (4 idiomas)** | pt-BR (fonte) · en · zh-CN · fr-FR, com troca de idioma, formatação por locale e fallback. |
| **PWA** | `manifest.webmanifest`, service worker (shell offline), ícones da marca, instalável, responsivo. |

---

## 🎨 Design — "O Terminal Regulatório"

Estética de instrumento financeiro de luxo, deliberadamente **sem cara de IA**:

- **Tinta + Ouro** — fundo de tinta profunda; ouro (`#CA8A04`) usado como folha de ouro: escasso e preciso, nunca decorativo.
- **A Abertura** — o motivo de marca: um anel de ouro (a janela regulatória) que **se fecha** conforme o prazo escorre, migrando de ouro → âmbar → rosa.
- **Grão de filme** — textura sobre toda a tela que mata o look "gradiente de IA" e dá peso físico.
- **Tipografia editorial** — Sora (display) · Inter (corpo) · JetBrains Mono (dados/rótulos), com numerais tabulares em todo valor.
- **Tema claro "pergaminho"** — alternativa em papel quente + tinta (toggle no topo).

---

## 🏗 Arquitetura

A spec descreve um monorepo multi-serviço (Next.js + NestJS + Postgres + Redis + pgvector + AI Core separado + WhatsApp). Para **rodar de imediato e performar**, tudo foi condensado num **único app Next.js 15** que preserva a **arquitetura modular** da spec — cada aba é um módulo desacoplável com sua view, dados, tools e permissões.

```
src/
├─ app/
│  ├─ [locale]/            # roteamento por idioma (pt-BR | en | zh-CN | fr-FR)
│  │  ├─ page.tsx          # LANDING premium
│  │  ├─ login/            # tela de login
│  │  └─ app/              # o WORKSPACE (abas + split)
│  ├─ api/                 # route handlers (envelope { data, meta, error })
│  └─ manifest.ts          # PWA
├─ workspace/              # shell estilo navegador
│  ├─ store.tsx            # estado de abas/painéis (context + reducer)
│  ├─ registry.tsx         # módulo → componente
│  ├─ Workspace / Pane / NavRail / TopBar / StatusBar / CommandPalette
│  └─ views/               # as 10 telas (cada módulo = um arquivo)
├─ server/
│  ├─ domain/              # tipos + seed (normas reais) + store (motor fiscal)
│  └─ ai/                  # cérebro de domínio + provider Claude
├─ i18n/                   # 4 catálogos + engine + formatadores
├─ ui/                     # design system (primitivas, ApertureRing, Logo…)
└─ components/             # Copilot, OpportunityCard, SiteHeader/Footer…
```

### Mapeamento com as specs

- **`08`** — produto Brecha.ai: as 8 telas, modelo de dados, endpoints, fluxos.
- **`0A`** — **AI Core** (`src/server/ai-core/`): provider de modelo **trocável**, registry de **tools** governado (`/api/ai/tools` + `/invoke`), **RAG**, **connectors** e export de **treino** — pontos de troca prontos para extrair como serviço (ver seção abaixo). Copiloto (`/api/ai/chat`), Agente e feedback (`/api/ai/feedback`).
- **`0B`** — WhatsApp **bidirecional**: entrada (`/api/whatsapp/webhook` — verificação Meta + assinatura HMAC + vínculo número↔usuário) pelo AI Core, saída (`/api/whatsapp/send`) e **push proativo do agente**; tudo auditado. Um número real (Meta/Twilio) só encaminha para cá.
- **`0C`** — Painel do Dono: tenants, planos→entitlements, flags, auditoria, papéis.
- **`0D`** — Modularidade: registry de módulos; os feature flags do Painel do Dono **ligam/desligam abas em runtime** (somem do rail e do command palette na hora); contrato tipado FE↔BE.

---

## 🧠 AI Core — pontos de troca para escala (modelo pré-pronto)

`src/server/ai-core/` é o "Cérebro" como módulo, pronto para virar `apps/ai-core`
(serviço separado) **sem reescrever o produto** — o contrato já existe. Quando
escalar, é só implementar a interface no ponto marcado com `// SWAP (produção):`.

| Camada | Arquivo | Hoje (demo) | `// SWAP` para produção |
|---|---|---|---|
| **Modelo** | `provider.ts` | Claude + cérebro local | `selfHostedProvider` → seu servidor de inferência/finetune |
| **Tools** | `tools.ts` | registry central c/ RBAC | cada módulo declara as suas (`module.config`, 0D) |
| **RAG** | `knowledge.ts` | índice keyword in-memory | `pgvector`/Qdrant (embeddings + ANN), mesma interface |
| **Connectors** | `connectors.ts` | connector de demo | integrações reais (diários, ERPs) estilo MCP |
| **Treino** | `training.ts` | snapshot do feedback | curadoria → finetune/eval → `modelo@vN` + rollback |

O produto fala **só** com a fachada `aiChat()`; trocar qualquer camada não toca no
resto. Endpoints já expostos: `/api/ai/{chat,feedback,tools,tools/invoke,connectors}`.

## 🧪 Dados de demonstração

Cliente: **Acme Participações S.A.** (holding industrial, Lucro Real, SP/SC/MG, R$ 480 mi/ano). Oportunidades sobre normas **reais de 2026**: transição CBS/IBS (LC 214/2025), SUDENE, Lei do Bem, Convênio ICMS CONFAZ, REPETRO, subvenção (Lei 14.789/2023), Tema 779 do STJ, Reintegra, ISS municipal.

> Nada depende de serviços externos: foco em **codar e performar** toda a experiência, com backend leve em memória.
```
```
