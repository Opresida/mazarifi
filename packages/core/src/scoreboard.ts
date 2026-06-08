/**
 * O PLACAR HONESTO — o número que ninguém entrega: o resultado REAL de ser LP num
 * período = fees ganhos − IL real − custos. APY sozinho mente; isto não.
 */

export interface ScoreboardInput {
  /** Fees ganhos no período (USD). */
  feesEarnedUsd: number;
  /** Perda por IL no período (USD, valor ≥ 0). Use `ilToUsd` para obter. */
  ilUsd: number;
  /** Custos do período (gás, rebalance, etc.) em USD. Default 0. */
  costsUsd?: number;
}

export interface Scoreboard {
  feesEarnedUsd: number;
  ilUsd: number;
  costsUsd: number;
  /** Resultado líquido = fees − IL − custos. Pode ser negativo (e o LP deve saber). */
  netUsd: number;
  /** O LP saiu no lucro de verdade? */
  profitable: boolean;
}

export function honestScoreboard(i: ScoreboardInput): Scoreboard {
  const costsUsd = i.costsUsd ?? 0;
  const netUsd = i.feesEarnedUsd - i.ilUsd - costsUsd;
  return {
    feesEarnedUsd: i.feesEarnedUsd,
    ilUsd: i.ilUsd,
    costsUsd,
    netUsd,
    profitable: netUsd > 0,
  };
}
