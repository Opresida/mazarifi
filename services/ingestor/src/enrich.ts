import { riskScore, feeAprGross, apyNet, type RiskInput } from '@mazarifi/core';
import type { NormalizedPool } from './types.js';

export interface EnrichedPool extends NormalizedPool {
  riskScore: number;
  feeAprHonest: number | null; // % (RECALCULADO on-chain onde há volume)
  netUsd: number | null;
}

/** Roda a pool pelo core: risco CEGO À ORIGEM + fee-APR honesto (onde há volume). */
export function enrich(p: NormalizedPool): EnrichedPool {
  const risk: RiskInput = {
    source: p.source, // metadata — riskScore NÃO usa
    contractAgeDays: p.contractAgeDays,
    audited: p.audited,
    tvlStability: p.tvlStability,
    liquidityUsd: p.liquidityUsd,
    trustScore: p.trustScore,
    sellable: p.sellable,
  };
  const rs = riskScore(risk);

  // fee-APR HONESTO: só recalcula quando temos volume + tier + TVL reais (pools Nortoken).
  // Pras externas (sem tier/volume confiável), fica null → o ranking usa apyBase reportado (proveniência).
  let feeAprHonest: number | null = null;
  if (p.volumeUsd24h != null && p.feeTier != null && p.tvlUsd && p.tvlUsd > 0) {
    const gross = feeAprGross({ volume24hUsd: p.volumeUsd24h, feeTier: p.feeTier, activeTvlUsd: p.tvlUsd });
    feeAprHonest = apyNet(gross) * 100; // fração → % (mesma convenção do apyBase)
  }

  // placar honesto (fees − IL): precisa de IL realizado (histórico de preço) → v1 deixa null (TODO).
  const netUsd: number | null = null;

  return { ...p, riskScore: rs, feeAprHonest, netUsd };
}
