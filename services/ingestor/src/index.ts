import 'dotenv/config';
import { db } from './db/client.js';
import { pools } from './db/schema.js';
import { fetchBasePools } from './sources/defillama.js';
import { fetchNortokenPools } from './sources/nortoken.js';
import { enrich, type EnrichedPool } from './enrich.js';

async function main() {
  console.log('🔎 Ingestor Mazari Fi — puxando pools REAIS...\n');

  const [external, nortoken] = await Promise.all([
    fetchBasePools(30).catch((e) => {
      console.error('DefiLlama falhou:', e.message);
      return [];
    }),
    fetchNortokenPools().catch((e) => {
      console.error('Nortoken falhou:', e.message);
      return [];
    }),
  ]);

  const all: EnrichedPool[] = [...external, ...nortoken].map(enrich);
  console.log(`Pools: ${external.length} DefiLlama (Base) + ${nortoken.length} Nortoken = ${all.length}\n`);

  // upsert no Neon
  for (const p of all) {
    const row = {
      poolKey: p.poolKey,
      source: p.source,
      provenance: p.provenance,
      chain: p.chain,
      project: p.project,
      symbol: p.symbol,
      tvlUsd: p.tvlUsd,
      apyBase: p.apyBase,
      apyReward: p.apyReward,
      volumeUsd24h: p.volumeUsd24h,
      feeTier: p.feeTier,
      riskScore: p.riskScore,
      feeApr: p.feeApr,
      rewardApr: p.rewardApr,
      ilPct: p.ilPctOut,
      costApr: p.costApr,
      netWindowPct: p.netWindowPct,
      netApr: p.netApr,
      netApy: p.netApy,
      rangeLow: p.rangeLow,
      rangeHigh: p.rangeHigh,
      windowDays: p.windowDays,
      exposure: p.exposure,
      ilRisk: p.ilRisk,
      raw: p.raw as object,
      updatedAt: new Date(),
    };
    const { poolKey: _k, source: _s, provenance: _p, ...upd } = row;
    await db.insert(pools).values(row).onConflictDoUpdate({ target: pools.poolKey, set: upd });
  }
  console.log(`✅ ${all.length} pools persistidas no Neon.\n`);

  // RANKING honesto — CEGO À ORIGEM: ordena por risco, depois rendimento LÍQUIDO. `source` NÃO interfere.
  const netOf = (p: EnrichedPool) => p.netApr ?? p.apyBase ?? 0;
  const ranked = [...all].sort((a, b) => b.riskScore - a.riskScore || netOf(b) - netOf(a));

  console.log('=== TOP 15 (risco + rendimento LÍQUIDO de IL · cego à origem) ===');
  console.log('net = fee + incentivo − IL − custos (anualizado da janela) · faixa = sem↔com incentivo\n');
  for (const p of ranked.slice(0, 15)) {
    const net =
      p.netApr != null
        ? `net ${p.netApr.toFixed(1)}%${p.ilPctOut ? ` (IL −${p.ilPctOut.toFixed(2)}%/${p.windowDays}d)` : ''}`
        : p.apyBase != null
          ? `APY ${p.apyBase.toFixed(1)}% (reportado)`
          : '—';
    const sym = p.symbol.slice(0, 16).padEnd(16);
    const proj = p.project.slice(0, 13).padEnd(13);
    const tvl = `$${Math.round(p.tvlUsd ?? 0).toLocaleString('en-US')}`.padStart(13);
    console.log(`risco ${String(p.riskScore).padStart(3)} | ${sym} | ${proj} | TVL ${tvl} | ${net}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
