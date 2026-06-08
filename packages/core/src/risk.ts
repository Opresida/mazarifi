/**
 * Score de risco unificado 0-100. INTEGRIDADE INEGOCIÁVEL: o otimizador é CEGO À ORIGEM.
 * `source` é APENAS metadata — NUNCA entra no cálculo. Pool Nortoken e pool externa são
 * medidas pelas MESMAS dimensões. (Teste de regressão garante isso.)
 */

export type PoolSource = 'nortoken' | 'external';

export interface RiskInput {
  /** METADATA — para exibição/proveniência. NUNCA usado no cálculo do score. */
  source: PoolSource;
  /** Idade do contrato da pool (dias). */
  contractAgeDays: number;
  /** Contrato auditado? */
  audited: boolean;
  /** Estabilidade do TVL (0..1; 1 = TVL muito estável). */
  tvlStability: number;
  /** Liquidez total (USD). */
  liquidityUsd: number;
  /** Nota de confiança do token 0..100 (Nortoken trustScore OU equivalente externo).
   *  É UM fator, SEM bônus por ser Nortoken. */
  trustScore?: number;
  /** Vendável (honeypot-free) — dá pra sair da posição? */
  sellable: boolean;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Pesos (total 100): trustScore 30 · idade 20 · auditoria 15 · estabilidade TVL 15 ·
 * liquidez 15 · vendabilidade 5. O campo `source` é IGNORADO de propósito.
 */
export function riskScore(i: RiskInput): number {
  // trustScore: se ausente, deriva de auditoria + vendabilidade (proxy conservador).
  const trust = i.trustScore != null ? clamp01(i.trustScore / 100) : (i.audited ? 0.6 : 0.3) * (i.sellable ? 1 : 0.5);
  const age = clamp01(i.contractAgeDays / 180); // 6 meses = maturidade plena
  const liq = clamp01(Math.log10(Math.max(1, i.liquidityUsd)) / 7); // 1e7 USD = pleno

  const score =
    trust * 30 +
    age * 20 +
    (i.audited ? 15 : 0) +
    clamp01(i.tvlStability) * 15 +
    liq * 15 +
    (i.sellable ? 5 : 0);

  return Math.round(score);
}

export type RiskBand = 'high' | 'medium' | 'low';
export function riskBand(score: number): RiskBand {
  if (score >= 75) return 'high'; // alta CONFIANÇA (baixo risco)
  if (score >= 50) return 'medium';
  return 'low';
}
