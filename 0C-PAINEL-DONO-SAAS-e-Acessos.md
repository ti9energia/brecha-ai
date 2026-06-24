# 0C — Painel do Dono do SaaS + Modelo de Acessos

> **Transversal a TODAS as plataformas.** Define o **backoffice do dono** (super-admin) — gestão completa do SaaS — e o **modelo de acessos** (papéis, permissões, planos→entitlements) que governa UI, API, IA e WhatsApp. Há **dois níveis** distintos de administração: **Plataforma (dono)** e **Organização (cliente)**.

---

## 1. Dois níveis de administração
- **Nível Plataforma (Dono/Owner):** você. Gerencia todos os tenants, planos, preços, landing, acessos, IA e saúde do sistema. App/área separada: `apps/admin` (ou `/[locale]/owner`), atrás do papel **platform_owner/staff**.
- **Nível Organização (Cliente):** o admin de cada empresa cliente gerencia **apenas a sua** organização (usuários, papéis, faturamento do plano dele).

---

## 2. Painel do Dono — abas/funções
1. **Visão geral (saúde do negócio)** — MRR, tenants ativos, uso, erros, consumo de IA.
2. **Tenants (organizações)** — listar/criar/suspender; ver uso e plano; **impersonar** (entrar como) para suporte, com auditoria.
3. **Usuários (global)** — buscar usuário em qualquer tenant; criar; resetar acesso; atribuir papéis; bloquear.
4. **Planos & preços** — **criar/editar planos**, definir preço, ciclo, limites (quotas) e **entitlements** (quais módulos/abas/funções e limites cada plano libera).
5. **Editor da Landing Page** — **editar os planos exibidos na landing**, textos, CTAs, FAQ, depoimentos — nos **4 idiomas** (CMS, ver §6).
6. **Feature flags & módulos** — ligar/desligar abas/funções por plano, por tenant ou globalmente (casa com `0D`: cada aba é um módulo desacoplável).
7. **Faturamento & assinaturas** — faturas, inadimplência, cupons, trials, reembolsos; integração com gateway de pagamento.
8. **IA & Agente** — configurar AI Core por tenant: persona/nome, modelo/versão, limites, quais tools/automação o agente pode usar, custo. (ver `0A`)
9. **WhatsApp** — provisionar número/persona por plataforma e por tenant; habilitar comandos por plano; templates proativos. (ver `0B`)
10. **Acessos & papéis** — definir papéis e a **matriz de permissões** (§4); criar papéis customizados.
11. **Auditoria** — trilha imutável de tudo (inclui impersonation e ações da IA).
12. **Configurações do sistema** — domínios, e-mail, segurança, integrações globais, idiomas ativos.

## 3. UX (resumo por aba)
- **Tenants/Usuários:** tabelas com busca/filtros, ações em massa, drawer de detalhe; **impersonar** mostra banner persistente "Você está como {tenant}".
- **Planos:** editor com limites (quotas), entitlements por módulo (checkboxes que casam com o registry de `0D`), preview do card de plano.
- **Editor de Landing:** edição por seção e por idioma (abas pt-BR/en/zh-CN/fr-FR), preview, publicar/agendar.
- **Feature flags:** matriz módulo × (global/plano/tenant) com toggles e rollout %.
- Todos com estados loading/empty/error e i18n (a própria interface do dono também é traduzível).

## 4. Modelo de acessos (RBAC + entitlements)

### 4.1 Papéis de Plataforma (você)
- `platform_owner` — tudo.
- `platform_staff` — operação/suporte (sem deletar nem mexer em preços, conforme política).
- `platform_support` — somente leitura + impersonation auditada.

### 4.2 Papéis de Organização (cliente) — base, estendida por produto
- `org_admin` — gerencia a organização (usuários, papéis, plano).
- `manager` — opera + configura o produto, dentro do plano.
- `member` — opera o dia a dia.
- `viewer` — somente leitura.
- **Papéis específicos do produto** são definidos na doc de cada plataforma (ex.: médico, faturista, tributarista, engenheiro de voo, compliance, regulador read-only).

