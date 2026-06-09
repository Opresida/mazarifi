/** Preço atual do ETH em USD (DefiLlama coins, grátis); fallback 3000 se a API falhar. */
export async function fetchEthUsd(): Promise<number> {
  try {
    const r = await fetch('https://coins.llama.fi/prices/current/coingecko:ethereum');
    if (!r.ok) return 3000;
    const j = (await r.json()) as { coins?: Record<string, { price?: number }> };
    return j.coins?.['coingecko:ethereum']?.price ?? 3000;
  } catch {
    return 3000;
  }
}
