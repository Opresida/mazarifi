import { tokenIntegrity, type TokenIntegrity } from '@mazarifi/core';
import { getTokenMeta } from '@mazarifi/chain';

const COINS_CURRENT = 'https://coins.llama.fi/prices/current/';
const MCAPS = 'https://coins.llama.fi/mcaps';

/** Protocolos consolidados/conhecidos (pra o selo "protocolo conhecido"). */
const KNOWN_PROJECTS = ['aerodrome', 'uniswap', 'curve', 'balancer', 'morpho', 'aave', 'compound', 'pendle', 'velodrome', 'sushiswap', 'pancakeswap'];
export function isKnownProtocolProject(project: string): boolean {
  const p = project.toLowerCase();
  return KNOWN_PROJECTS.some((k) => p.includes(k));
}

/** Integridade de um token de incentivo, com os fatos que a alimentam. */
export interface RewardIntegrity extends TokenIntegrity {
  token: string;
  symbol: string | null;
  mcapUsd: number | null;
  confidence: number | null;
  ageDays: number | null;
  verified: boolean | null;
  knownProtocol: boolean;
}

async function fetchPriceInfo(coins: string[]): Promise<Map<string, { symbol: string | null; confidence: number | null }>> {
  const m = new Map<string, { symbol: string | null; confidence: number | null }>();
  if (!coins.length) return m;
  try {
    const r = await fetch(`${COINS_CURRENT}${coins.join(',')}`);
    if (!r.ok) return m;
    const j = (await r.json()) as { coins?: Record<string, { symbol?: string; confidence?: number }> };
    for (const [k, v] of Object.entries(j.coins ?? {})) m.set(k.toLowerCase(), { symbol: v.symbol ?? null, confidence: v.confidence ?? null });
    return m;
  } catch {
    return m;
  }
}

async function fetchMcaps(coins: string[]): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (!coins.length) return m;
  try {
    const r = await fetch(MCAPS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coins }) });
    if (!r.ok) return m;
    const j = (await r.json()) as Record<string, { mcap?: number }>;
    for (const [k, v] of Object.entries(j)) if (v?.mcap != null) m.set(k.toLowerCase(), v.mcap);
    return m;
  } catch {
    return m;
  }
}

/** Resolve integridade dos tokens de incentivo. `knownAddrs` = endereços (lowercase) cujo protocolo é conhecido. */
export async function fetchRewardIntegrity(addrs: string[], knownAddrs: Set<string>): Promise<Map<string, RewardIntegrity>> {
  const out = new Map<string, RewardIntegrity>();
  if (!addrs.length) return out;
  const coins = addrs.map((a) => `base:${a.toLowerCase()}`);
  const [priceMap, mcapMap] = await Promise.all([fetchPriceInfo(coins), fetchMcaps(coins)]);
  for (const a of addrs) {
    const lc = a.toLowerCase();
    const key = `base:${lc}`;
    const pi = priceMap.get(key);
    const mcapUsd = mcapMap.get(key) ?? null;
    const confidence = pi?.confidence ?? null;
    const tracked = pi != null;
    const meta = await getTokenMeta(a).catch(() => ({ verified: null as boolean | null, ageDays: null as number | null, name: null }));
    const knownProtocol = knownAddrs.has(lc);
    const integ = tokenIntegrity({ mcapUsd, confidence, tracked, ageDays: meta.ageDays, verified: meta.verified, knownProtocol });
    out.set(key, { ...integ, token: a, symbol: pi?.symbol ?? null, mcapUsd, confidence, ageDays: meta.ageDays, verified: meta.verified, knownProtocol });
  }
  return out;
}
