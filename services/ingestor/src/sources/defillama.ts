import type { NormalizedPool } from '../types.js';

const DEFILLAMA_POOLS = 'https://yields.llama.fi/pools';

interface LlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyReward: number | null;
  apy: number | null;
  volumeUsd1d?: number | null;
  sigma?: number | null; // volatilidade do APY (proxy de estabilidade)
  ilRisk?: string; // 'yes' | 'no'
  exposure?: string;
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

  return base.map((p) => {
    const project = p.project.toLowerCase();
    // sigma menor = APY mais estável; mapeia p/ 0..1 (proxy de estabilidade de TVL/retorno)
    const tvlStability = p.sigma != null ? Math.max(0, Math.min(1, 1 - p.sigma)) : 0.6;
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
      feeTier: null, // DefiLlama não dá o tier; sem recalcular fee-APR (usa apyBase reportado)
      contractAgeDays: 365, // proxy: pools listadas no DefiLlama tendem a ser estabelecidas (TODO: idade real)
      audited: AUDITED.some((a) => project.includes(a)),
      tvlStability,
      liquidityUsd: p.tvlUsd,
      trustScore: undefined,
      sellable: true,
      raw: p,
    };
  });
}
