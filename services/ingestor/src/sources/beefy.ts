import type { NormalizedPool } from '../types.js';

// Vaults GERENCIADOS da Beefy (CLM = range gerenciado). Rota B: o vault cuida do range + auto-compound.
// Leitura CORRETA: APY na chave `<id>-vault` (a base é 0); liquidez = TVL do POOL subjacente (DefiLlama), não o wrapper.
const COW_VAULTS = 'https://api.beefy.finance/cow-vaults';
const APY_URL = 'https://api.beefy.finance/apy';
const DEFILLAMA_POOLS = 'https://yields.llama.fi/pools';
const WINDOW_DAYS = 15;
const MIN_POOL_TVL = 300_000;
const MAX_APY = 150; // corta APY reward-inflado não-crível (ex.: WETH/MORPHO 206%)

// Curadoria (decisão Humberto): estável + blue-chip + major (AERO/VELO/WELL...). Fora: micro/meme.
const STABLE = new Set(['USDC', 'USDT', 'DAI', 'EURC', 'USDBC', 'GHO', 'USDS', 'SUSDS', 'CRVUSD', 'USD+', 'EUSD']);
const BLUE = new Set([...STABLE, 'WETH', 'ETH', 'CBETH', 'WSTETH', 'EZETH', 'WEETH', 'RETH', 'SUPEROETHB', 'CBBTC', 'WBTC', 'TBTC', 'LBTC']);
const MAJOR = new Set([...BLUE, 'AERO', 'VELO', 'WELL', 'MORPHO', 'VIRTUAL', 'BRETT', 'DEGEN', 'EURA', 'RDNT']);
const CL_PROJECTS = new Set(['aerodrome-slipstream', 'pancakeswap-amm-v3', 'uniswap-v3', 'velodrome-slipstream']);

function riskTier(assets: string[]): 'estavel' | 'blue-chip' | 'major' {
  const A = assets.map((a) => a.toUpperCase());
  if (A.every((a) => STABLE.has(a))) return 'estavel';
  if (A.every((a) => BLUE.has(a))) return 'blue-chip';
  return 'major';
}
const assetSet = (s: string) => new Set(s.replace(/\//g, '-').split('-').map((x) => x.toUpperCase()).filter(Boolean));
const sameAssets = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

interface CowVault {
  id: string;
  chain?: string;
  status?: string;
  assets?: string[];
  earnContractAddress?: string;
  platformId?: string;
}
interface LlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase?: number | null;
  underlyingTokens?: string[] | null;
}

/** Vaults Beefy-CLM da Base, curados (estável/blue-chip/major), com pool líquido → pools GERENCIADAS de 1ª classe. */
export async function fetchBeefyManagedPools(limit = 50): Promise<NormalizedPool[]> {
  const [cow, apy, llamaRaw] = await Promise.all([
    fetch(COW_VAULTS).then((r) => r.json() as Promise<CowVault[]>),
    fetch(APY_URL).then((r) => r.json() as Promise<Record<string, number>>),
    fetch(DEFILLAMA_POOLS).then((r) => r.json() as Promise<{ data: LlamaPool[] }>),
  ]);

  // índice DefiLlama: pools CL da Base por conjunto de ativos → o de maior TVL (a liquidez real)
  const llamaIdx = new Map<string, LlamaPool>();
  for (const p of llamaRaw.data) {
    if (p.chain !== 'Base' || !p.tvlUsd || !CL_PROJECTS.has(p.project)) continue;
    const key = [...assetSet(p.symbol)].sort().join('-');
    const cur = llamaIdx.get(key);
    if (!cur || p.tvlUsd > cur.tvlUsd) llamaIdx.set(key, p);
  }

  // APY do vault: tenta as variantes -vault / -rp / base (a base costuma ser 0)
  const vaultApy = (id: string): number => {
    for (const suf of ['-vault', '-rp', '']) {
      const a = apy[id + suf];
      if (a) return a * 100;
    }
    return 0;
  };

  const cand = cow.filter(
    (v) =>
      v.chain === 'base' &&
      v.status === 'active' &&
      !!v.earnContractAddress &&
      (v.assets?.length ?? 0) >= 1 &&
      (v.assets ?? []).every((a) => MAJOR.has(a.toUpperCase())),
  );

  // dedup por conjunto de ativos (fica o de maior TVL de pool)
  const best = new Map<string, NormalizedPool>();
  for (const v of cand) {
    const assets = v.assets ?? [];
    const apyPct = vaultApy(v.id);
    if (!(apyPct > 0 && apyPct < MAX_APY)) continue;
    const key = [...new Set(assets.map((a) => a.toUpperCase()))].sort().join('-');
    const pool = [...llamaIdx.values()].find((p) => sameAssets(assetSet(p.symbol), new Set(assets.map((a) => a.toUpperCase()))));
    if (!pool || pool.tvlUsd < MIN_POOL_TVL) continue;

    const tier = riskTier(assets);
    const ret15 = (apyPct * WINDOW_DAYS) / 365; // equivalente da janela (rotulado "gerenciado" na UI)
    const np: NormalizedPool = {
      poolKey: `beefy:${v.id}`,
      source: 'external',
      provenance: 'beefy',
      chain: 'Base',
      project: 'beefy-clm',
      symbol: assets.join('/'),
      tvlUsd: pool.tvlUsd, // TVL do POOL subjacente (liquidez real), não o wrapper
      apyBase: apyPct,
      apyReward: null,
      volumeUsd24h: null,
      feeTier: null,
      feeReturn15d: ret15,
      rewardReturn15d: 0,
      rewardSymbol: null,
      rewardIntegrity: null,
      ilPct15d: 0, // o vault gerencia o range → IL é responsabilidade do gestor
      volLow: null,
      volHigh: null,
      windowDays: WINDOW_DAYS,
      exposure: 'multi',
      ilRisk: tier === 'estavel' ? 'no' : 'yes',
      contractAgeDays: 365,
      audited: true, // Beefy = protocolo conhecido/consolidado
      tvlStability: tier === 'major' ? 0.45 : 0.7,
      liquidityUsd: pool.tvlUsd,
      trustScore: undefined,
      sellable: true,
      raw: {
        managed: true,
        manager: 'Beefy',
        managerFeePct: 9.5,
        vaultAddress: v.earnContractAddress,
        beefyId: v.id,
        platformId: v.platformId,
        riskTier: tier,
        beefyApy: apyPct,
        underlyingTokens: pool.underlyingTokens ?? [],
        assets,
      },
    };
    const cur = best.get(key);
    if (!cur || (cur.tvlUsd ?? 0) < pool.tvlUsd) best.set(key, np);
  }

  return [...best.values()].sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0)).slice(0, limit);
}
