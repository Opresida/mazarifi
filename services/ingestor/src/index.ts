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
      feeAprHonest: p.feeAprHonest,
      feeApyHonest: p.feeApyHonest,
      netUsd: p.netUsd,
      raw: p.raw as object,
      updatedAt: new Date(),
    };
    await db
      .insert(pools)
      .values(row)
      .onConflictDoUpdate({
        target: pools.poolKey,
        set: {
          tvlUsd: row.tvlUsd,
          apyBase: row.apyBase,
          apyReward: row.apyReward,
          volumeUsd24h: row.volumeUsd24h,
          riskScore: row.riskScore,
          feeAprHonest: row.feeAprHonest,
          feeApyHonest: row.feeApyHonest,
          netUsd: row.netUsd,
          raw: row.raw,
          updatedAt: row.updatedAt,
        },
      });
  }
  console.log(`✅ ${all.length} pools persistidas no Neon.\n`);

  // RANKING honesto — CEGO À ORIGEM: ordena por risco, depois APY. `source` NÃO interfere.
  const apyOf = (p: EnrichedPool) => p.feeAprHonest ?? p.apyBase ?? 0;
  const ranked = [...all].sort((a, b) => b.riskScore - a.riskScore || apyOf(b) - apyOf(a));

  console.log('=== TOP 15 (risco + rendimento · cego à origem) ===');
  console.log('APR = simples · APY = composto diário · (recalc) = nós calculamos / (defillama) = reportado\n');
  for (const p of ranked.slice(0, 15)) {
    const yield_ =
      p.feeAprHonest != null
        ? `APR ${p.feeAprHonest.toFixed(1)}% / APY ${(p.feeApyHonest ?? 0).toFixed(1)}% (recalc)`
        : p.apyBase != null
          ? `APY ${p.apyBase.toFixed(1)}% (defillama)`
          : '—';
    const sym = p.symbol.slice(0, 18).padEnd(18);
    const proj = p.project.slice(0, 13).padEnd(13);
    const tvl = `$${Math.round(p.tvlUsd ?? 0).toLocaleString('en-US')}`.padStart(13);
    console.log(`risco ${String(p.riskScore).padStart(3)} | ${sym} | ${proj} | TVL ${tvl} | ${yield_}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
