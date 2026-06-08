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
  feeAprHonest: doublePrecision('fee_apr_honest'), // % RECALCULADO (onde há volume)
  netUsd: doublePrecision('net_usd'), // placar fees − IL (quando houver histórico)
  raw: jsonb('raw'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
