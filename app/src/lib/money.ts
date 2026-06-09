/** Projeção de ganho em dinheiro real (US$) a partir do rendimento líquido anual (%). */
export interface Projection {
  perDay: number;
  perMonth: number;
  perYear: number;
  entryCost: number; // custo de entrar+sair, US$ (uma vez)
  breakEvenDays: number | null; // dias pra o ganho cobrir o custo de entrada (null se ganho ~0)
}

/**
 * netAprPct = rendimento LÍQUIDO anual em % (ex.: 12.5). amount = quanto a pessoa aplica (US$).
 * entryCostPct = custo de entrar+sair em % do capital (uma vez; 0 p/ empréstimo).
 */
export function projectEarnings(amount: number, netAprPct: number | null, entryCostPct = 0): Projection {
  if (!Number.isFinite(amount) || amount < 0) return { perDay: 0, perMonth: 0, perYear: 0, entryCost: 0, breakEvenDays: null };
  const apr = (Number.isFinite(netAprPct) ? (netAprPct as number) : 0) / 100;
  const perYear = amount * apr;
  const perDay = perYear / 365;
  const entryCost = (amount * Math.max(0, entryCostPct)) / 100;
  const breakEvenDays = perDay > 0 ? entryCost / perDay : null;
  return { perYear, perMonth: perYear / 12, perDay, entryCost, breakEvenDays };
}
