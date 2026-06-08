import { riskScore, netYield, type RiskInput } from '@mazarifi/core';
import type { NormalizedPool } from './types.js';

export interface EnrichedPool extends NormalizedPool {
  riskScore: number;
  // ── rendimento LÍQUIDO de IL (o produto) ──
  feeApr: number | null; // % fee (componente)
  rewardApr: number | null; // % incentivo (TEMPORÁRIO)
  ilPctOut: number | null; // % IL aplicado na janela
  costApr: number | null; // % custos
  netWindowPct: number | null; // resultado líquido NA janela (verdade crua)
  netApr: number | null; // % anualizado líquido
  netApy: number | null; // % composto líquido
  rangeLow: number | null; // faixa do net (%)
  rangeHigh: number | null;
}

/** Roda a pool pelo core: risco CEGO À ORIGEM + rendimento LÍQUIDO de IL (nunca fee sem IL). */
export function enrich(p: NormalizedPool): EnrichedPool {
  const rs = riskScore({
    source: p.source, // metadata — riskScore NÃO usa
    contractAgeDays: p.contractAgeDays,
    audited: p.audited,
    tvlStability: p.tvlStability,
    liquidityUsd: p.liquidityUsd,
    trustScore: p.trustScore,
    sellable: p.sellable,
  } satisfies RiskInput);

  const feeApr = p.feeAprPct;
  const rewardApr = p.rewardAprPct;
  const ilPctOut = p.ilPct;
  const costApr = 0; // v1: holding passivo ~0; custo de rebalance entra na Fase 2 (keeper)

  let netWindowPct: number | null = null;
  let netApr: number | null = null;
  let netApy: number | null = null;
  let rangeLow: number | null = null;
  let rangeHigh: number | null = null;

  // Só computa NET quando temos o IL de verdade (incl. IL=0). ilRisk=yes sem IL calculado ⇒ net null
  // (a UI mostra "IL pendente" em vez de forjar fee-como-net — a mentira que evitamos).
  if (feeApr != null && ilPctOut != null) {
    const base = { ilPct: ilPctOut, costPct: costApr, windowDays: p.windowDays };
    const comReward = netYield({ feeAprPct: feeApr, rewardAprPct: rewardApr ?? 0, ...base });
    const semReward = netYield({ feeAprPct: feeApr, rewardAprPct: 0, ...base });
    netWindowPct = comReward.netWindowPct;
    netApr = comReward.netApr;
    netApy = comReward.netApy;
    // faixa HONESTA: incentivo é frágil → low = se o incentivo sumir; high = com incentivo hoje
    rangeLow = Math.min(comReward.netApr, semReward.netApr);
    rangeHigh = Math.max(comReward.netApr, semReward.netApr);
  }

  return { ...p, riskScore: rs, feeApr, rewardApr, ilPctOut, costApr, netWindowPct, netApr, netApy, rangeLow, rangeHigh };
}
