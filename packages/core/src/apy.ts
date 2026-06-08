/**
 * Rendimento de pool — fee-APR HONESTO. Nunca publicamos número de terceiro como nosso:
 * recalculamos a partir de volume/fee/TVL reais (ground-truth on-chain via SwapTracked
 * nas pools Nortoken; subgraph/RPC nas externas).
 *
 * APR vs APY: APR = taxa anual SIMPLES (sem reinvestir); APY = COM juros compostos
 * (reinvestindo). APY ≥ APR sempre. Exibimos os DOIS, lado a lado e rotulados.
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
 * APR LÍQUIDO (Doc 1 §2) = bruto × (1 − fee_parceira) × (1 − fee_Mazari), onde as fees são
 * % DO RENDIMENTO (performance fee), em bps. MULTIPLICATIVO (não subtrai do APR). Na Fase 1
 * ambos = 0 (não movemos dinheiro) → líquido = bruto; campos prontos pra Fase 3 (agregador).
 * Golden: aprNet(0.10, 1000, 1000) = 0,10 × 0,9 × 0,9 = 0,081.
 */
export function aprNet(grossApr: number, partnerFeeBps = 0, mazariFeeBps = 0): number {
  return grossApr * (1 - partnerFeeBps / 10_000) * (1 - mazariFeeBps / 10_000);
}

/**
 * Converte APR → APY assumindo `periodsPerYear` reinvestimentos (default 365 = diário):
 *   APY = (1 + APR/n)^n − 1.
 * É APY ≥ APR. SEMPRE rotular a frequência ao exibir (nunca trocar um pelo outro escondido).
 * Golden: aprToApy(0.10, 1) = 0,10 ; aprToApy(0.10, 365) ≈ 0,10516.
 */
export function aprToApy(apr: number, periodsPerYear = 365): number {
  if (periodsPerYear <= 0) return apr;
  return Math.pow(1 + apr / periodsPerYear, periodsPerYear) - 1;
}
