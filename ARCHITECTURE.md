# Arquitetura — Mazari Fi

Monorepo **pnpm** que espelha o padrão do Nortoken. Tudo na **Base** (mainnet). Princípio: o motor é **matemática pura testável**; I/O fica nas bordas; o usuário **assina** qualquer movimento de dinheiro (não-custodial).

## Fluxo de dados (alto nível)

```
DefiLlama (pools/chart/coins/mcaps)  ┐
Etherscan V2 (contrato verificado)   ├─► services/ingestor ─(enrich via core)─► Neon (tabelas pools, network)
Base RPC (preço do gás)              ┘                                              │
Nortoken on-chain (SwapTracked/lock) ─► packages/chain ───────────────────────────┘
                                                                                   │
                                                          services/api (Express, lê o Neon) ◄─ app (React)
                                                          + proxy Enso (zap) ──► carteira do usuário ASSINA
```

- **Cron (GitHub Actions, 20 min):** roda o ingestor → Neon sempre fresco. App/API só **leem** o Neon.
- **Zap (Enso):** a API monta a transação (chave Enso server-side); o **usuário assina** da própria carteira. Fundos **nunca** passam pela Mazari.

## packages/core — motor PURO (vitest, sem I/O)

| Módulo | O que faz |
|---|---|
| `il.ts` | Perda impermanente: `ilFullRange(r)=2√r/(1+r)−1`, concentrada amplificada |
| `apy.ts` | `feeAprGross`, `aprNet` (multiplicativo), `aprToApy`, **`netYield`** (líquido de IL na janela), **`windowReturn`** (retorno REALIZADO em N dias), **`entryExitCostPct`** (custo de montar/desmontar o par) |
| `gas.ts` | `gasCostUsd` (preço ao vivo × gas units típicas), `OP_GAS` (lending/troca/concentrada), `priceImpactPct` (slippage) |
| `token.ts` | `tokenIntegrity` (mcap + liquidez + idade + verificado + protocolo → Sólido/Razoável/Cuidado) |
| `risk.ts` | Score 0-100 **CEGO À ORIGEM** + bandas (Seguro/Médio/Arriscado) |
| `scoreboard.ts` | Placar honesto fees − IL − custos |
| `migration.ts` | `migrationAdvice` — só sugere trocar quando ganho_extra > custo |

## packages/chain — readers viem (read-only)

- `client.ts`: `publicClient` (Base Sepolia, pools Nortoken) + **`baseClient`** (Base mainnet) + `getBaseGasPriceWei`.
- `pool.ts`/`swaps.ts`/`lock.ts`: `getPoolPrice`, `getSwapStats` (volume/fees reais do `SwapTracked`), `getLockPosition`.
- `tokenMeta.ts`: `getTokenMeta` via **Etherscan V2** (chainid=8453) → `verified` (idade é paga no free tier da Base → null).

## services/ingestor — cron → Neon (Drizzle)

- `sources/defillama.ts`: **2 baldes** (top por TVL + top de troca `exposure=multi`) → IL 15d (coins) + retorno realizado 15d (`/chart`) + fee tier (poolMeta) + integridade do reward (`rewardTokens` → símbolo + mcap + verified).
- `sources/nortoken.ts`: lê as 3 pools v4 semeadas (preço/volume/lock) com `formatUnits` + preço ETH real.
- `prices.ts`: `fetchEthUsd` (DefiLlama coins).
- `enrich.ts`: aplica `core` (risk + windowReturn) → grava net realizado.
- `index.ts`: upsert + **deleta obsoletas** (pools que saíram do top) + grava **gás ao vivo** na tabela `network`.

## services/api — Express (lê Neon, proxy Enso)

| Endpoint | O que |
|---|---|
| `GET /api/pools` | ranking (risco, depois net anualizado) |
| `GET /api/pool/:key` | uma pool (página do ativo) |
| `GET /api/stats` | agregados do header |
| `GET /api/best` | `{ lending, trade }` — 2 destaques (TVL mínimo, penaliza volatilidade) |
| `GET /api/admin/metrics` | agregados reais (por chain, risco) |
| `GET /api/network` | gás Base ao vivo + ETH/USD |
| `GET /api/positions` | posições DeFi do usuário (Enso wallet balances → filtra `type=defi`) |
| `GET /api/zap/quote` | tx de **depósito** USDC → posição (Enso) |
| `GET /api/zap/withdraw` | tx de **saque** posição → USDC (Enso) |
| `GET /api/zap/allowance` | allowance ERC20 lido server-side (RPC confiável) |

Erros 500 nunca vazam detalhe (msg genérica + `console.error`). CORS aberto (restringir no deploy — ver `docs/SECURITY-TODO.md`).

## app — React 19 + Vite 7 + Tailwind 4 + wouter

- Identidade **"Ink & Lime"** (ink #0A0B14, lime #34E29B, íris #7C6FF0, ouro #F5B544) — tokens no `index.css`.
- `Shell` (sidebar desktop / bottom-tab mobile) com **rotas reais**.
- `lib/`: `wallet` (connect/sendTx/switchToBase não-custodial), `zap` (quote/withdraw/allowance), `erc20` (encode), `pool`/`migration`/`checklist`/`money`/`format`.
- Componentes-chave: `OpportunityCard`, `MoneyProjector` (gás+slippage), `PoolDetailContent` (reusado na página), `DepositPanel`, `PositionsSection`+`WithdrawCard`, `Filters`.

## Neon (Postgres)

Projeto `mazarifi` id **`royal-wildflower-24686969`**. Tabelas:
- **`pools`** — snapshot por `pool_key` (`source:id`): tvl, retorno 15d realizado + componentes (fee/reward/il), volatilidade, risco, fee_tier, exposure, `reward_integrity` (jsonb), `raw` (DefiLlama), updated_at.
- **`network`** — 1 linha: gás ao vivo por tipo de operação + ETH/USD.

## Não-custodial + segurança

- Chaves (Enso/Etherscan/DB) só no servidor; nunca no bundle.
- Allowance lido server-side (a RPC da carteira no browser é instável).
- Kill-switch `ZAP_ENABLED`. Itens deferidos (auth admin, CORS, zod, holders) em `docs/SECURITY-TODO.md`.
