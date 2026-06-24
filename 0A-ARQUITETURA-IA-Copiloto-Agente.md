# 0A — Arquitetura de IA: Cérebro, Copiloto e Agente Autônomo

> **Transversal a TODAS as plataformas.** Lê depois do `00-PADRAO`. Define a camada de IA que cada produto herda: um **copiloto** que entende o sistema inteiro, um **agente autônomo** de apoio à decisão, e o **AI Core ("Cérebro")** — um serviço **desacoplado, treinável em servidor próprio e plugável a outros sistemas**, ligado de volta à plataforma.

---

## 1. Visão geral em uma imagem

```
┌──────────────────────────────────────────────────────────────┐
│                        PLATAFORMA (apps/web, apps/api)        │
│   Abas/funções (módulos)  ──registram──>  Tools/Ações          │
└───────────────▲───────────────────────────────▲──────────────┘
                │ API + eventos                  │ ações governadas
                │                                 │
        ┌───────┴─────────────────────────────────┴───────┐
        │                AI CORE  ("o Cérebro")            │  ← serviço separado,
        │                                                  │     escala/treina sozinho
        │  Model layer (Claude API → modelo próprio)       │
        │  Knowledge/RAG por tenant   Memory por usuário   │
        │  Tools registry   Guardrails   Audit             │
        │  Connector framework (plugar outros sistemas)    │
        └───▲───────────────▲───────────────▲──────────────┘
            │               │               │
      ┌─────┴────┐   ┌──────┴─────┐   ┌──────┴───────┐
      │ Copiloto │   │  Agente    │   │  WhatsApp    │  (ver 0B)
      │  (UI)    │   │ Autônomo   │   │  (canal)     │
      └──────────┘   └────────────┘   └──────────────┘
            ▲
            │  ← também plugável a OUTROS sistemas/SaaS (connectors)
      ┌─────┴───────────────┐
      │ Sistemas externos    │ (ERPs, outros produtos seus, parceiros)
      └─────────────────────┘
```

**Ideia central:** o AI Core é **um serviço à parte**. A plataforma fala com ele por API; ele entende a plataforma (lê dados + age por tools governadas); e ele pode **plugar em outros sistemas** para trazer/levar informação. Copiloto, Agente Autônomo e WhatsApp são apenas **clientes** do mesmo Cérebro.

---

## 2. AI Core — o serviço desacoplado e treinável

Deploy próprio: `apps/ai-core` (ou repositório/servidor dedicado, inclusive com GPU). Escala e versiona **independente** do resto. Componentes:

### 2.1 Model layer (trocar o modelo sem tocar no produto)
- Abstração `LLMProvider`. **Começa** com **Anthropic Claude API**; depois você pode **separar a IA, subir num servidor próprio e treinar/finetunar** um modelo aberto — basta trocar a implementação do provider. O produto nunca chama o modelo direto, só o AI Core.
- Roteamento por tarefa (modelo rápido vs. forte), custo e fallback.

### 2.2 Knowledge / RAG por tenant
- Vector store por organização (pgvector ou Qdrant) com **isolamento multi-tenant** rígido.
- Ingestão contínua dos dados e documentos da plataforma + fontes externas (via connectors). Pipeline: ingestão → chunking → embeddings → recuperação.

### 2.3 Memory por usuário/tenant
- Memória de longo prazo: decisões aprovadas, preferências, contexto recorrente. Alimenta copiloto e agente para respostas consistentes.

### 2.4 Tools / Ações registry (como a IA "entende e ajuda em tudo")
- Cada **módulo da plataforma** (cada aba/função — ver `0D`) **registra suas tools** (ler X, criar Y, executar Z) com schema de entrada/saída (Zod) e a **permissão exigida**.
- O AI Core descobre as tools disponíveis e as usa via function calling. Assim o copiloto realmente conhece e opera o sistema inteiro, e ganha automaticamente toda função nova que um módulo registrar.

### 2.5 Connector framework (plugar com outros sistemas)
- Connectors padronizados (estilo **MCP**) para **puxar informação de sistemas externos** (ERPs, parceiros, **seus outros SaaS**) e trazer para esta plataforma — e para **levar/compartilhar** com a plataforma principal.
- Cada connector = autenticação + capacidades (read/write) + mapeamento de schema + escopo/tenant. Catálogo de connectors versionado.
- **Bidirecional:** a mesma camada serve para o Cérebro consultar fora e para outro sistema seu consultar o Cérebro (federação entre seus produtos).

