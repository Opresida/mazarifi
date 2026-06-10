# Arquitetura — Mazari Fi

Monorepo **pnpm** que espelha o padrão do Nortoken. Multi-chain **Base + Arbitrum** (mainnet) — o "chain" é **config** (`packages/chain/chains.ts`), não hardcoded; adicionar rede = só pôr no `CHAINS`. Princípio: o motor é **matemática pura testável**; I/O fica nas bordas; o usuário **assina** qualquer movimento de dinheiro (não-custodial).

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
- **Cross-chain (LiFi):** se o USDC do user está em outra rede, a API cota a ponte (LiFi) e — opcionalmente — monta **1 tx** que faz ponte + executa o zap Enso no vault do destino (`/quote/contractCalls`). Rebate de integrador (`Mazari-Fi`) cai no tesouro.

### Config de chain (`packages/chain/chains.ts`)
`CHAINS` = `{ Base, Arbitrum }` com `name`/`beefyChain`/`coinsPrefix`/`chainId`/`chainIdHex`/`usdc`/`rpc`/`explorer`. `clientFor(chain)` + `getGasPriceWei(chain)`. Ingestor e API importam `@mazarifi/chain`; o app tem um espelho enxuto em `app/src/lib/chains.ts` (`chainCfg`).

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

- `chains.ts`: **`CHAINS`** (Base+Arbitrum) + `clientFor(chain)` + `getGasPriceWei(chain)` (gás por chain).
- `client.ts`: `publicClient` (Base Sepolia, pools Nortoken).
- `pool.ts`/`swaps.ts`/`lock.ts`: `getPoolPrice`, `getSwapStats` (volume/fees reais do `SwapTracked`), `getLockPosition`.
- `tokenMeta.ts`: `getTokenMeta(addr, chainId)` via **Etherscan V2** (chainId por chain) → `verified`.

## services/ingestor — cron → Neon (Drizzle)

- `sources/defillama.ts`: **loop em `CHAIN_LIST`** — 2 baldes por chain (top TVL + top troca `exposure=multi`) → IL 15d (coins, prefixo por chain) + retorno realizado 15d (`/chart`) + fee tier + integridade do reward (por chain).
- `sources/beefy.ts`: **gerenciadas Beefy-CLM por chain** — cow-vaults (`beefyChain`) casadas ao vault DefiLlama (`apy` total = NOSSA matemática 15d), TVL≥$100k, curadoria estável/blue-chip/major (+ majors Arb: ARB/GMX/PENDLE/GRAIL), `risks` (Risk Checklist), volume do CL subjacente, `vaultAddress` pro zap.
- `sources/nortoken.ts`: lê as 3 pools v4 semeadas (Base Sepolia, demo).
- `prices.ts`: `fetchEthUsd` (DefiLlama coins).
- `enrich.ts`: aplica `core` (risk + windowReturn) → grava net realizado.
- `index.ts`: upsert + **deleta obsoletas** + grava **gás ao vivo POR CHAIN** na tabela `network`.

## services/api — Express (lê Neon, proxy Enso)

| Endpoint | O que |
|---|---|
| `GET /api/pools` | ranking (risco, depois net anualizado) |
| `GET /api/pool/:key` | uma pool (página do ativo) |
| `GET /api/stats` | agregados do header |
| `GET /api/best` | `{ lending, trade }` — 2 destaques (TVL mínimo, penaliza volatilidade) |
| `GET /api/admin/metrics` | agregados reais (por chain, risco) |
| `GET /api/network` | gás ao vivo **por chain** (mapa) + ETH/USD |
| `GET /api/positions` | posições DeFi do usuário em **todas as chains** (Enso wallet balances) |
| `GET /api/zap/quote` | tx de **depósito** USDC → posição (Enso), na chain da pool |
| `GET /api/zap/withdraw` | tx de **saque** posição → USDC (Enso), na chain da posição |
| `GET /api/zap/allowance` | allowance ERC20 lido server-side (RPC da chain) |
| `GET /api/usdc-balances` | saldo de USDC do user **em cada chain** (detecta de onde trazer) |
| `GET /api/bridge/quote` | ponte de USDC origem→destino (LiFi, melhor rota) + rebate |
| `GET /api/bridge/deposit-quote` | **1 tx**: ponte + zap Enso no vault do destino (LiFi contractCalls) |

`chainOf(pool.chain)` resolve `chainId/usdc/rpc` em todos os endpoints de zap; `buildEnsoZap(pool,cfg,amount,receiver)` é o resolvedor de zap reutilizado pelo `/zap/quote` e pelo cross-deposit. Erros 500 nunca vazam detalhe (msg genérica + `console.error`). CORS aberto (restringir no deploy — ver `docs/SECURITY-TODO.md`).
**Limite conhecido:** o Enso roteia só **alguns** vaults gerenciados (404/422 nos outros) → `supported:false` tratado; mapear zappers alternativos é tarefa aberta (ver `TODO.md`).

## app — React 19 + Vite 7 + Tailwind 4 + wouter

- Identidade **"Ink & Lime"** (ink #0A0B14, lime #34E29B, íris #7C6FF0, ouro #F5B544) — tokens no `index.css`.
- `Shell` (sidebar desktop / bottom-tab mobile) com **rotas reais**.
- `lib/`: `chains` (espelho do `CHAINS`), `wallet` (connect/sendTx/**`switchToChain`** não-custodial), `zap` (quote/withdraw/allowance, USDC por chain), `bridge` (saldos + ponte + cross-deposit), `erc20`, `pool`/`migration`/`checklist`/`money`/`format`/`tokens`/`beefyRisks`.
- Componentes-chave: `OpportunityCard`, `MoneyProjector`, `PoolDetailContent`, `DepositPanel` (+ **`BridgeCard`** auto-detect/1-clique cross-chain), `PositionsSection`+`WithdrawCard`, `TokenDetailsCard`, `Filters`. `NetworkMap` (gás por chain) → `poolGasUsd(p, net)` indexa `net[p.chain]`.

## Neon (Postgres)

Projeto `mazarifi` id **`royal-wildflower-24686969`**. Tabelas:
- **`pools`** — snapshot por `pool_key` (`source:id`): chain, tvl, retorno 15d realizado + componentes, volatilidade, risco, fee_tier, exposure, `reward_integrity` (jsonb), `raw` (managed/vaultAddress/risks/assets/underlyingTokens), updated_at.
- **`network`** — **keyed by `chain`** (1 linha por rede): gás ao vivo por tipo de operação + ETH/USD.

## Não-custodial + segurança

- Chaves (Enso/Etherscan/DB) só no servidor; nunca no bundle.
- Allowance lido server-side (a RPC da carteira no browser é instável).
- Kill-switch `ZAP_ENABLED`. Itens deferidos (auth admin, CORS, zod, holders) em `docs/SECURITY-TODO.md`.
