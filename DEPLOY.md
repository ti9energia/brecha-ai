# Deploy — Brecha.ai

Guia para colocar a Brecha.ai no ar. O app é um **Next.js 15** autocontido: roda **sem nenhuma chave** (Copiloto usa o cérebro local) e **sem banco/infra externa** (dados em memória). Você escolhe o destino.

> **Pré-requisitos:** Node 22 (`.nvmrc`), repositório Git. Build e typecheck já passam limpos (`npm run typecheck && npm run build`).

---

## Opção 1 — Vercel (mais rápido, recomendado)

A Vercel detecta Next.js automaticamente. Não precisa de configuração extra (o `vercel.json` já fixa a região **gru1 / São Paulo**).

**Via dashboard:**
1. Suba o código para um repositório no GitHub/GitLab/Bitbucket.
2. Em [vercel.com/new](https://vercel.com/new) → **Import** o repositório.
3. (Opcional) **Environment Variables** → adicione `ANTHROPIC_API_KEY` para ligar o Claude, e `NEXT_PUBLIC_SITE_URL` com o domínio final.
4. **Deploy**. Pronto.

**Via CLI:**
```bash
npm i -g vercel
vercel            # preview
vercel --prod     # produção
```

A Vercel ignora `output: "standalone"` e usa o próprio runtime — funciona normalmente.

---

## Opção 2 — Docker (Fly.io / Render / AWS / qualquer lugar)

A imagem usa a saída **standalone** (enxuta, não-root, com healthcheck em `/api/health`).

```bash
docker build -t brecha-ai .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... brecha-ai
# http://localhost:3000
```

### Fly.io
O `fly.toml` já está pronto (região `gru`, autostop, healthcheck):
```bash
fly launch --no-deploy          # cria o app a partir do fly.toml
fly secrets set ANTHROPIC_API_KEY=sk-ant-...   # opcional
fly deploy
```

### Render
- New → **Web Service** → conecte o repo.
- Environment: **Docker** (usa o `Dockerfile`).
- Health Check Path: `/api/health`.
- (Opcional) env var `ANTHROPIC_API_KEY`.

### AWS / Cloud Run / Railway
Qualquer host que rode um container OCI: aponte para o `Dockerfile`, exponha a porta `3000` e use `/api/health` como health check.

---

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `ANTHROPIC_API_KEY` | Não | Liga o Claude (claude-opus-4-8). Sem ela, o Copiloto usa o cérebro local. |
| `AI_CORE_MODEL` | Não | Troca o modelo do AI Core (padrão `claude-opus-4-8`). |
| `NEXT_PUBLIC_SITE_URL` | Recomendada | Domínio final, usado em `robots.txt` e `sitemap.xml`. |

Nunca comite `.env.local`. Use os *secrets* do provedor.

---

## CI/CD

`.github/workflows/ci.yml` roda **typecheck + build** em todo push/PR para `main`.
Conecte o repo à Vercel para deploy automático a cada push (Preview em PRs, Production em `main`).

---

## Checklist pós-deploy
- [ ] `GET /api/health` retorna `{ "status": "ok" }`.
- [ ] `/` redireciona para o locale detectado (`/pt-BR`, `/en`, `/zh-CN`, `/fr-FR`).
- [ ] Landing, `/[locale]/login` e `/[locale]/app` carregam.
- [ ] `/manifest.webmanifest` e `/icon.svg` servem (PWA instalável).
- [ ] (Se configurado) Copiloto responde via Claude — confira `aiCore: "claude"` no `/api/health`.
- [ ] `NEXT_PUBLIC_SITE_URL` setado → `sitemap.xml` com URLs corretas.

---

## Notas
- **Node 22** fixado em `.nvmrc`; o Dockerfile usa `node:22-alpine`.
- **Standalone**: localmente, `npm run build` gera `.next/standalone/server.js` (`node .next/standalone/server.js` sobe sem `next`).
- O **service worker** (`/sw.js`) só registra em produção e tem escopo de raiz (header já configurado).
- Workspace e Painel do Dono estão bloqueados no `robots.txt` (áreas privadas).
