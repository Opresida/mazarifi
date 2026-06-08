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
  })) as readonly [Address, bigint, number, number, number, number, bigint, Address, boolean];
  return {
    projectOwner: r[0],
    principalLiquidity: r[1],
    tickLower: r[2],
    tickUpper: r[3],
    minTick: r[4],
    maxTick: r[5],
    unlockTime: r[6],
    keeper: r[7],
    active: r[8],
  };
}
