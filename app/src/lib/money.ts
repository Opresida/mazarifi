/** Projeção de ganho em dinheiro real (US$) a partir do rendimento líquido anual (%). */
export interface Projection {
  perDay: number;
  perMonth: number;
  perYear: number;
  swapCost: number; // custo do swap pra montar/desmontar o par (US$)
  gasCost: number; // gás de rede (US$, ao vivo)
  entryCost: number; // swap + gás (uma vez)
  breakEvenDays: number | null; // dias pra o ganho cobrir o custo de entrada (null se ganho ~0)
}

/**
 * netAprPct = rendimento LÍQUIDO anual em % · amount = quanto aplica (US$).
 * entryCostPct = custo de swap em % (0 p/ empréstimo) · gasUsd = gás de rede ao vivo (US$, flat).
 */
export function projectEarnings(amount: number, netAprPct: number | null, entryCostPct = 0, gasUsd = 0): Projection {
  if (!Number.isFinite(amount) || amount < 0) return { perDay: 0, perMonth: 0, perYear: 0, swapCost: 0, gasCost: 0, entryCost: 0, breakEvenDays: null };
  const apr = (Number.isFinite(netAprPct) ? (netAprPct as number) : 0) / 100;
  const perYear = amount * apr;
  const perDay = perYear / 365;
  const swapCost = (amount * Math.max(0, entryCostPct)) / 100;
  const gasCost = Math.max(0, gasUsd);
  const entryCost = swapCost + gasCost;
  const breakEvenDays = perDay > 0 ? entryCost / perDay : null;
  return { perYear, perMonth: perYear / 12, perDay, swapCost, gasCost, entryCost, breakEvenDays };
}

/** Impacto no preço (slippage) ESTIMADO do swap de entrada, % — aproximação constant-product. Aviso, não exato. */
export function priceImpactPct(amount: number, tvlUsd: number | null): number {
  if (!tvlUsd || tvlUsd <= 0 || !Number.isFinite(amount) || amount <= 0) return 0;
  return (amount / 2 / tvlUsd) * 100;
}
