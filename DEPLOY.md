# Deploy — Mazari Fi

Três peças, hospedadas separadas: **frontend (Vercel)**, **API (servidor Express)** e **ingestor (cron no GitHub Actions, já ativo)**.

> Regra de ouro: **nenhum secret no git**. Tudo via variável de ambiente no painel de cada host. O `.env` é gitignored.

---

## 1. Frontend — Vercel (o `app`)

App **Vite puro** (React 19 + Tailwind 4 + wouter). Standalone — não importa workspaces (espelha `core`/`chain`).

**No painel da Vercel (New Project → importar `Opresida/mazarifi`):**
- **Root Directory:** `app`
- **Framework Preset:** Vite (autodetecta)
- **Build Command:** `vite build` · **Output:** `dist` · **Install:** `pnpm install`

O [`app/vercel.json`](app/vercel.json) já faz o **SPA fallback** (rotas do wouter `/dashboard`, `/pool/:key`, `/minhas-aplicacoes`, `/admin` → `index.html`), excluindo `/api`. Isso faz a landing + todas as rotas abrirem. ⚠️ **Não coloque URL inválida nos rewrites — a Vercel rejeita e quebra o SPA.**

**Quando a API estiver no ar (passo 2),** adicione o proxy do `/api` ANTES do fallback (o front chama `/api/...` relativo):
```json
"rewrites": [
  { "source": "/api/:path*", "destination": "https://SUA-API.com/api/:path*" },
  { "source": "/((?!api/).*)", "destination": "/index.html" }
]
```
Aí faça commit/push → a Vercel re-deploya e o app puxa os dados.

> Arquivos estáticos (`/favicon-*.png`, `/logos/*`, `/logo.png`) são servidos direto pela Vercel antes dos rewrites.

---

## 2. API — servidor Express (NÃO é Vercel)

A API é um **servidor long-running** (Express + Neon serverless) — vai em **Render / Railway / Fly.io** (não serverless).

- **Start:** `pnpm install && pnpm -F @mazarifi/api start`
- **CORS:** já liberado (`app.use(cors())`).
- **Variáveis de ambiente (no painel do host, NUNCA no git):**

| Var | Valor | Pra quê |
|---|---|---|
| `DATABASE_URL` | string do Neon | banco (pools/network) |
| `ENSO_API_KEY` | chave Enso | zap/posições |
| `ZAP_ENABLED` | `true` | liga o zap |
| `ZAP_FEE_BPS` | `30` | taxa de entrada 0,30% |
| `AUTOPILOT_FEE_BPS` | `50` | troca do Autopilot (0,30 + 0,20) |
| `MAZARI_TREASURY` | `0x8ed2322492dba29d2d783a7de0c873c51444cbd2` | recebe as taxas |
| `LIFI_INTEGRATOR` | `Mazari-Fi` | rebate da ponte |
| `PORTALS_API_KEY` | chave Portals | 2ª engine de zap |
| `ARBITRUM_RPC` | (opcional) | RPC Arbitrum dedicado |

Depois que a API subir, pegue a URL pública dela e cole no `app/vercel.json` (passo 1).

---

## 3. Ingestor — cron (GitHub Actions, já configurado)

`.github/workflows/ingest.yml` roda a cada 20 min (repo público = grátis). **Secret necessário:** `DATABASE_URL` em Settings → Secrets → Actions (mesmo valor do Neon).

---

## Checklist de deploy

- [ ] API no ar (Render/Railway/Fly) com TODAS as env vars acima
- [ ] URL da API colada em `app/vercel.json`
- [ ] Frontend na Vercel (Root = `app`)
- [ ] Secret `DATABASE_URL` no GitHub (cron)
- [ ] Testar: landing abre · `/dashboard` lista pools · conectar carteira · depósito de teste pequeno
