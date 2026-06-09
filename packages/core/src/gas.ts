/**
 * Custo de gás de uma operação em USD. O PREÇO do gás é ao vivo (wei); as UNITS são típicas.
 * Converte via gwei pra evitar perda de precisão de BigInt grande.
 * Golden: 200k units, 1 gwei (1e9 wei), ETH $2000 → 200000×1e-9 ETH ×$2000 = $0,40... na Base o preço é bem menor.
 */
export function gasCostUsd(i: { gasUnits: number; gasPriceWei: bigint; ethUsd: number }): number {
  const gasPriceGwei = Number(i.gasPriceWei) / 1e9; // gwei: número pequeno e seguro
  const gasEth = (i.gasUnits * gasPriceGwei) / 1e9; // = units × wei / 1e18
  return gasEth * i.ethUsd;
}

/**
 * Gás estimado (round-trip entrada+saída) por tipo de oportunidade, em gas units.
 * Estimativas conservadoras; o PREÇO é ao vivo, as UNITS são típicas (documentado em docs/COSTS.md).
 */
export const OP_GAS = {
  emprestimo: 250_000, // approve + deposit + withdraw
  troca: 450_000, // approve + swap-pra-balancear + addLiquidity + remove + swap-de-volta
  concentrada: 650_000, // idem + mint/burn de posição NFT (Uniswap V3 / CL)
} as const;
export type OpKind = keyof typeof OP_GAS;

/**
 * Impacto no preço (slippage) ESTIMADO do swap de entrada, em % — aproximação constant-product.
 * Pra montar o par você troca ~metade do valor; impacto ≈ (amount/2)/tvl. Lending (sem swap) = 0.
 * É um AVISO honesto (pools reais têm curvas diferentes), não um número exato.
 * Golden: $10k numa pool de $1M → (5000/1e6)×100 = 0,5%.
 */
export function priceImpactPct(i: { amountUsd: number; tvlUsd: number | null }): number {
  if (!i.tvlUsd || i.tvlUsd <= 0 || i.amountUsd <= 0) return 0;
  return (i.amountUsd / 2 / i.tvlUsd) * 100;
}
