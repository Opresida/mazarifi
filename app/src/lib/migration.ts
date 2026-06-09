import type { Pool } from '../types';
import { poolType, poolAnnual, poolReturn15d } from './pool';

export interface MigrationAdvice {
  worthIt: boolean;
  extraGainUsd: number; // ganho extra de B sobre A no horizonte
  switchCostUsd: number;
  paybackDays: number; // dias pra o custo da troca se pagar (Infinity se B não rende mais)
}

/** Espelha core/migrationAdvice: só vale trocar quando ganho_extra_no_horizonte > custo. */
export function migrationAdvice(gainAUsdPerYear: number, gainBUsdPerYear: number, switchCostUsd: number, horizonDays: number): MigrationAdvice {
  const deltaPerYear = gainBUsdPerYear - gainAUsdPerYear;
  const extraGainUsd = deltaPerYear * (horizonDays / 365);
  const worthIt = extraGainUsd > switchCostUsd;
  const paybackDays = deltaPerYear > 0 ? switchCostUsd / (deltaPerYear / 365) : Infinity;
  return { worthIt, extraGainUsd, switchCostUsd, paybackDays };
}

/** Melhor alternativa do MESMO tipo (empréstimo/troca/concentrada) com rendimento anual maior. */
export function bestAlternative(pool: Pool, all: Pool[]): Pool | null {
  const t = poolType(pool);
  const annA = poolAnnual(pool) ?? 0;
  const cands = all.filter(
    (p) => p.pool_key !== pool.pool_key && poolReturn15d(p) != null && poolType(p) === t && (poolAnnual(p) ?? 0) > annA,
  );
  cands.sort((a, b) => (poolAnnual(b) ?? 0) - (poolAnnual(a) ?? 0));
  return cands[0] ?? null;
}
