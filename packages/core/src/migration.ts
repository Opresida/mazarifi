/**
 * Radar de migração — só sugere trocar de pool quando COMPENSA de verdade:
 * ganho_extra_no_horizonte > custo_de_trocar. Mensagem mastigada pro usuário.
 */

export interface MigrationInput {
  /** Ganho líquido anual estimado na pool ATUAL (A), em USD. */
  gainAUsdPerYear: number;
  /** Ganho líquido anual estimado na pool ALVO (B), em USD. */
  gainBUsdPerYear: number;
  /** Custo de trocar (gás + slippage + IL de saída) em USD. */
  switchCostUsd: number;
  /** Horizonte de investimento (dias). */
  horizonDays: number;
}

export interface MigrationAdvice {
  worthIt: boolean;
  /** Ganho extra de B sobre A ao longo do horizonte (USD). */
  extraGainUsd: number;
  switchCostUsd: number;
  /** Em quantos dias o custo da troca se paga (Infinity se B não rende mais que A). */
  paybackDays: number;
}

export function migrationAdvice(i: MigrationInput): MigrationAdvice {
  const deltaPerYear = i.gainBUsdPerYear - i.gainAUsdPerYear;
  const extraGainUsd = deltaPerYear * (i.horizonDays / 365);
  const worthIt = extraGainUsd > i.switchCostUsd;
  const paybackDays = deltaPerYear > 0 ? i.switchCostUsd / (deltaPerYear / 365) : Infinity;
  return { worthIt, extraGainUsd, switchCostUsd: i.switchCostUsd, paybackDays };
}
