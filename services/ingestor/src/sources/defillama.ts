import { ilFullRange } from '@mazarifi/core';
import { fetchRewardIntegrity, isKnownProtocolProject } from './rewardTokens.js';
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
  rewardTokens?: string[] | null; // endereços dos tokens de incentivo (ex.: AERO)
  poolMeta?: string | null; // ex.: "0.3%" (fee tier de pools de troca)
}

function ilApplies(p: LlamaPool): boolean {
  return p.ilRisk === 'yes' && p.exposure !== 'single' && p.stablecoin !== true && (p.underlyingTokens?.length ?? 0) >= 2;
}

/** Extrai o fee tier (fração) do poolMeta do DefiLlama: "0.3%" → 0.003. null se não houver. */
function parseFeeTier(poolMeta: string | null | undefined): number | null {
  const m = poolMeta?.match(/([\d.]+)\s*%/);
  return m ? parseFloat(m[1]) / 100 : null;
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

  // Dois baldes pra garantir cobertura: o topo de TVL na Base é dominado por EMPRÉSTIMO (lending),
  // então pegamos também as melhores pools de TROCA (AMM = exposure 'multi') separadamente.
  const all = json.data.filter((p) => p.chain === 'Base' && p.tvlUsd > 0).sort((a, b) => b.tvlUsd - a.tvlUsd);
  const topOverall = all.slice(0, limit); // top por TVL (lending + o que vier)
  const topTrade = all.filter((p) => p.exposure === 'multi').slice(0, 25); // garante pools de troca/concentradas
  const seen = new Set<string>();
  const base = [...topOverall, ...topTrade].filter((p) => (seen.has(p.pool) ? false : (seen.add(p.pool), true)));

  // Tokens de incentivo: endereços únicos + quais têm protocolo conhecido.
  const rewardAddrs = new Set<string>();
  const knownAddrs = new Set<string>();
  for (const p of base)
    for (const a of p.rewardTokens ?? []) {
      const lc = a.toLowerCase();
      rewardAddrs.add(lc);
      if (isKnownProtocolProject(p.project)) knownAddrs.add(lc);
    }

  // IL 15d (histórico) + retorno realizado 15d (/chart) + integridade dos tokens de incentivo, em paralelo.
  // .catch em cada um: se uma API externa falhar, não derruba a ingestão inteira.
  const [ilMap, charts, rewardInteg] = await Promise.all([
    computeImpermanentLoss(base).catch(() => new Map<string, number>()),
    Promise.all(base.map((p) => fetch15dReturn(p.pool).catch(() => null))),
    fetchRewardIntegrity([...rewardAddrs], knownAddrs).catch(() => new Map()),
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
    const rewardSymbol =
      (p.rewardTokens ?? []).map((a) => rewardInteg.get(`base:${a.toLowerCase()}`)?.symbol).filter(Boolean).join(', ') || null;
    const primaryReward = (p.rewardTokens ?? [])[0];
    const rewardIntegrity = primaryReward ? rewardInteg.get(`base:${primaryReward.toLowerCase()}`) ?? null : null;
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
      feeTier: parseFeeTier(p.poolMeta),
      feeReturn15d,
      rewardReturn15d,
      rewardSymbol,
      rewardIntegrity,
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
