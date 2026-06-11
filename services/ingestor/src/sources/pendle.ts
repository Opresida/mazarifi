/** Casa nossas pools Pendle com os markets reais da Pendle (pra montar a posição + saber o vencimento). */
const PENDLE = 'https://api-v2.pendle.finance/core/v1';
const UA = { 'User-Agent': 'Mozilla/5.0' }; // a Pendle bloqueia user-agent default

export interface PendleMatch {
  market: string; // endereço do market
  pt: string; // endereço do PT (alvo do swap "rende fixo")
  expiry: string; // ISO — vencimento do PT
}

/** Pendle devolve endereços como `42161-0x...`; normaliza pro 0x… lowercase. */
const addr = (x?: string): string => (x && String(x).includes('-') ? String(x).split('-').pop()! : x ?? '').toLowerCase();

/** Índice dos markets ATIVOS de uma chain, por endereço conhecido (market/pt/sy/yt/underlying → match). */
export async function fetchPendleIndex(chainId: number): Promise<Map<string, PendleMatch>> {
  const idx = new Map<string, PendleMatch>();
  try {
    const r = await fetch(`${PENDLE}/${chainId}/markets/active`, { headers: UA });
    if (!r.ok) return idx;
    const j = (await r.json()) as { markets?: Array<Record<string, string>> };
    for (const m of j.markets ?? []) {
      if (!m.address || !m.pt || !m.expiry) continue;
      const match: PendleMatch = { market: addr(m.address), pt: addr(m.pt), expiry: m.expiry };
      for (const f of ['address', 'pt', 'sy', 'yt', 'underlyingAsset']) {
        const a = addr(m[f]);
        if (a) idx.set(a, match);
      }
    }
  } catch {
    /* graceful — sem index, a pool Pendle fica sem engine (honesto) */
  }
  return idx;
}

/** Acha o market que casa com os tokens da nossa pool (por endereço). */
export function matchPendle(idx: Map<string, PendleMatch>, underlyingTokens?: string[] | null): PendleMatch | null {
  for (const t of underlyingTokens ?? []) {
    const m = idx.get(String(t).toLowerCase());
    if (m) return m;
  }
  return null;
}
