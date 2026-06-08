import { keccak256, encodeAbiParameters, type Address, type Hex } from 'viem';
import { publicClient } from './client';
import { BASE_SEPOLIA, ZERO_ADDRESS } from './deployments';
import { STATE_VIEW_ABI } from './abis';

export const POOL_FEE = 3000;
export const TICK_SPACING = 60;

export interface PoolKeyStruct {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

const POOL_KEY_TUPLE = [
  {
    type: 'tuple',
    components: [
      { name: 'currency0', type: 'address' },
      { name: 'currency1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickSpacing', type: 'int24' },
      { name: 'hooks', type: 'address' },
    ],
  },
] as const;

/** PoolKey do par token/ETH (ETH `0x0` é currency0). `hook` default = trio v4. */
export function poolKeyFor(token: Address, hook: Address = BASE_SEPOLIA.hook): PoolKeyStruct {
  return { currency0: ZERO_ADDRESS, currency1: token, fee: POOL_FEE, tickSpacing: TICK_SPACING, hooks: hook };
}

/** PoolId = keccak256(abi.encode(PoolKey)). */
export function poolIdFor(token: Address, hook?: Address): Hex {
  return keccak256(encodeAbiParameters(POOL_KEY_TUPLE, [poolKeyFor(token, hook)]));
}

/** Preço em tokens por 1 ETH a partir do sqrtPriceX96 (ambos 18 casas). Função PURA. */
export function priceFromSqrtX96(sqrtPriceX96: bigint): number {
  const r = Number(sqrtPriceX96) / 2 ** 96;
  return r * r; // (sqrtP/2^96)^2 = currency1/currency0 = tokens por ETH
}

/** Lê o preço real da pool (StateView.getSlot0). null se a pool não existe / sem preço. */
export async function getPoolPrice(token: Address, hook?: Address): Promise<number | null> {
  try {
    const res = (await publicClient.readContract({
      address: BASE_SEPOLIA.stateView,
      abi: STATE_VIEW_ABI,
      functionName: 'getSlot0',
      args: [poolIdFor(token, hook)],
    })) as readonly [bigint, number, number, number];
    if (res[0] === 0n) return null;
    return priceFromSqrtX96(res[0]);
  } catch (e) {
    if (process.env.MAZARI_DEBUG) console.error('getPoolPrice err:', (e as Error).message);
    return null;
  }
}
