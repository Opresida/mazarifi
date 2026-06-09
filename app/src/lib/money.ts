/** Projeção de ganho em dinheiro real (US$) a partir do rendimento líquido anual (%). */
export interface Projection {
  perDay: number;
  perMonth: number;
  perYear: number;
}

/** netAprPct = rendimento LÍQUIDO anual em % (ex.: 12.5). amount = quanto a pessoa aplica (US$). */
export function projectEarnings(amount: number, netAprPct: number | null): Projection {
  const apr = (netAprPct ?? 0) / 100;
  const perYear = amount * apr;
  return { perYear, perMonth: perYear / 12, perDay: perYear / 365 };
}
