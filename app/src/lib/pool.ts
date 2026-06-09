import type { Pool } from '../types';
import { fmtUsd, safetyBand } from './format';

/** Rendimento anualizado a usar no ranking/projetor (base 15d; senão o reportado). */
export function poolAnnual(p: Pool): number | null {
  return p.net_annual_15d ?? p.apy_base;
}

/** O que rendeu nos últimos 15 dias (% do período) — o número honesto do headline. */
export function poolReturn15d(p: Pool): number | null {
  return p.return_15d;
}

export function poolName(p: Pool): string {
  return p.symbol.replace(/-/g, ' / ');
}

/** Pool de liquidez concentrada (assume range ideal — rende mais, mais complexa). */
export function isConcentrated(p: Pool): boolean {
  const pr = p.project.toLowerCase();
  return pr.includes('v3') || pr.includes('slipstream') || pr.includes('clm') || pr.includes('concentrated');
}

/** Oscilou demais nos 15 dias? (apyBase variou muito) */
export function isVolatile(p: Pool): boolean {
  return p.vol_low != null && p.vol_high != null && p.vol_low > 0 && p.vol_high > p.vol_low * 2.5;
}

export function volBand(p: Pool): string | null {
  if (p.vol_low == null || p.vol_high == null) return null;
  return `${Math.round(p.vol_low)}% a ${Math.round(p.vol_high)}%`;
}

/** Frase-porquê do "Melhor opção agora" — SÓ dados reais (sem inventar idade). */
export function whyBest(p: Pool): string {
  const ret = p.return_15d;
  const seg = safetyBand(p.risk_score).label.toLowerCase();
  const aplicado = fmtUsd(p.tvl_usd);
  const retTxt = ret != null ? `rendeu ${ret >= 0 ? '+' : ''}${ret.toFixed(2)}% nos últimos 15 dias` : 'vem rendendo bem';
  return `Essa oportunidade ${retTxt}, é ${seg}, e já tem ${aplicado} aplicado aqui.`;
}
