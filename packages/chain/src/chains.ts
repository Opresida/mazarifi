import { createPublicClient, http, type PublicClient, type Chain } from 'viem';
import { base, arbitrum } from 'viem/chains';

/** Config por chain — a fonte da verdade do multi-chain. Adicionar chain = só pôr aqui. */
export interface ChainCfg {
  name: string; // chain do DefiLlama ('Base', 'Arbitrum')
  beefyChain: string; // chain das cow-vaults da Beefy ('base', 'arbitrum')
  coinsPrefix: string; // prefixo do coins.llama.fi ('base', 'arbitrum')
  chainId: number; // 8453, 42161
  chainIdHex: string; // '0x2105', '0xa4b1'
  usdc: string; // USDC nativo da chain
  rpc: string; // RPC público (env override)
  explorer: string; // 'https://basescan.org'
  explorerName: string; // 'BaseScan'
  viem: Chain;
}

export const CHAINS: Record<string, ChainCfg> = {
  Base: {
    name: 'Base', beefyChain: 'base', coinsPrefix: 'base',
    chainId: 8453, chainIdHex: '0x2105',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    rpc: process.env.BASE_RPC || 'https://mainnet.base.org',
    explorer: 'https://basescan.org', explorerName: 'BaseScan',
    viem: base,
  },
  Arbitrum: {
    name: 'Arbitrum', beefyChain: 'arbitrum', coinsPrefix: 'arbitrum',
    chainId: 42161, chainIdHex: '0xa4b1',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    rpc: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io', explorerName: 'Arbiscan',
    viem: arbitrum,
  },
};

export const CHAIN_LIST = Object.values(CHAINS);

const clients = new Map<string, PublicClient>();
/** Cliente viem read-only da chain (cache). null se não suportada. */
export function clientFor(chainName: string): PublicClient | null {
  const cfg = CHAINS[chainName];
  if (!cfg) return null;
  if (!clients.has(chainName)) {
    clients.set(chainName, createPublicClient({ chain: cfg.viem, transport: http(cfg.rpc) }) as PublicClient);
  }
  return clients.get(chainName) ?? null;
}

/** Preço do gás AGORA (wei) na chain. Grátis (RPC público). */
export async function getGasPriceWei(chainName: string): Promise<bigint> {
  const c = clientFor(chainName);
  if (!c) throw new Error(`chain não suportada: ${chainName}`);
  return c.getGasPrice();
}
