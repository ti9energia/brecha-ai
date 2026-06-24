# 0B — Controle por WhatsApp (IA com nome + número)

> **Transversal a TODAS as plataformas.** Cada produto tem uma **IA com nome** e um **número de WhatsApp**. O cliente manda "**faça isso**" ou "**me traga isso**" e a IA **puxa/age no sistema** e responde. O WhatsApp é apenas mais um **cliente do AI Core** (`0A`) — mesma inteligência, mesmas tools, mesma governança.

---

## 1. Conceito
- Cada plataforma define uma **persona** (nome + tom) e um **número de WhatsApp** (um por plataforma; opcionalmente um por organização/tenant para planos premium).
- O usuário conversa por WhatsApp como conversaria com o copiloto na tela: consulta dados, dispara ações, recebe relatórios e alertas — tudo no **idioma dele**.
- Exemplos genéricos: *"me traga as pendências de hoje"*, *"quanto faturei essa semana?"*, *"aprove o item X"*, *"gere o relatório e me manda em PDF"*, *"avise quando entrar um caso de risco alto"*.

## 2. Arquitetura
```
WhatsApp  ──(webhook)──>  Gateway WhatsApp (módulo)  ──>  AI Core (/ai/chat, tools)
   ▲                                                          │
   └────────── resposta (texto, PDF, imagem, botões) ─────────┘
                         + push proativo (alertas do Agente)
```
- **Provider:** WhatsApp Business Platform (Cloud API da Meta) ou BSP (ex.: Twilio/360dialog). Webhook recebe mensagens; API envia respostas.
- **Módulo `whatsapp-gateway`** (desacoplável como qualquer outro — ver `0D`): valida assinatura, identifica o remetente, resolve sessão e repassa ao AI Core.
- **Mesmo cérebro:** o gateway **não** tem lógica de negócio — ele só traduz WhatsApp ⇄ AI Core. Toda função vem das tools registradas pelos módulos. Função nova na plataforma vira comando de WhatsApp automaticamente.

## 3. Identidade, vínculo e segurança (crítico)
- **Vínculo de número ↔ usuário:** o número de WhatsApp do cliente é associado a um usuário da plataforma (cadastro/opt-in com verificação por código). Nenhum comando é executado para número não vinculado.
- **Permissão-aware:** a IA no WhatsApp **só faz o que o papel daquele usuário permite** (mesmo RBAC de `0C`). Pedir algo fora da alçada → recusa educada + orientação.
- **Confirmação de ações sensíveis:** ações irreversíveis/financeiras pedem confirmação explícita ("responda SIM para confirmar") e respeitam human-in-the-loop.
- **Sessão e expiração:** contexto de conversa com timeout; reautenticação periódica para ações críticas.
- **Auditoria:** todo comando e ação via WhatsApp gera `audit_log` (igual à UI).
- **LGPD/GDPR/PIPL:** consentimento de canal, dados mínimos, opt-out a qualquer momento.

## 4. Capacidades por mensagem
- **Consulta (read):** a IA chama tools de leitura e responde em texto e, quando útil, **anexo** (PDF/planilha/imagem) ou **botões** (quick replies).
- **Ação (write):** a IA chama tools de escrita (aprovar, criar, atualizar) com confirmação conforme a regra.
- **Proativo (push):** o **Agente Autônomo** (`0A`) envia alertas/recomendações ("entrou um caso de risco alto — quer bloquear?") com botões de ação — respeitando as janelas e templates do WhatsApp Business.
- **Mídia de entrada:** aceita áudio (transcreve), foto/PDF (ex.: enviar um documento para o sistema processar).

## 5. Multi-idioma
- A IA detecta o idioma da mensagem e responde no mesmo (pt-BR/en/zh-CN/fr-FR). Templates de mensagem proativa cadastrados nos 4 idiomas (catálogo `i18n`, ver `00-PADRAO` §6).

## 6. Configuração (no Painel do Dono — ver `0C`)
- Nome/persona da IA e número por plataforma (e por tenant nos planos que permitem).
- Quais tools/comandos ficam habilitados no canal WhatsApp (pode-se **desacoplar** comandos por plano/feature flag).
- Templates de mensagens proativas e limites de envio.

## 7. Endpoints/Contratos
- `POST /whatsapp/webhook` — entrada (assinada).
- Internamente chama `POST /ai/chat` e `POST /ai/tools/invoke` (governados) no AI Core.
- `POST /whatsapp/send` — envio (texto/mídia/botões), usado por respostas e pelo agente.

## 8. Definition of Done (WhatsApp)
(a) Opt-in com verificação e vínculo número↔usuário; (b) permissão-aware idêntico à UI; (c) confirmação de ações sensíveis; (d) consultas e ações via tools (sem lógica no gateway); (e) push proativo do agente com botões; (f) 4 idiomas; (g) auditoria completa; (h) habilitar/desabilitar comandos por plano sem alterar o produto.
