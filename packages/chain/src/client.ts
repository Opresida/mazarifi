import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

/** Cliente público (read-only) na Base Sepolia. RPC via env opcional. */
export const CHAIN = baseSepolia;
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(process.env.BASE_SEPOLIA_RPC || undefined),
});
