# 08 — Brecha.ai · Documentação Completa da Plataforma

> **Tipo:** AI SaaS (inédito) · **Cor primária:** Ouro `#CA8A04` · **Acento:** Tinta `#111827`
> **i18n:** pt-BR · en · zh-CN · fr-FR (ver `00-PADRAO`).

---

## 1. Visão geral
Brecha.ai é um **GPS de oportunidade regulatória**: monitora toda mudança normativa, simula o impacto na estrutura de cada cliente e **recomenda — e executa — a reorganização ótima** (enquadramento, regime, jurisdição) no timing certo, antes da janela fechar. Cobra success fee sobre a economia capturada.

## 2. Personas & casos de uso
- **CFO/controller:** quer capturar incentivos e mudanças de regime antes que expirem.
- **Tributarista/jurídico:** avalia e aprova a jogada recomendada.
- **Dono de empresa (setor regulado):** reduz custo/risco com a estrutura ótima.
- **Admin:** governa clientes, permissões e execução.

JTBD: "me avise e execute a melhor jogada regulatória antes da janela fechar".

## 3. Arquitetura de informação (abas/telas)
1. **Oportunidades** — janelas detectadas, ranqueadas por ganho potencial.
2. **Detalhe da oportunidade** — norma-gatilho, simulação de impacto, jogada recomendada.
3. **Radar normativo** — fluxo de mudanças (federal/estadual/municipal) relevantes.
4. **Minha estrutura** — perfil fiscal/jurídico do cliente (regime, enquadramento, jurisdições).
5. **Simulador** — testar cenários de reorganização.
6. **Execução** — passos para implementar a jogada (com aprovação).
7. **Economia capturada** — resultado financeiro e base do success fee.
8. **Configurações** — org, idioma, setores monitorados.

## 4. UX detalhada por tela
**4.1 Oportunidades.** Lista ranqueada: ganho estimado, prazo da janela, esforço, confiança. Filtros por setor/tipo. *Empty*: "Nenhuma janela aberta agora".
**4.2 Detalhe da oportunidade.** Mostra a **norma-gatilho** (resumo + fonte), a **simulação de impacto** (antes/depois), a **jogada recomendada** (enquadramento/regime/jurisdição) e o ganho; CTA *Simular variações* / *Aprovar execução*.
**4.3 Radar normativo.** Timeline de mudanças normativas com relevância para a estrutura do cliente; abrir como oportunidade.
**4.4 Minha estrutura.** Cadastro do perfil fiscal/jurídico (regime atual, atividades, jurisdições), base da simulação.
**4.5 Simulador.** Ajustar parâmetros e ver carga/risco resultante; comparar cenários.
**4.6 Execução.** Checklist da jogada (documentos, prazos, responsáveis) com aprovação do tributarista.
**4.7 Economia capturada.** Gráfico do ganho realizado e cálculo do success fee.

## 5. Front end
- Rotas: `/[locale]/opportunities`, `/opportunities/[id]`, `/radar`, `/structure`, `/simulator`, `/execution`, `/savings`, `/settings`.
- Componentes: `OpportunityList`, `OpportunityDetail` (norma + simulação + jogada), `RegRadar`, `StructureProfile`, `ScenarioSimulator`, `ExecutionChecklist`, `SavingsChart`.
- i18n: textos normativos e mensagens por chave/locale; valores em moeda do contexto.

## 6. Back end
**Módulos:** `norm-ingestion`, `relevance`, `simulation` (motor fiscal/jurídico), `opportunities`, `structure`, `execution`, `savings`, `org/auth`.

**Modelo de dados:** `Organization`, `User`, `ClientStructure` (regime, activities[], jurisdictions[]), `Norm` (id, level[federal|state|municipal], title, summary, sourceRef, effectiveDate, embedding), `Opportunity` (normId, clientId, estimatedGain, windowEnd, recommendedMove, confidence, status), `SimulationRun` (params, before, after), `ExecutionPlan` (opportunityId, steps[], approver, status), `SavingsRecord` (opportunityId, realizedGain), `AuditLog`.

**Endpoints:** `GET /opportunities` · `GET /opportunities/:id` · `GET /radar` · `GET/PUT /structure` · `POST /simulator` · `POST /opportunities/:id/execute` · `GET /savings`.

**Integrações:** fontes oficiais de normas (diários oficiais federal/estadual/municipal), ERPs/contabilidade do cliente, assinatura/protocolo de documentos para execução.

**Jobs:** ingestão contínua de normas, *embeddings* + relevância por estrutura do cliente, simulação de impacto, detecção/abertura de oportunidade, conciliação de economia realizada.

**IA:** LLM que **interpreta a norma nova**, projeta o efeito na estrutura do cliente e **sugere a jogada ótima**; simulação determinística valida números. Execução com **aprovação humana** (tributarista) e trilha.

## 7. Fluxos ponta a ponta
**Norma → oportunidade → execução → economia:** ingestão da norma → relevância para a `ClientStructure` → simulação antes/depois → `Opportunity` com ganho e prazo → tributarista revisa e aprova → `ExecutionPlan` implementa a jogada → `SavingsRecord` registra o ganho (base do success fee). Tudo auditado.

## 8. Internacionalização (deltas)
- O conjunto normativo é **por jurisdição** (Brasil no MVP) → módulo regional `market: BR`; a arquitetura permite plugar outras jurisdições. UI e docs nos 4 idiomas.
- Textos normativos preservados no idioma original; explicações do LLM no idioma do usuário.

## 9. Landing page
Herói ("Capture a oportunidade regulatória antes da janela fechar"); dinheiro deixado na mesa; como o radar + simulação funcionam; execução com aprovação; success fee (alinhamento); setores; CTA "Ver oportunidades para minha empresa". LP nos 4 idiomas.

## 10. Modelo de negócio & métricas
Assinatura + success fee sobre economia capturada. Métricas: oportunidades detectadas/aproveitadas, ganho realizado (R$), janelas perdidas evitadas, tempo de execução, retenção.

## 11. Roadmap de construção (MVP → v1)
**MVP:** ingestão de normas + perfil de estrutura + relevância + oportunidades (sem execução). **v0.5:** simulador de impacto, detalhe da jogada. **v1:** execução assistida com aprovação, conciliação de economia/success fee, múltiplas jurisdições. i18n nos 4 idiomas desde o MVP.

---

## 12. Camada de IA, Agente Autônomo e WhatsApp (específico)
> Herda `0A`, `0B`, `0D`. Execução de jogada sempre com aprovação do tributarista.

**Copiloto (entende o sistema):** "quais oportunidades estão abertas agora?", "explique a jogada recomendada e o ganho", "simule mudar para o regime Y", "quanto economizamos até agora?". Ações: simular cenário, abrir execução.

**Agente Autônomo (decisão):** monitora as normas; abre oportunidades relevantes para a estrutura do cliente; recomenda a jogada ótima; **alerta janelas prestes a fechar**; prepara o plano de execução.

**Tools:** `opportunities:read`, `radar:read`, `structure:read`, `structure:update`, `simulator:run`, `execution:start`, `savings:read`.

**Connectors relevantes:** diários oficiais (federal/estadual/municipal), ERPs/contabilidade, assinatura/protocolo de documentos.

**Comandos de WhatsApp (exemplos):** "me traga as oportunidades abertas" · "qual a economia capturada neste trimestre?" · "aprovar a execução da jogada X? responda SIM".

## 13. Papéis específicos desta plataforma
**CFO/controller** (manager) · **tributarista** (manager: aprova execução) · **dono** (viewer+) · **analista** (member) · `org_admin`.
