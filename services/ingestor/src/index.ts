import 'dotenv/config';
import { and, eq, lt } from 'drizzle-orm';
import { db } from './db/client.js';
import { pools } from './db/schema.js';
import { fetchBasePools } from './sources/defillama.js';
import { fetchNortokenPools } from './sources/nortoken.js';
import { enrich, type EnrichedPool } from './enrich.js';

async function main() {
  console.log('🔎 Ingestor Mazari Fi — puxando pools REAIS...\n');
  const runStart = new Date();

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
      return15d: p.return15d,
      netAnnual15d: p.netAnnual15d,
      feeReturn15d: p.feeReturn15d,
      rewardReturn15d: p.rewardReturn15d,
      il15d: p.ilPct15d,
      volLow: p.volLow,
      volHigh: p.volHigh,
      windowDays: p.windowDays,
      exposure: p.exposure,
      ilRisk: p.ilRisk,
      raw: p.raw as object,
      updatedAt: new Date(),
    };
    const { poolKey: _k, source: _s, provenance: _p, ...upd } = row;
    await db.insert(pools).values(row).onConflictDoUpdate({ target: pools.poolKey, set: upd });
  }
  // Remove pools externas obsoletas (saíram do top-30 → não atualizadas nesta rodada).
  // Só se a fonte externa veio OK (external > 0), pra não apagar tudo se o DefiLlama cair.
  if (external.length > 0) {
    await db.delete(pools).where(and(eq(pools.source, 'external'), lt(pools.updatedAt, runStart)));
  }
  console.log(`✅ ${all.length} pools persistidas no Neon.\n`);

  // RANKING — CEGO À ORIGEM: risco, depois rendimento anualizado (base 15d). `source` NÃO interfere.
  const netOf = (p: EnrichedPool) => p.netAnnual15d ?? p.apyBase ?? 0;
  const ranked = [...all].sort((a, b) => b.riskScore - a.riskScore || netOf(b) - netOf(a));

  console.log('=== TOP 15 (risco + "rendeu X% em 15 dias" · cego à origem) ===\n');
  for (const p of ranked.slice(0, 15)) {
    const ret =
      p.return15d != null
        ? `rendeu ${p.return15d >= 0 ? '+' : ''}${p.return15d.toFixed(2)}% em 15d (≈${(p.netAnnual15d ?? 0).toFixed(0)}%/ano)`
        : p.apyBase != null
          ? `APY ${p.apyBase.toFixed(1)}% (reportado)`
          : '—';
    const sym = p.symbol.slice(0, 15).padEnd(15);
    const proj = p.project.slice(0, 12).padEnd(12);
    const tvl = `$${Math.round(p.tvlUsd ?? 0).toLocaleString('en-US')}`.padStart(13);
    console.log(`risco ${String(p.riskScore).padStart(3)} | ${sym} | ${proj} | TVL ${tvl} | ${ret}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
