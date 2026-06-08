/**
 * Impermanent Loss (perda impermanente) — a verdade que o mercado esconde.
 * Toda a Mazari Fi exibe SEMPRE "fees − IL", nunca só APY.
 */

/**
 * IL de uma posição full-range (produto constante), em função da razão de preço
 * `r = preço_novo / preço_antigo`. Retorna fração ≤ 0 (0 = sem perda).
 *
 *   IL(r) = 2·√r / (1 + r) − 1
 *
 * Golden: IL(1) = 0 ; IL(4) = −0,20 (−20%).
 */
export function ilFullRange(r: number): number {
  if (r <= 0) throw new Error('razão de preço deve ser > 0');
  return (2 * Math.sqrt(r)) / (1 + r) - 1;
}

/**
 * Eficiência de capital (amplificação) de uma posição concentrada num range [pa, pb]
 * vs. full-range. Quanto mais estreito o range, MAIOR a amplificação (e o IL).
 *
 *   amp = 1 / (1 − (pa/pb)^(1/4))
 *
 * Golden: amp(0.25, 4) = 2 (range 16×). Range → (0, ∞) ⇒ amp → 1.
 */
export function concentratedAmplification(pa: number, pb: number): number {
  if (pa <= 0 || pb <= pa) throw new Error('range inválido: exija 0 < pa < pb');
  return 1 / (1 - Math.pow(pa / pb, 0.25));
}

/**
 * IL aproximado de uma posição CONCENTRADA — IL full-range amplificado pela eficiência
 * de capital. Aproximação válida ENQUANTO o preço está dentro do range; fora do range a
 * posição vira 100% de um lado (pior caso), tratado no placar com o flag de fora-de-range.
 */
export function ilConcentrated(r: number, pa: number, pb: number): number {
  return ilFullRange(r) * concentratedAmplification(pa, pb);
}

/** Converte uma fração de IL (≤ 0) na PERDA em USD de uma posição. Retorna valor ≥ 0. */
export function ilToUsd(ilFraction: number, positionValueUsd: number): number {
  return Math.abs(ilFraction) * positionValueUsd;
}
