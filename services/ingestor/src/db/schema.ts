import { pgTable, text, doublePrecision, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

/** Snapshot mais recente de cada pool (upsert por poolKey). Histórico vem depois. */
export const pools = pgTable('pools', {
  poolKey: text('pool_key').primaryKey(), // `${source}:${id}`
  source: text('source').notNull(), // 'nortoken' | 'external' (CEGO À ORIGEM: nunca ordena)
  provenance: text('provenance').notNull(), // 'defillama' | 'nortoken-onchain'
  chain: text('chain').notNull(),
  project: text('project').notNull(),
  symbol: text('symbol').notNull(),
  tvlUsd: doublePrecision('tvl_usd'),
  apyBase: doublePrecision('apy_base'), // % reportado (referência)
  apyReward: doublePrecision('apy_reward'),
  volumeUsd24h: doublePrecision('volume_usd_24h'),
  feeTier: doublePrecision('fee_tier'),
  riskScore: integer('risk_score'),
  // ── rendimento REALIZADO em 15 dias (honesto) ──
  return15d: doublePrecision('return_15d'), // % que rendeu nos últimos 15 dias (headline)
  netAnnual15d: doublePrecision('net_annual_15d'), // % anualizado (estimativa)
  feeReturn15d: doublePrecision('fee_return_15d'),
  rewardReturn15d: doublePrecision('reward_return_15d'),
  rewardSymbol: text('reward_symbol'), // token do incentivo (ex.: 'AERO')
  rewardIntegrity: jsonb('reward_integrity'), // solidez do token de incentivo (mcap/conf/idade/verified/label)
  il15d: doublePrecision('il_15d'),
  volLow: doublePrecision('vol_low'),
  volHigh: doublePrecision('vol_high'),
  // ── rendimento LÍQUIDO de IL (a cascata honesta) ──
  feeApr: doublePrecision('fee_apr'), // % fee (componente)
  rewardApr: doublePrecision('reward_apr'), // % incentivo (TEMPORÁRIO)
  ilPct: doublePrecision('il_pct'), // % perda impermanente na janela
  costApr: doublePrecision('cost_apr'), // % custos
  netWindowPct: doublePrecision('net_window_pct'), // net DA janela (verdade crua)
  netApr: doublePrecision('net_apr'), // % anualizado líquido
  netApy: doublePrecision('net_apy'), // % composto líquido (o headline)
  rangeLow: doublePrecision('range_low'),
  rangeHigh: doublePrecision('range_high'),
  windowDays: integer('window_days'),
  exposure: text('exposure'),
  ilRisk: text('il_risk'),
  // legado (referência)
  feeAprHonest: doublePrecision('fee_apr_honest'),
  feeApyHonest: doublePrecision('fee_apy_honest'),
  netUsd: doublePrecision('net_usd'),
  raw: jsonb('raw'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Estado da rede POR CHAIN: gás AO VIVO + preço do ETH → custo de gás por tipo de op. */
export const network = pgTable('network', {
  chain: text('chain').primaryKey(), // 'Base' | 'Arbitrum'
  gasPriceGwei: doublePrecision('gas_price_gwei'),
  ethUsd: doublePrecision('eth_usd'),
  gasLendingUsd: doublePrecision('gas_lending_usd'),
  gasTradeUsd: doublePrecision('gas_trade_usd'),
  gasConcentratedUsd: doublePrecision('gas_concentrated_usd'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
