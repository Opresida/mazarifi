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
  // ── insumos do rendimento LÍQUIDO de IL (janela real) ──
  feeAprPct: number | null; // fee anualizado (%) — janela real
  rewardAprPct: number | null; // incentivo anualizado (%) — TEMPORÁRIO
  ilPct: number | null; // perda impermanente (%) NA janela (0 = sem IL)
  windowDays: number; // janela da fee/IL realizadas
  apyMean30d: number | null; // fee média 30d (pra montar a faixa)
  exposure: string | null; // 'single' | 'multi'
  ilRisk: string | null; // 'yes' | 'no'
  // dimensões de risco (mesmas p/ todas as fontes → régua única)
  contractAgeDays: number;
  audited: boolean;
  tvlStability: number; // 0..1
  liquidityUsd: number;
  trustScore?: number; // 0..100
  sellable: boolean;
  raw: unknown;
}
