import type { Address } from 'viem';
import { publicClient } from './client';
import { BASE_SEPOLIA } from './deployments';
import { LOCK_ABI } from './abis';

export interface LockPosition {
  projectOwner: Address;
  principalLiquidity: bigint; // piso inviolável (anti-rug)
  tickLower: number;
  tickUpper: number;
  minTick: number; // bounds que o keeper (Mazari Fi) pode usar
  maxTick: number;
  unlockTime: bigint;
  keeper: Address;
  active: boolean;
}

/** Lê a posição travada (principal/range/keeper) — base do painel "minhas posições" + Fase 2. */
export async function getLockPosition(lockId: bigint): Promise<LockPosition> {
  const r = (await publicClient.readContract({
    address: BASE_SEPOLIA.lock,
    abi: LOCK_ABI,
    functionName: 'locks',
    args: [lockId],
  })) as readonly [unknown, Address, bigint, number, number, number, number, bigint, Address, boolean];
  // r[0] = PoolKey (key), ignorado aqui; posição começa em r[1].
  return {
    projectOwner: r[1],
    principalLiquidity: r[2],
    tickLower: r[3],
    tickUpper: r[4],
    minTick: r[5],
    maxTick: r[6],
    unlockTime: r[7],
    keeper: r[8],
    active: r[9],
  };
}
