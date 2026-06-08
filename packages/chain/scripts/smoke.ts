/** Smoke de integração (read-only): a Mazari Fi lendo uma pool Nortoken v4 REAL,
 *  semeada por contracts/script/SeedV4Pools.s.sol. Prova preço + volume + posição. */
import type { Address } from 'viem';
import { publicClient, getPoolPrice, getSwapStats, getLockPosition, poolIdFor } from '../src/index.js';

const ALPHA = '0x3982AFb26d3b29C51BDE3986712f25494727AB05' as Address; // Mazari Pool Alpha (lockId 0)

const pid = poolIdFor(ALPHA); // hook v4 (default)
console.log('poolId:', pid);

const price = await getPoolPrice(ALPHA);
console.log('preço (tokens por ETH):', price, price != null ? '✅' : '❌ sem preço');

const bn = await publicClient.getBlockNumber();
const stats = await getSwapStats(pid, bn - 1000n, 'latest');
console.log(
  'swaps:', stats.swapCount,
  '| protocolFee (wei):', stats.protocolFeeWei.toString(),
  '| volume âncora (wei):', stats.anchorVolumeWei.toString(),
  stats.swapCount > 0 ? '✅' : '❌ sem swaps no range',
);

const pos = await getLockPosition(0n); // lockId 0
console.log('lock — principal:', pos.principalLiquidity.toString(), '| keeper:', pos.keeper, '| active:', pos.active);