### 2.6 Link com a plataforma (sempre atual)
1. **Pull:** o AI Core lê dados da plataforma via API REST/tRPC.
2. **Eventos:** a plataforma publica eventos (criou/alterou/decidiu) num barramento; o AI Core assina e mantém o RAG/memória atualizados quase em tempo real.
3. **Push/ação:** o AI Core age na plataforma **apenas** pelas tools registradas, sempre respeitando a permissão do usuário em nome de quem age.

### 2.7 Pipeline de treino/finetune (separar e treinar a IA)
- **Captura de dataset:** interações, decisões aprovadas/rejeitadas, feedback (👍/👎), correções — com consentimento e isolamento por tenant.
- **Curadoria → finetune/eval → versionamento → rollout** (canary). Modelos versionados (`model@vN`) com rollback.
- Projetado para o cenário que você descreveu: **destacar o AI Core, colocá-lo num servidor, treinar com os dados** e religá-lo via a mesma API — sem mexer no produto.

### 2.8 Governança (obrigatória)
- **Permissão-aware:** a IA só faz o que o **papel do usuário** permite (ver `0C`). Toda tool checa RBAC.
- **Guardrails:** saída validada por schema; limites de ação; **human-in-the-loop** para ações irreversíveis/sensíveis (alçadas).
- **Auditoria:** toda ação da IA gera `audit_log` (quem pediu, o que a IA fez, resultado, modelo/versão).

### 2.9 API do AI Core (simples e estável — ver também 0D)
- `POST /ai/chat` — turno de copiloto (mensagem + contexto + locale) → resposta + tools usadas.
- `POST /ai/agent/run` — dispara/agenda o agente sobre um escopo.
- `GET /ai/recommendations` — recomendações pendentes do agente.
- `POST /ai/tools/invoke` — execução de tool (interno, governado).
- `POST /ai/ingest` · `POST /ai/connectors/:id/sync` — alimentar conhecimento / sincronizar externo.
- `POST /ai/feedback` — feedback que alimenta o treino.

---

## 3. Copiloto — o assistente que entende o sistema inteiro

- **O que é:** painel conversacional embutido em **toda tela** (atalho global, ex.: `Cmd/Ctrl+K` + chat). Tem nome configurável por plataforma (ver `0B`).
- **O que faz:** explica dados e telas ("o que significa este indicador?"), **navega** ("abra a fila de pendências"), **consulta** ("quanto faturei este mês?"), **rascunha** e **executa ações leves** pelas tools — sempre dentro da permissão do usuário.
- **Como entende tudo:** RAG dos dados do tenant + **tools registry** (conhece cada função) + memória. Ganha cada função nova automaticamente.
- **i18n:** responde **no idioma do usuário** (pt-BR/en/zh-CN/fr-FR), prompt locale-aware (ver `00-PADRAO` §6).
- **Estados:** sugestões contextuais por tela; cita a fonte/registro quando responde sobre dados.

## 4. Agente Autônomo — apoio à decisão

- **O que é:** processo que **monitora o sistema** (eventos + dados) e **propõe ou executa decisões** dentro de guardrails.
- **Modos:** (a) **sugestivo** — gera recomendações para o humano aprovar; (b) **semiautônomo** — executa o que está dentro da alçada e pede aprovação para o resto; (c) **agendado** — roda rotinas (ex.: revisar pendências toda manhã).
- **Saída:** uma fila de **recomendações/decisões** com justificativa, impacto estimado, confiança e CTA (aprovar/ajustar/recusar). Cada plataforma define **quais decisões** o agente cobre (seção específica de cada doc).
- **Governança:** alçadas por papel/valor; ações irreversíveis sempre com human-in-the-loop; tudo auditado e, quando aplicável, **reversível** (rollback).

## 5. Como cada plataforma usa esta camada

Cada doc de plataforma traz uma seção **"Camada de IA, Agente e WhatsApp (específico)"** com:
1. **Escopo do copiloto** — perguntas/ações típicas naquele produto.
2. **Decisões do agente autônomo** — o que ele monitora e recomenda/executa.
3. **Tools que os módulos registram** — as funções que a IA pode chamar.
4. **Connectors relevantes** — sistemas externos a plugar.
5. **Comandos de WhatsApp** — exemplos de "faça isso / me traga isso" (ver `0B`).

---

## 6. Definition of Done (camada de IA)
Uma plataforma só está completa quando: (a) AI Core integrado por API; (b) copiloto disponível em toda tela, permissão-aware e nos 4 idiomas; (c) agente autônomo com ao menos uma classe de decisão; (d) tools registradas pelos módulos; (e) feedback capturado para treino; (f) auditoria de toda ação da IA; (g) connectors e WhatsApp plugáveis sem alterar o produto.
