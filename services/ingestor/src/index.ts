import 'dotenv/config';
import { and, eq, lt, sql } from 'drizzle-orm';
import { getGasPriceWei, CHAIN_LIST } from '@mazarifi/chain';
import { gasCostUsd, OP_GAS } from '@mazarifi/core';
import { db } from './db/client.js';
import { pools, network } from './db/schema.js';
import { fetchBasePools } from './sources/defillama.js';
import { fetchNortokenPools } from './sources/nortoken.js';
import { fetchBeefyManagedPools } from './sources/beefy.js';
import { fetchEthUsd } from './prices.js';
import { enrich, type EnrichedPool } from './enrich.js';

async function main() {
  console.log('🔎 Ingestor Mazari Fi — puxando pools REAIS...\n');
  const runStart = new Date();

  const [external, nortoken, beefy] = await Promise.all([
    fetchBasePools(40).catch((e) => {
      console.error('DefiLlama falhou:', e.message);
      return [];
    }),
    fetchNortokenPools().catch((e) => {
      console.error('Nortoken falhou:', e.message);
      return [];
    }),
    fetchBeefyManagedPools(50).catch((e) => {
      console.error('Beefy falhou:', e.message);
      return [];
    }),
  ]);

  const all: EnrichedPool[] = [...external, ...nortoken, ...beefy].map(enrich);
  console.log(`Pools: ${external.length} DefiLlama + ${nortoken.length} Nortoken + ${beefy.length} Beefy gerenciadas = ${all.length}\n`);

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
      rewardSymbol: p.rewardSymbol,
      rewardIntegrity: p.rewardIntegrity as object | null,
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
  // Remove obsoletas (não atualizadas nesta rodada) — mas COM TRAVA DE SEGURANÇA por fonte:
  // a limpeza de cada CATEGORIA só roda se a fonte dela veio OK nesta rodada. Assim, um soluço de
  // UMA fonte (ex.: Beefy 403) NUNCA zera a categoria inteira — mantém o dado bom anterior.
  const isManaged = sql`${pools.raw}->>'managed' = 'true'`;
  if (external.length > 0) {
    // empréstimo/troca (DefiLlama) — só se o DefiLlama veio
    await db.delete(pools).where(and(eq(pools.source, 'external'), sql`(${pools.raw}->>'managed') IS DISTINCT FROM 'true'`, lt(pools.updatedAt, runStart)));
  } else {
    console.warn('⚠️  DefiLlama veio vazio — NÃO limpei as pools de empréstimo/troca (mantive as anteriores).');
  }
  if (beefy.length > 0) {
    // gerenciadas (Beefy) — só se a Beefy veio
    await db.delete(pools).where(and(eq(pools.source, 'external'), isManaged, lt(pools.updatedAt, runStart)));
  } else {
    console.warn('⚠️  Beefy veio vazia — NÃO limpei as gerenciadas (mantive as anteriores).');
  }
  console.log(`✅ ${all.length} pools persistidas no Neon.\n`);

  // Gás de rede AO VIVO POR CHAIN (grátis, RPC público) → custo de gás por tipo de operação.
  try {
    const ethUsd = await fetchEthUsd(); // Base e Arbitrum usam ETH no gás
    for (const cfg of CHAIN_LIST) {
      try {
        const gasPriceWei = await getGasPriceWei(cfg.name);
        const gasRow = {
          chain: cfg.name,
          gasPriceGwei: Number(gasPriceWei) / 1e9,
          ethUsd,
          gasLendingUsd: gasCostUsd({ gasUnits: OP_GAS.emprestimo, gasPriceWei, ethUsd }),
          gasTradeUsd: gasCostUsd({ gasUnits: OP_GAS.troca, gasPriceWei, ethUsd }),
          gasConcentratedUsd: gasCostUsd({ gasUnits: OP_GAS.concentrada, gasPriceWei, ethUsd }),
          updatedAt: new Date(),
        };
        const { chain: _c, ...gasUpd } = gasRow;
        await db.insert(network).values(gasRow).onConflictDoUpdate({ target: network.chain, set: gasUpd });
        console.log(`⛽ ${cfg.name} ${gasRow.gasPriceGwei.toFixed(4)} gwei → empréstimo $${gasRow.gasLendingUsd.toFixed(3)} · troca $${gasRow.gasTradeUsd.toFixed(3)} · concentrada $${gasRow.gasConcentratedUsd.toFixed(3)}`);
      } catch (e) {
        console.error(`gás ${cfg.name} falhou:`, (e as Error).message);
      }
    }
  } catch (e) {
    console.error('preço ETH falhou:', (e as Error).message);
  }

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
