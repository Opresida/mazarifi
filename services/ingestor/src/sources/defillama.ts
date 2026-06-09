import { ilFullRange } from '@mazarifi/core';
import type { NormalizedPool } from '../types.js';

const DEFILLAMA_POOLS = 'https://yields.llama.fi/pools';
const DEFILLAMA_CHART = 'https://yields.llama.fi/chart/';
const COINS_CURRENT = 'https://coins.llama.fi/prices/current/';
const COINS_HIST = 'https://coins.llama.fi/prices/historical/';
const WINDOW_DAYS = 15;

interface LlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyBase7d?: number | null;
  apyReward: number | null;
  apy: number | null;
  volumeUsd1d?: number | null;
  sigma?: number | null;
  ilRisk?: string;
  exposure?: string;
  stablecoin?: boolean;
  underlyingTokens?: string[] | null;
}

function ilApplies(p: LlamaPool): boolean {
  return p.ilRisk === 'yes' && p.exposure !== 'single' && p.stablecoin !== true && (p.underlyingTokens?.length ?? 0) >= 2;
}

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

/** IL REAL (%) por pool: histórico de preço dos 2 ativos numa janela de 15d. */
async function computeImpermanentLoss(base: LlamaPool[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ilPools = base.filter(ilApplies);
  const coinIds = new Set<string>();
  for (const p of ilPools) for (const t of p.underlyingTokens!.slice(0, 2)) coinIds.add(`base:${t.toLowerCase()}`);
  const coins = [...coinIds];
  if (coins.length === 0) return out;

  const now = Math.floor(Date.now() / 1000);
  const then = now - WINDOW_DAYS * 86400;
  const [pn, pt] = await Promise.all([fetchPrices(coins), fetchPrices(coins, then)]);

  for (const p of ilPools) {
    const [t0, t1] = p.underlyingTokens!.slice(0, 2).map((t) => `base:${t.toLowerCase()}`);
    const p0n = pn.get(t0), p1n = pn.get(t1), p0t = pt.get(t0), p1t = pt.get(t1);
    if (p0n && p1n && p0t && p1t && p0t > 0 && p1t > 0) {
      const r = p0n / p1n / (p0t / p1t);
      if (r > 0) out.set(p.pool, Math.abs(ilFullRange(r)) * 100);
    }
  }
  return out;
}

interface ChartPoint {
  apyBase?: number | null;
  apyReward?: number | null;
}
interface Realized15d {
  feeReturn: number; // % fee realizado nos 15d
  rewardReturn: number; // % incentivo realizado nos 15d
  volLow: number; // apyBase mínimo (%)
  volHigh: number; // apyBase máximo (%)
}

/** Retorno REALIZADO nos últimos 15 dias, somando o fee diário (apyBase/365) da série do DefiLlama. */
async function fetch15dReturn(poolId: string): Promise<Realized15d | null> {
  try {
    const r = await fetch(`${DEFILLAMA_CHART}${poolId}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: ChartPoint[] };
    const data = (j.data ?? []).slice(-WINDOW_DAYS);
    if (data.length === 0) return null;
    let feeReturn = 0;
    let rewardReturn = 0;
    const bases: number[] = [];
    for (const d of data) {
      const b = d.apyBase ?? 0;
      feeReturn += b / 365;
      rewardReturn += (d.apyReward ?? 0) / 365;
      bases.push(b);
    }
    return { feeReturn, rewardReturn, volLow: Math.min(...bases), volHigh: Math.max(...bases) };
  } catch {
    return null;
  }
}

const AUDITED = ['uniswap', 'aerodrome', 'curve', 'balancer', 'compound', 'aave', 'morpho', 'pendle'];

/** Puxa pools REAIS da Base + IL 15d + retorno REALIZADO 15d (do /chart). */
export async function fetchBasePools(limit = 30): Promise<NormalizedPool[]> {
  const res = await fetch(DEFILLAMA_POOLS);
  if (!res.ok) throw new Error(`DefiLlama HTTP ${res.status}`);
  const json = (await res.json()) as { data: LlamaPool[] };

  const base = json.data.filter((p) => p.chain === 'Base' && p.tvlUsd > 0).sort((a, b) => b.tvlUsd - a.tvlUsd).slice(0, limit);

  // IL 15d (histórico de preço) + retorno realizado 15d (série /chart, em paralelo).
  const [ilMap, charts] = await Promise.all([
    computeImpermanentLoss(base),
    Promise.all(base.map((p) => fetch15dReturn(p.pool))),
  ]);

  return base.map((p, i) => {
    const project = p.project.toLowerCase();
    const tvlStability = p.sigma != null ? Math.max(0, Math.min(1, 1 - p.sigma)) : 0.6;
    const ilPct15d = ilApplies(p) ? (ilMap.get(p.pool) ?? null) : 0;
    const ch = charts[i];
    // fee/reward realizados em 15d: do /chart; fallback = apyBase7d × 15/365.
    const fallbackFee = ((p.apyBase7d ?? p.apyBase) ?? null) != null ? ((p.apyBase7d ?? p.apyBase)! * WINDOW_DAYS) / 365 : null;
    const feeReturn15d = ch ? ch.feeReturn : fallbackFee;
    const rewardReturn15d = ch ? ch.rewardReturn : p.apyReward != null ? (p.apyReward * WINDOW_DAYS) / 365 : 0;
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
      feeReturn15d,
      rewardReturn15d,
      ilPct15d,
      volLow: ch ? ch.volLow : null,
      volHigh: ch ? ch.volHigh : null,
      windowDays: WINDOW_DAYS,
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