### 4.3 Permissões
- Permissões granulares no formato `recurso:ação` (ex.: `verifications:read`, `verifications:decide`, `plans:edit`, `users:invite`).
- Cada **módulo/aba/função** declara as permissões que exige (ver `0D`). UI, API, **tools da IA** e **WhatsApp** checam a **mesma** permissão — fonte única de verdade.

### 4.4 Entitlements (do plano)
- O **plano** define o que a organização pode acessar: quais **módulos/abas** estão liberados e os **limites** (ex.: nº de usuários, volume processado, automação do agente).
- Resolução em runtime: **acesso = (papel concede a permissão) E (plano concede o entitlement)**. Faltou plano → upsell; faltou papel → bloqueio.

### 4.5 Matriz (exemplo)
| Permissão | owner | org_admin | manager | member | viewer |
|---|---|---|---|---|---|
| ver dados do produto | ✅ | ✅ | ✅ | ✅ | ✅ |
| executar ação operacional | ✅ | ✅ | ✅ | ✅ | — |
| configurar regras/produto | ✅ | ✅ | ✅ | — | — |
| gerenciar usuários da org | ✅ | ✅ | — | — | — |
| editar planos/preços | ✅ | — | — | — | — |
| editar landing | ✅ | — | — | — | — |
| configurar IA/WhatsApp | ✅ | (parcial) | — | — | — |
(Os papéis específicos de cada produto entram nas colunas conforme a doc da plataforma.)

## 5. Planos, quotas e cobrança
- **Plano** = preço + ciclo + **entitlements** (módulos) + **quotas** (limites de uso) + add-ons (ex.: garantia, número WhatsApp dedicado).
- Medição de uso por tenant (eventos) → cobrança por assinatura e/ou consumo; trials e cupons.
- Mudança de plano reflete **na hora** nos entitlements (abas aparecem/somem).

## 6. Editor de Landing Page (CMS multi-idioma)
- Conteúdo da landing (herói, planos, FAQ, depoimentos, CTAs) é **dado editável**, não código — versionado e traduzível nos 4 idiomas.
- **Planos da landing** vêm da mesma fonte dos planos de cobrança (editar o plano atualiza a landing).
- Publicação com preview e agendamento; SEO por idioma.

## 7. Modelo de dados (núcleo)
- `Tenant/Organization` (plano, status, locale padrão).
- `User` (vínculo a 1+ orgs, papéis, locale, número WhatsApp opt-in).
- `Role` (escopo platform|org, permissões[]), `Permission` (`recurso:ação`).
- `Plan` (preço, ciclo, entitlements[módulos], quotas), `Subscription` (tenant, plan, status, uso).
- `FeatureFlag` (módulo, escopo global|plan|tenant, valor, rollout%).
- `LandingContent` (seção, locale, payload, versão, status).
- `AuditLog` (imutável; inclui impersonation e ações de IA).
- `AiConfig`/`WhatsAppConfig` por tenant (persona, modelo, comandos habilitados).

## 8. Endpoints (núcleo do backoffice)
- `GET/POST /admin/tenants` · `POST /admin/tenants/:id/impersonate` · `POST /admin/tenants/:id/suspend`.
- `GET/POST /admin/users` · `POST /admin/users/:id/roles`.
- `GET/POST/PUT /admin/plans` · `GET/PUT /admin/landing/:locale`.
- `GET/PUT /admin/flags` · `GET /admin/billing` · `GET /admin/audit`.
- `GET/PUT /admin/ai-config` · `GET/PUT /admin/whatsapp-config`.
- Tudo sob papel de plataforma; respostas no padrão de `00-PADRAO` §4.

## 9. Definition of Done (Painel do Dono)
(a) Separação clara plataforma×organização; (b) CRUD de tenants/usuários com impersonation auditada; (c) criar/editar planos com entitlements e quotas refletindo em runtime; (d) editor de landing nos 4 idiomas; (e) feature flags por módulo/plano/tenant; (f) RBAC único compartilhado por UI/API/IA/WhatsApp; (g) configuração de IA e WhatsApp por tenant; (h) auditoria de tudo.
