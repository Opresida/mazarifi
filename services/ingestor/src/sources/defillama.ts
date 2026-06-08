import { ilFullRange } from '@mazarifi/core';
import type { NormalizedPool } from '../types.js';

const DEFILLAMA_POOLS = 'https://yields.llama.fi/pools';
const COINS_CURRENT = 'https://coins.llama.fi/prices/current/';
const COINS_HIST = 'https://coins.llama.fi/prices/historical/';
const IL_WINDOW_DAYS = 7;

interface LlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyBase7d?: number | null; // fee anualizado, janela 7d (mais honesto que 1d)
  apyReward: number | null;
  apyMean30d?: number | null; // média 30d (pra faixa)
  apy: number | null;
  il7d?: number | null; // IL realizado em 7d (%)
  volumeUsd1d?: number | null;
  volumeUsd7d?: number | null;
  sigma?: number | null; // volatilidade do APY (proxy de estabilidade)
  ilRisk?: string; // 'yes' | 'no'
  exposure?: string; // 'single' | 'multi'
  stablecoin?: boolean;
  underlyingTokens?: string[] | null;
}

function ilApplies(p: LlamaPool): boolean {
  return p.ilRisk === 'yes' && p.exposure !== 'single' && p.stablecoin !== true && (p.underlyingTokens?.length ?? 0) >= 2;
}

/** Preços (USD) de uma lista de tokens Base via DefiLlama coins (atual ou histórico). */
async function fetchPrices(coins: string[], timestamp?: number): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (coins.length === 0) return m;
  const url = timestamp ? `${COINS_HIST}${timestamp}/${coins.join(',')}` : `${COINS_CURRENT}${coins.join(',')}`;
  const r = await fetch(url);
  if (!r.ok) return m;
  const j = (await r.json()) as { coins?: Record<string, { price?: number }> };
  for (const [k, v] of Object.entries(j.coins ?? {})) if (v?.price != null) m.set(k.toLowerCase(), v.price);
  return m;
}

/** IL REAL (%) por pool: do histórico de preço dos 2 ativos numa janela de 7d. Map poolId→il%. */
async function computeImpermanentLoss(base: LlamaPool[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ilPools = base.filter(ilApplies);
  const coinIds = new Set<string>();
  for (const p of ilPools) for (const t of p.underlyingTokens!.slice(0, 2)) coinIds.add(`base:${t.toLowerCase()}`);
  const coins = [...coinIds];
  if (coins.length === 0) return out;

  const now = Math.floor(Date.now() / 1000);
  const then = now - IL_WINDOW_DAYS * 86400;
  const [pn, pt] = await Promise.all([fetchPrices(coins), fetchPrices(coins, then)]);

  for (const p of ilPools) {
    const [t0, t1] = p.underlyingTokens!.slice(0, 2).map((t) => `base:${t.toLowerCase()}`);
    const p0n = pn.get(t0), p1n = pn.get(t1), p0t = pt.get(t0), p1t = pt.get(t1);
    if (p0n && p1n && p0t && p1t && p0t > 0 && p1t > 0) {
      const r = p0n / p1n / (p0t / p1t); // variação relativa do par na janela
      if (r > 0) out.set(p.pool, Math.abs(ilFullRange(r)) * 100);
    }
  }
  return out;
}

// projetos com auditoria reconhecida (proxy honesto — TODO: base de auditorias real)
const AUDITED = ['uniswap', 'aerodrome', 'curve', 'balancer', 'compound', 'aave', 'morpho', 'pendle'];

/** Puxa pools REAIS da Base no DefiLlama (grátis, sem chave). apyBase = referência (não recalc). */
export async function fetchBasePools(limit = 30): Promise<NormalizedPool[]> {
  const res = await fetch(DEFILLAMA_POOLS);
  if (!res.ok) throw new Error(`DefiLlama HTTP ${res.status}`);
  const json = (await res.json()) as { data: LlamaPool[] };

  const base = json.data
    .filter((p) => p.chain === 'Base' && p.tvlUsd > 0)
    .sort((a, b) => b.tvlUsd - a.tvlUsd)
    .slice(0, limit);

  // IL real (histórico de preço) pras pools que têm risco de IL; 0 pras single/stable.
  const ilMap = await computeImpermanentLoss(base);

  return base.map((p) => {
    const project = p.project.toLowerCase();
    const tvlStability = p.sigma != null ? Math.max(0, Math.min(1, 1 - p.sigma)) : 0.6;
    // ilPct: 0 se IL não se aplica; valor calculado se temos preço; null se aplica mas não deu (→ net não é forjado).
    const ilPct = ilApplies(p) ? (ilMap.get(p.pool) ?? null) : 0;
    return {
      poolKey: `external:${p.pool}`,
      source: 'external' as const,
      provenance: 'defillama',
      chain: p.chain,
      project: p.project,
      symbol: p.symbol,
      tvlUsd: p.tvlUsd,
      apyBase: p.apyBase ?? p.apy ?? null,
      apyReward: p.apyReward ?? null,
      volumeUsd24h: p.volumeUsd1d ?? null,
      feeTier: null,
      // rendimento líquido (janela 7d real do DefiLlama)
      feeAprPct: p.apyBase7d ?? p.apyBase ?? p.apy ?? null,
      rewardAprPct: p.apyReward ?? null,
      ilPct,
      windowDays: 7,
      apyMean30d: p.apyMean30d ?? null,
      exposure: p.exposure ?? null,
      ilRisk: p.ilRisk ?? null,
      contractAgeDays: 365,
      audited: AUDITED.some((a) => project.includes(a)),
      tvlStability,
      liquidityUsd: p.tvlUsd,
      trustScore: undefined,
      sellable: true,
      raw: p,
    };
  });
}
