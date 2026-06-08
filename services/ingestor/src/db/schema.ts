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
