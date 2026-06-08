/**
 * APY de pool — fee-APR HONESTO. Nunca publicamos número de terceiro como nosso:
 * recalculamos o fee-APR a partir de volume/fee/TVL reais (ground-truth on-chain
 * quando é pool Nortoken via SwapTracked; subgraph/RPC quando é externa).
 */

export interface FeeAprInput {
  /** Volume negociado nas últimas 24h (USD). */
  volume24hUsd: number;
  /** Fee tier da pool, em fração (ex.: 0.003 = 0,3%). */
  feeTier: number;
  /** TVL ATIVO no range (USD) — base que de fato ganha o fee. */
  activeTvlUsd: number;
  /** Fração do tempo/liquidez efetivamente no range (0..1). Default 1 (full-range). */
  fractionInRange?: number;
}

/**
 * fee-APR BRUTO ≈ (vol24h × feeTier × fração_no_range) / TVL_ativo × 365.
 * Golden: vol=1e6, fee=0.003, tvl=1e6 ⇒ 0,003 × 365 = 1,095 (109,5% a.a.).
 */
export function feeAprGross(i: FeeAprInput): number {
  if (i.activeTvlUsd <= 0) return 0;
  const frac = i.fractionInRange ?? 1;
  return ((i.volume24hUsd * i.feeTier * frac) / i.activeTvlUsd) * 365;
}

/**
 * APY LÍQUIDO = bruto − fee da parceira − fee da Mazari (em bps). Na Fase 1 ambos = 0
 * (não movemos dinheiro), mas os campos já existem para a Fase 3 (agregador).
 */
export function apyNet(grossApr: number, partnerFeeBps = 0, mazariFeeBps = 0): number {
  return grossApr - (partnerFeeBps + mazariFeeBps) / 10_000;
}
