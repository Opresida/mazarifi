import type { PoolSource } from '@mazarifi/core';

/** Pool normalizada (qualquer fonte) + dimensões de risco + rendimento REALIZADO em 15 dias. */
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
  feeTier: number | null;
  // ── rendimento REALIZADO nos últimos 15 dias (% DO PERÍODO) ──
  feeReturn15d: number | null; // fee realizado em 15d
  rewardReturn15d: number | null; // incentivo realizado em 15d (TEMPORÁRIO)
  ilPct15d: number | null; // IL realizado em 15d (0 = sem IL; null = aplicável mas não medido)
  volLow: number | null; // apyBase mínimo nos 15d (%) — volatilidade
  volHigh: number | null; // apyBase máximo nos 15d (%)
  windowDays: number; // 15
  exposure: string | null; // 'single' | 'multi'
  ilRisk: string | null; // 'yes' | 'no'
  // dimensões de risco (mesmas p/ todas as fontes)
  contractAgeDays: number;
  audited: boolean;
  tvlStability: number;
  liquidityUsd: number;
  trustScore?: number;
  sellable: boolean;
  raw: unknown;
}
