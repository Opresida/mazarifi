import { CHAIN_LIST } from '@mazarifi/chain';
import type { NormalizedPool } from '../types.js';

const DEFILLAMA_CHART = 'https://yields.llama.fi/chart/';
// Beefy usa o chain em minúsculo ('base'/'arbitrum'); mapeia pro cfg (que tem o nome DefiLlama).
const BEEFY_CHAIN = new Map(CHAIN_LIST.map((c) => [c.beefyChain, c]));

/** NOSSA matemática pro VAULT: soma o `apy` (total) realizado dia a dia nos últimos 15d (nos vaults Beefy o yield
 *  está em `apy`, não em `apyBase`). É o rendimento real do vault, já líquido da taxa do gestor (DefiLlama rastreia). */
async function fetchVaultReturn15d(poolId: string): Promise<{ ret: number; volLow: number; volHigh: number } | null> {
  try {
    const r = await fetch(`${DEFILLAMA_CHART}${poolId}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: Array<{ apy?: number | null }> };
    const data = (j.data ?? []).slice(-15);
    if (data.length === 0) return null;
    let ret = 0;
    const apys: number[] = [];
    for (const d of data) {
      const a = d.apy ?? 0;
      ret += a / 365;
      apys.push(a);
    }
    return { ret, volLow: Math.min(...apys), volHigh: Math.max(...apys) };
  } catch {
    return null;
  }
}

// Vaults GERENCIADOS da Beefy (CLM = range gerenciado). Rota B: o vault cuida do range + auto-compound.
// REGRA GLOBAL: o número é a NOSSA matemática (somar o apyBase realizado do VAULT, via DefiLlama) — igual às diretas.
// NÃO usamos o APY que a Beefy reporta como número; só pra sanidade. Só entra vault que o DefiLlama rastreia.
const COW_VAULTS = 'https://api.beefy.finance/cow-vaults';
const APY_URL = 'https://api.beefy.finance/apy';
const DEFILLAMA_POOLS = 'https://yields.llama.fi/pools';
const WINDOW_DAYS = 15;
const MIN_TVL = 100_000; // TVL do VAULT no DefiLlama (adoção real, não o pool cru)
const MAX_APY = 150;

// Curadoria (decisão Humberto): estável + blue-chip + major (AERO/VELO/WELL...). Fora: micro/meme.
const STABLE = new Set(['USDC', 'USDT', 'DAI', 'EURC', 'USDBC', 'GHO', 'USDS', 'SUSDS', 'CRVUSD', 'USD+', 'EUSD']);
const BLUE = new Set([...STABLE, 'WETH', 'ETH', 'CBETH', 'WSTETH', 'EZETH', 'WEETH', 'RETH', 'SUPEROETHB', 'CBBTC', 'WBTC', 'TBTC', 'LBTC']);
const MAJOR = new Set([...BLUE, 'AERO', 'VELO', 'WELL', 'MORPHO', 'VIRTUAL', 'BRETT', 'DEGEN', 'EURA', 'RDNT', 'ARB', 'GMX', 'PENDLE', 'GRAIL', 'OP']);

function riskTier(assets: string[]): 'estavel' | 'blue-chip' | 'major' {
  const A = assets.map((a) => a.toUpperCase());
  if (A.every((a) => STABLE.has(a))) return 'estavel';
  if (A.every((a) => BLUE.has(a))) return 'blue-chip';
  return 'major';
}
const assetKey = (syms: string[]) => [...new Set(syms.map((x) => x.toUpperCase()))].sort().join('-');

interface CowVault {
  id: string;
  chain?: string;
  status?: string;
  assets?: string[];
  earnContractAddress?: string;
  platformId?: string;
  risks?: Record<string, boolean | number>; // flags do Risk Checklist da Beefy
}
interface LlamaBeefy {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  underlyingTokens?: string[] | null;
  il7d?: number | null;
  volumeUsd1d?: number | null;
}

// Pools de CL subjacentes (o vault Beefy NÃO reporta volume; o pool de baixo sim).
const CL_PROJECTS = new Set(['aerodrome-slipstream', 'pancakeswap-amm-v3', 'uniswap-v3', 'velodrome-slipstream']);

/** Vaults Beefy-CLM da Base, curados, com a NOSSA matemática no rendimento real do vault (DefiLlama). */
export async function fetchBeefyManagedPools(limit = 50): Promise<NormalizedPool[]> {
  const [cow, apy, llama] = await Promise.all([
    fetch(COW_VAULTS).then((r) => r.json() as Promise<CowVault[]>),
    fetch(APY_URL).then((r) => r.json() as Promise<Record<string, number>>),
    fetch(DEFILLAMA_POOLS).then((r) => r.json() as Promise<{ data: LlamaBeefy[] }>),
  ]);

  // Índices POR CHAIN: VAULTS Beefy no DefiLlama (project='beefy') + pools de CL subjacentes (volume 24h).
  // Chave = `${chainDefiLlama}:${assetKey}`.
  const supported = new Set(CHAIN_LIST.map((c) => c.name));
  const beefyIdx = new Map<string, LlamaBeefy>();
  const clIdx = new Map<string, LlamaBeefy>();
  for (const p of llama.data) {
    if (!supported.has(p.chain) || !p.tvlUsd) continue;
    const k = `${p.chain}:${assetKey(p.symbol.replace(/\//g, '-').split('-'))}`;
    if (p.project === 'beefy') {
      const cur = beefyIdx.get(k);
      if (!cur || p.tvlUsd > cur.tvlUsd) beefyIdx.set(k, p);
    } else if (CL_PROJECTS.has(p.project) && p.volumeUsd1d != null) {
      const cur = clIdx.get(k);
      if (!cur || p.tvlUsd > cur.tvlUsd) clIdx.set(k, p);
    }
  }

  const vaultApy = (id: string): number => {
    for (const suf of ['-vault', '-rp', '']) if (apy[id + suf]) return apy[id + suf] * 100;
    return 0;
  };

  // Candidatos: CLM ativos, curados, de chain suportada, com vault casado no DefiLlama (≥ TVL mín).
  type Cand = { v: CowVault; dl: LlamaBeefy; apyRef: number; key: string; chain: string };
  const cands: Cand[] = [];
  for (const v of cow) {
    const cfg = BEEFY_CHAIN.get(v.chain ?? '');
    if (!cfg || v.status !== 'active' || !v.earnContractAddress) continue;
    const assets = v.assets ?? [];
    if (assets.length < 1 || !assets.every((a) => MAJOR.has(a.toUpperCase()))) continue;
    const apyRef = vaultApy(v.id);
    if (!(apyRef > 0 && apyRef < MAX_APY)) continue; // sanidade: vault existe/ativo
    const key = `${cfg.name}:${assetKey(assets)}`;
    const dl = beefyIdx.get(key);
    if (!dl || dl.tvlUsd < MIN_TVL) continue; // precisa do vault no DefiLlama (nossa matemática) + adoção real
    cands.push({ v, dl, apyRef, key, chain: cfg.name });
  }

  // NOSSA matemática: 15d realizado do `apy` (total) do VAULT (DefiLlama), em paralelo.
  const realizedList = await Promise.all(cands.map((c) => fetchVaultReturn15d(c.dl.pool).catch(() => null)));

  const best = new Map<string, NormalizedPool>();
  cands.forEach((c, i) => {
    const realized = realizedList[i];
    if (!realized) return; // sem dado pra nossa conta → não entra (regra global)
    const assets = c.v.assets ?? [];
    const tier = riskTier(assets);
    const np: NormalizedPool = {
      poolKey: `beefy:${c.v.id}`,
      source: 'external',
      provenance: 'beefy',
      chain: c.chain,
      project: 'beefy-clm',
      symbol: assets.join('/'),
      tvlUsd: c.dl.tvlUsd,
      apyBase: c.apyRef, // referência (Beefy) — NÃO é o headline
      apyReward: null,
      volumeUsd24h: clIdx.get(c.key)?.volumeUsd1d ?? null, // volume do pool de CL subjacente
      feeTier: null,
      feeReturn15d: realized.ret, // NOSSA conta (apy total do vault somado dia a dia)
      rewardReturn15d: 0, // o `apy` já é o total líquido do vault
      rewardSymbol: null,
      rewardIntegrity: null,
      ilPct15d: 0, // o `apy` do vault já reflete a performance gerenciada (range + auto-compound)
      volLow: realized.volLow,
      volHigh: realized.volHigh,
      windowDays: WINDOW_DAYS,
      exposure: 'multi',
      ilRisk: tier === 'estavel' ? 'no' : 'yes',
      contractAgeDays: 365,
      audited: true,
      tvlStability: tier === 'major' ? 0.45 : 0.7,
      liquidityUsd: c.dl.tvlUsd,
      trustScore: undefined,
      sellable: true,
      raw: {
        managed: true,
        manager: 'Beefy',
        managerFeePct: 9.5,
        vaultAddress: c.v.earnContractAddress,
        beefyId: c.v.id,
        platformId: c.v.platformId,
        riskTier: tier,
        beefyApy: c.apyRef,
        risks: c.v.risks ?? null, // Risk Checklist (flags da Beefy)
        underlyingTokens: c.dl.underlyingTokens ?? [],
        assets,
      },
    };
    const cur = best.get(c.key);
    if (!cur || (cur.tvlUsd ?? 0) < c.dl.tvlUsd) best.set(c.key, np);
  });

  return [...best.values()].sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0)).slice(0, limit);
}
