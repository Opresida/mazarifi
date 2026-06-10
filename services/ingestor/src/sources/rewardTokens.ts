import { tokenIntegrity, type TokenIntegrity } from '@mazarifi/core';
import { getTokenMeta, CHAINS } from '@mazarifi/chain';

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

export interface RewardRef {
  addr: string;
  chain: string; // 'Base' | 'Arbitrum' — define o prefixo do coins + o chainId do Etherscan
}

/** Resolve integridade dos tokens de incentivo (multi-chain). Map keyed por `${prefixo}:${addr}`. */
export async function fetchRewardIntegrity(items: RewardRef[], knownAddrs: Set<string>): Promise<Map<string, RewardIntegrity>> {
  const out = new Map<string, RewardIntegrity>();
  if (!items.length) return out;
  const keyOf = (it: RewardRef) => `${CHAINS[it.chain]?.coinsPrefix ?? 'base'}:${it.addr.toLowerCase()}`;
  const coins = [...new Set(items.map(keyOf))];
  const [priceMap, mcapMap] = await Promise.all([fetchPriceInfo(coins), fetchMcaps(coins)]);
  for (const it of items) {
    const key = keyOf(it);
    if (out.has(key)) continue;
    const lc = it.addr.toLowerCase();
    const pi = priceMap.get(key);
    const mcapUsd = mcapMap.get(key) ?? null;
    const confidence = pi?.confidence ?? null;
    const tracked = pi != null;
    const chainId = CHAINS[it.chain]?.chainId ?? 8453;
    const meta = await getTokenMeta(it.addr, chainId).catch(() => ({ verified: null as boolean | null, ageDays: null as number | null, name: null }));
    const knownProtocol = knownAddrs.has(lc);
    const integ = tokenIntegrity({ mcapUsd, confidence, tracked, ageDays: meta.ageDays, verified: meta.verified, knownProtocol });
    out.set(key, { ...integ, token: it.addr, symbol: pi?.symbol ?? null, mcapUsd, confidence, ageDays: meta.ageDays, verified: meta.verified, knownProtocol });
  }
  return out;
}
