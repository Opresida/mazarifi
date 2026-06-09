# Mazari Fi

> **Otimizador de rendimento de pools de liquidez — com honestidade radical.**
> Quase todo mundo te mostra o número bonito e esconde a perda. A Mazari Fi mostra o **líquido** — o que sobra depois de IL, taxas, gás e slippage — em **linguagem de gente**, pra qualquer brasileiro entender em 10 segundos. E agora também **executa**: deposite USDC e a gente monta a pool pra você, **sem custódia**.

Repo: **`Opresida/mazarifi`** · Rede: **Base** (mainnet) · Stack: monorepo **pnpm**.

---

## O diferencial (a tese)

- **Sempre o número LÍQUIDO**, nunca o APY inflado. Mostramos o que **rendeu de verdade nos últimos 15 dias** (realizado), já descontando a perda impermanente (IL).
- **Todo custo na cara:** swap de entrada, **gás de rede ao vivo**, slippage, e a "taxa da Mazari" (R$0 na Fase 1). Nada escondido — ver [`docs/COSTS.md`](docs/COSTS.md).
- **Incentivo não assusta, informa:** checamos a **solidez do token de recompensa** (ex.: AERO = sólido) e mostramos o **piso sem incentivo**.
- **Score de risco CEGO À ORIGEM:** pool Nortoken não ganha bônus; `source` é só metadata.
- **Não-custodial:** seu dinheiro nunca passa pela Mazari. Depósito e saque são **1 transação que VOCÊ assina** (via aggregator Enso).

---

## Como rodar (dev)

Pré-requisitos: Node 22+, pnpm 10, e os segredos em `.env` (gitignored — ver [Configuração](#configuração)).

```bash
pnpm install

# 1) Ingestor — puxa as pools reais (DefiLlama + Nortoken) → Neon
pnpm -F @mazarifi/ingestor ingest

# 2) API (Express) — porta 3001
pnpm -F @mazarifi/api start

# 3) App (Vite) — porta 5174
pnpm -F @mazarifi/app dev
```

Abra **http://localhost:5174**. (Não usar Simple Browser embutido — apenas o navegador.)

Testes do motor: `pnpm -F @mazarifi/core test`. Typecheck geral: `pnpm -r typecheck`.

---

## Estrutura

```
mazarifi/
├── packages/
│   ├── core/      # matemática PURA (vitest): il, apy, gas, token, risk, scoreboard, migration
│   └── chain/     # readers viem (read-only) + gás Base + Etherscan (verified)
├── services/
│   ├── ingestor/  # cron: DefiLlama + Nortoken → enrich (core) → Neon (Drizzle)
│   └── api/       # Express: ranking, página do ativo, gás, posições, proxy de ZAP (Enso)
├── app/           # React 19 + Vite 7 + Tailwind 4 + wouter — 5 rotas
└── docs/          # COSTS.md, SECURITY-TODO.md, UI-CLAREZA.md + os canônicos
```

Detalhe técnico em [`ARCHITECTURE.md`](ARCHITECTURE.md). Por quê e pra onde vai em [`CONTEXT.md`](CONTEXT.md) e [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md). O que falta em [`TODO.md`](TODO.md).

---

## Rotas (app)

| Rota | Tela |
|---|---|
| `/` | Landing (venda) |
| `/dashboard` | Painel do usuário — melhor empréstimo + melhor pool, filtros, lista, projetor |
| `/pool/:key` | Página do ativo — rendimento, custos, checklist, migração, **depositar** |
| `/minhas-aplicacoes` | Posições reais na carteira + **sacar** |
| `/admin` | Painel do operador (gated por carteira; números demo marcados) |

---

## Configuração

Segredos em `.env` (NUNCA commitar — já gitignored) + secrets no GitHub (pro cron):

| Variável | Onde | Pra quê | Grátis? |
|---|---|---|---|
| `DATABASE_URL` | ingestor + api | Neon Postgres | ✅ |
| `ETHERSCAN_API_KEY` | ingestor | "contrato verificado" do token de incentivo | ✅ (etherscan.io) |
| `ENSO_API_KEY` | api | zap não-custodial (depósito/saque/posições) | ✅ (enso.finance) |
| `ZAP_ENABLED` | api | kill-switch do botão de depósito/saque | — |

Atualização automática dos dados: **GitHub Actions a cada 20 min** (`.github/workflows/ingest.yml`, grátis em repo público).

---

## Status

✅ **Fase 1 (Inteligência)** completa + **Execução não-custodial** (depositar → ver → sacar via Enso).
🔨 Pendências honestas (casamento exato da pool, gestão de range CL, landing redesign) em [`TODO.md`](TODO.md).
⏳ Fase 2 (keeper) e Fase 3 (performance fee) no roadmap.

> Built on Base · Transparência total. Retorno real. Não é garantia de ganho.
