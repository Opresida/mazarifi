import type { Pool } from '../types';
import { fmtUsd, safetyBand } from './format';

/** Rendimento líquido a usar na tela (net real; senão o reportado). */
export function poolNet(p: Pool): number | null {
  return p.net_apr ?? p.apy_base;
}

/** Nome amigável da oportunidade. */
export function poolName(p: Pool): string {
  return p.symbol.replace(/-/g, ' / ');
}

/** Frase-porquê do "Melhor opção agora" — SÓ dados reais (sem inventar idade). */
export function whyBest(p: Pool): string {
  const net = poolNet(p);
  const seg = safetyBand(p.risk_score).label.toLowerCase();
  const aplicado = fmtUsd(p.tvl_usd);
  const netTxt = net != null ? `~${net.toFixed(1)}% ao ano já tirando as perdas` : 'um bom rendimento';
  return `Rende ${netTxt}, é ${seg}, e já tem ${aplicado} aplicado aqui.`;
}
