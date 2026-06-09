import { riskScore, windowReturn, type RiskInput } from '@mazarifi/core';
import type { NormalizedPool } from './types.js';

export interface EnrichedPool extends NormalizedPool {
  riskScore: number;
  return15d: number | null; // % REALIZADO nos últimos 15 dias (o headline honesto)
  netAnnual15d: number | null; // % anualizado (estimativa, secundário)
}

/** Risco CEGO À ORIGEM + rendimento REALIZADO de 15 dias (líquido de IL). */
export function enrich(p: NormalizedPool): EnrichedPool {
  const rs = riskScore({
    source: p.source,
    contractAgeDays: p.contractAgeDays,
    audited: p.audited,
    tvlStability: p.tvlStability,
    liquidityUsd: p.liquidityUsd,
    trustScore: p.trustScore,
    sellable: p.sellable,
  } satisfies RiskInput);

  let return15d: number | null = null;
  let netAnnual15d: number | null = null;
  // Só computa quando temos fee realizado E IL (incl. IL=0). ilRisk=yes sem IL medível ⇒ null (NÃO forja).
  if (p.feeReturn15d != null && p.ilPct15d != null) {
    const w = windowReturn({
      feeReturnPct: p.feeReturn15d,
      rewardReturnPct: p.rewardReturn15d ?? 0,
      ilPct: p.ilPct15d,
      costPct: 0, // v1: holding passivo ~0; rebalance = Fase 2
      windowDays: p.windowDays,
    });
    return15d = w.returnPct;
    netAnnual15d = w.annualizedPct;
  }

  return { ...p, riskScore: rs, return15d, netAnnual15d };
}
