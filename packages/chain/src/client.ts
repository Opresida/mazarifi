import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';

/** Cliente público (read-only) na Base Sepolia. RPC via env opcional. */
export const CHAIN = baseSepolia;
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(process.env.BASE_SEPOLIA_RPC || undefined),
});

/** Cliente público na Base MAINNET — usado só pra ler o preço do gás da rede (grátis, RPC público). */
export const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC || 'https://mainnet.base.org'),
});

/** Preço do gás AGORA na Base mainnet (em wei). Grátis. */
export async function getBaseGasPriceWei(): Promise<bigint> {
  return baseClient.getGasPrice();
}
