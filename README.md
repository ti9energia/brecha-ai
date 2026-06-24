# Documentação das Plataformas — Portfólio de IA

Specs de produto e engenharia para o Claude Code construir cada plataforma. **Tudo nasce em 4 idiomas (i18n desde o dia 1): 🇧🇷 pt-BR (padrão) · 🇺🇸 en · 🇨🇳 zh-CN · 🇫🇷 fr-FR.**

## Toda plataforma já nasce com (capacidades transversais)
- 🤖 **Copiloto de IA** que entende o sistema inteiro e ajuda em tudo — em toda tela. (`0A`)
- 🧠 **Agente Autônomo** de apoio à decisão (monitora, recomenda, executa dentro de alçadas). (`0A`)
- 🧩 **AI Core ("Cérebro") desacoplado e treinável** num servidor próprio, **plugável a outros sistemas** (connectors) e ligado de volta à plataforma. (`0A`)
- 💬 **Controle por WhatsApp**: IA com nome + número; "faça isso / me traga isso" puxa e age no sistema. (`0B`)
- 👑 **Painel do Dono do SaaS**: usuários, planos, editor da landing, feature flags e a **matriz de acessos**. (`0C`)
- 🔌 **Arquitetura modular e API fácil**: cada aba/função é um módulo desacoplável (ligar/desligar/extrair). (`0D`)

## Como ler (ordem para o Claude Code)
1. **`00-PADRAO-Documentacao-e-i18n.md`** — stack, monorepo, design system, convenções de API e a **estratégia de i18n nos 4 idiomas** (obrigatória).
2. **Arquitetura transversal** (vale para todas, não se repete nas specs):
   - **`0A`** — IA: Cérebro, Copiloto e Agente Autônomo (desacoplado, treinável, connectors).
   - **`0B`** — Controle por WhatsApp.
   - **`0C`** — Painel do Dono do SaaS + Modelo de Acessos (papéis, planos, entitlements, editor da landing).
   - **`0D`** — Arquitetura Modular & API fácil (desacoplar qualquer aba/função).
3. Depois, a **spec da plataforma** que vai construir (template: visão geral → personas → arquitetura de informação → UX por tela → front end → back end → fluxos ponta a ponta → i18n → landing page → modelo/métricas → roadmap; + seções 12/13 com IA, agente, WhatsApp e papéis específicos).

## Plataformas documentadas
| # | Plataforma | Tipo | Em uma linha |
|---|------------|------|--------------|
| 01 | **BoletoVerify** | SaaS antifraude | Audita boletos em tempo real e bloqueia o golpe do boleto alterado. |
| 02 | **Prontus.ai** | AI Agent (saúde) | Escriba clínico: prontuário + guia TISS a partir do áudio da consulta. |
| 03 | **CartórioFast** | TaaS | Agente que emite certidões/averbações em portais de cartório. |
| 04 | **MiCA-Compliance** | RegTech DeFi | Compliance AML em tempo real (MiCA/SEC) com detecção por GNN. |
| 05 | **ConstellaPath** | SaaS space-tech | Otimiza manobras de satélites LEO (Deep RL) para evitar colisão. |
| 06 | **SeloHumano** | Infra/Protocolo | Prova-de-humano para a economia de agentes. |
| 07 | **Legado.ai** | AI SaaS | Gêmeo de conhecimento para sucessão/M&A de PMEs. |
| 08 | **Brecha.ai** | AI SaaS | GPS de oportunidade regulatória: detecta janelas e executa a jogada. |
| 09 | **AtaViva** | AI Agent | Reunião vira ação executada nos sistemas, com rollback. |

## Como as peças se conectam (mapa mental)
```
Cada ABA/FUNÇÃO = um MÓDULO (0D) que registra: rota(API) + tela(UI) + tools(IA) + permissões(0C) + eventos
       │
       ├─ aparece na UI conforme plano+papel (0C)
       ├─ vira comando no WhatsApp (0B)
       ├─ é operável pelo Copiloto/Agente via tools (0A)
       └─ é extraível para serviço próprio pelo contrato (0D)

AI CORE (0A) é um serviço SEPARADO: você pode destacá-lo, treinar num servidor e plugar a outros sistemas.
PAINEL DO DONO (0C) controla planos, acessos, landing, IA e WhatsApp de todos os tenants.
```

> Domínios específicos do Brasil (TISS, cartórios, Febraban, normas) são **módulos de mercado** (`market: BR`); a interface e a documentação saem nos 4 idiomas, e a arquitetura permite plugar outros mercados.
