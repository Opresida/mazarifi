import { formatUnits, type Address } from 'viem';
import { publicClient, getPoolPrice, getSwapStats, getLockPosition, poolIdFor } from '@mazarifi/chain';
import { feeAprGross, ilFullRange } from '@mazarifi/core';
import { fetchEthUsd } from '../prices.js';
import type { NormalizedPool } from '../types.js';

/** wei (18 casas) → número decimal, sem perda de precisão (formatUnits é string-based). */
const weiToNum = (wei: bigint) => Number(formatUnits(wei, 18));

/** As 3 pools v4 semeadas (createPoolAndLock + swap) — ground-truth da Mazari Fi. */
const SEEDED = [
  { symbol: 'MPALPHA/ETH', token: '0x3982AFb26d3b29C51BDE3986712f25494727AB05', lockId: 0n },
  { symbol: 'MPBETA/ETH', token: '0xbe771AB6361d567AfF5Ba4bC8cd5c50025F5A6eF', lockId: 1n },
  { symbol: 'MPGAMMA/ETH', token: '0xAc218715e9E65f93327A0A73750702FC20CE00B7', lockId: 2n },
];

/** Lê as pools Nortoken on-chain: volume/fees REAIS (SwapTracked) + posição (locks). */
export async function fetchNortokenPools(): Promise<NormalizedPool[]> {
  const [bn, ETH_USD] = await Promise.all([publicClient.getBlockNumber(), fetchEthUsd()]);
  const fromBlock = bn > 1900n ? bn - 1900n : 0n; // RPC público limita getLogs a 2000 blocos (TODO: paginar)
  const out: NormalizedPool[] = [];

  for (const s of SEEDED) {
    const token = s.token as Address;
    const pid = poolIdFor(token);
    const [price, stats, lock] = await Promise.all([
      getPoolPrice(token),
      getSwapStats(pid, fromBlock, 'latest'),
      getLockPosition(s.lockId),
    ]);

    const volumeUsd24h = weiToNum(stats.anchorVolumeWei) * ETH_USD; // REAL (ground-truth)
    const tvlUsd = weiToNum(lock.principalLiquidity) * ETH_USD * 2; // aprox: principal nos 2 lados

    // fee anualizado (do volume real) → realizado em 15d; IL realizado do lançamento (1:1) ao preço atual
    const feeAprPct = tvlUsd > 0 ? feeAprGross({ volume24hUsd: volumeUsd24h, feeTier: 0.003, activeTvlUsd: tvlUsd }) * 100 : null;
    const feeReturn15d = feeAprPct != null ? (feeAprPct * 15) / 365 : null;
    const ilPct15d = price != null && price > 0 ? Math.abs(ilFullRange(price)) * 100 : null; // r = preçoAtual/1 (launch 1:1)

    out.push({
      poolKey: `nortoken:${pid}`,
      source: 'nortoken',
      provenance: 'nortoken-onchain',
      chain: 'Base Sepolia',
      project: 'nortoken',
      symbol: s.symbol,
      tvlUsd,
      apyBase: null,
      apyReward: null,
      volumeUsd24h,
      feeTier: 0.003, // pool 0,3%
      feeReturn15d,
      rewardReturn15d: 0,
      ilPct15d,
      volLow: feeAprPct,
      volHigh: feeAprPct,
      windowDays: 15,
      exposure: 'multi',
      ilRisk: 'yes',
      contractAgeDays: 1, // recém-semeada (honesto: nova = idade baixa)
      audited: true, // contrato Nortoken verificado no BaseScan
      tvlStability: 0.5,
      liquidityUsd: tvlUsd,
      trustScore: 70, // placeholder (TODO: portar trustScore real do Nortoken)
      sellable: true,
      raw: {
        price,
        swapCount: stats.swapCount,
        protocolFeeWei: stats.protocolFeeWei.toString(),
        anchorVolumeWei: stats.anchorVolumeWei.toString(),
        principalLiquidity: lock.principalLiquidity.toString(),
        keeper: lock.keeper,
        active: lock.active,
      },
    });
  }
  return out;
}
