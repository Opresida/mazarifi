import type { PoolSource } from '@mazarifi/core';

/** Pool normalizada (qualquer fonte) + as dimensões de risco pro core. */
export interface NormalizedPool {
  poolKey: string;
  source: PoolSource; // 'nortoken' | 'external' — METADATA, nunca ordena
  provenance: string; // 'defillama' | 'nortoken-onchain'
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number | null;
  apyBase: number | null; // % reportado (referência)
  apyReward: number | null;
  volumeUsd24h: number | null;
  feeTier: number | null; // fração (0.003 = 0,3%)
  // dimensões de risco (mesmas p/ todas as fontes → régua única)
  contractAgeDays: number;
  audited: boolean;
  tvlStability: number; // 0..1
  liquidityUsd: number;
  trustScore?: number; // 0..100
  sellable: boolean;
  raw: unknown;
}
