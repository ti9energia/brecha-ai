# 0D — Arquitetura Modular & API Fácil (desacoplar qualquer aba/função)

> **Transversal a TODAS as plataformas.** Define como o sistema é montado para que **manutenção e API sejam fáceis** e para que **qualquer aba/função possa ser desacoplada** (ligada/desligada/extraída) sem cirurgia. Casa com `0A` (tools), `0B` (WhatsApp) e `0C` (entitlements/flags).

---

## 1. Princípio: cada aba/função é um MÓDULO

Tudo é um **feature module** autocontido. Uma "aba" no produto = um módulo. Cada módulo traz **tudo o que precisa**:

```
packages|apps/modules/<feature>/
├─ api/            # rotas/controllers + serviços do módulo
├─ ui/             # telas e componentes da aba
├─ schema/         # tipos Zod (contrato FE↔BE) e modelos Prisma do módulo
├─ tools/          # tools que o módulo expõe ao AI Core (0A)
├─ permissions.ts  # permissões que o módulo exige (recurso:ação) (0C)
├─ events.ts       # eventos que publica/consome
└─ module.config.ts# manifesto: id, rota, ícone, permissões, entitlement, flag
```

**Consequência:** desacoplar uma aba = mudar o **registry** (desligar a flag/entitlement) ou **mover a pasta** para um serviço próprio. Não há lógica espalhada — está toda no módulo.

## 2. Módulo = monólito modular → extraível

- Começa como **monólito modular** (um `apps/api`, um `apps/web`) com **fronteiras rígidas**: um módulo só fala com outro por **contrato** (API/eventos), nunca importando o interno do outro.
- Quando um módulo precisar escalar/isolar, ele é **extraído para serviço próprio** sem reescrever: o contrato (rotas + eventos) já existe. Mesmo padrão usado para destacar o **AI Core** (`0A`).
- **Regra de ouro:** nada de import cruzado de implementação; só de `schema/` (contratos) compartilhados.

## 3. Registry de módulos (ligar/desligar/desacoplar)

- Um **registry central** lê o `module.config.ts` de cada módulo e monta: as rotas do FE, os routers da API, as tools da IA e o menu de abas.
- Cada módulo é **condicionado** por:
  - **Feature flag** (global/plano/tenant — `0C`).
  - **Entitlement do plano** (`0C`).
  - **Permissão do papel** (`0C`).
- Desligar uma aba para um plano/tenant = um toggle. A aba some da UI, da API e dos comandos de WhatsApp **junto**, porque todos leem o mesmo manifesto.

## 4. API fácil (consistente, tipada, versionada)

- **Um gateway**, padrão único (`00-PADRAO` §4): REST `/api/v1` (ou tRPC no monorepo), resposta `{ data, meta, error }`, erros com `code + messageKey`.
- **Cada módulo expõe seu próprio router**; o gateway só agrega. Adicionar função = adicionar rota no módulo, sem tocar no resto.
- **OpenAPI/tRPC gerado automaticamente** → **SDK tipado** (`packages/sdk`) consumido pelo FE, pelo AI Core e por integrações. Contrato é fonte única (Zod) compartilhada FE↔BE↔IA.
- **Versionamento** por rota; mudanças quebra-compatibilidade entram em `/v2` sem afetar `/v1`.
- **Webhooks assinados** para integrações de saída; **connectors** (`0A`) para entrada/saída com outros sistemas.

## 5. Comunicação entre módulos: eventos

- Barramento de eventos (Redis/streams) para desacoplar: um módulo **publica** ("verificação.bloqueada", "consulta.finalizada") e outros **assinam** (ex.: o AI Core atualiza o RAG; o WhatsApp dispara push).
- Evita acoplamento síncrono e permite extrair módulos sem quebrar fluxos.

## 6. Como tudo se conecta (mapa)

```
Módulo (aba)  ─ registra ─>  rota (API)  +  tela (UI)  +  tools (IA)  +  permissões  +  eventos
        │
        ├─ exposto na UI conforme flag+entitlement+permissão (0C)
        ├─ exposto como comando no WhatsApp conforme flag (0B)
        ├─ operável pelo Copiloto/Agente via suas tools (0A)
        └─ extraível para serviço próprio pelo contrato (API/eventos)
```

## 7. Padrão de pastas do repositório (consolidado)

```
repo/
├─ apps/
│  ├─ web/         # shell do produto (carrega módulos pelo registry)
│  ├─ api/         # gateway (agrega routers dos módulos)
│  ├─ admin/       # Painel do Dono (0C)
│  └─ ai-core/     # Cérebro: copiloto/agente/treino (0A) — serviço separado
├─ modules/        # features autocontidas (cada aba/função)
│  ├─ <feature-1>/ │  └─ <feature-n>/
├─ packages/
│  ├─ ui/ i18n/ schemas/ sdk/ prompts/ config/ db/
│  └─ whatsapp-gateway/   # canal WhatsApp (0B), desacoplável
└─ infra/
```

## 8. Testes e manutenção
- Cada módulo tem seus testes (unit + e2e da aba) e pode ser desenvolvido/deployado isolado.
- **Manutenção fácil:** mexer numa aba = mexer numa pasta; o contrato protege o resto. Remover uma função = remover o módulo do registry.
- CI roda só o que mudou (Turborepo) — feedback rápido.

## 9. Definition of Done (modularidade & API)
(a) Cada aba/função é um módulo autocontido com manifesto; (b) registry monta UI/API/tools/menu a partir dos manifestos; (c) cada módulo é ligável/desligável por flag/entitlement/permissão; (d) API consistente, tipada (SDK gerado) e versionada; (e) comunicação entre módulos por eventos; (f) qualquer módulo é extraível para serviço próprio pelo contrato; (g) a mesma fonte de permissões vale para UI, API, IA e WhatsApp.
