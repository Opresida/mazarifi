/** Config de chain do lado do app (carteira/explorer/USDC). Espelha o packages/chain. */
export interface AppChain {
  name: string; // 'Base' | 'Arbitrum' (igual ao pool.chain)
  chainId: number;
  chainIdHex: string;
  chainName: string; // nome pra adicionar a rede na carteira
  usdc: string;
  rpc: string;
  explorer: string;
  explorerName: string;
}

export const CHAINS: Record<string, AppChain> = {
  Base: {
    name: 'Base', chainId: 8453, chainIdHex: '0x2105', chainName: 'Base',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org', explorerName: 'BaseScan',
  },
  Arbitrum: {
    name: 'Arbitrum', chainId: 42161, chainIdHex: '0xa4b1', chainName: 'Arbitrum One',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    rpc: 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io', explorerName: 'Arbiscan',
  },
};

/** Resolve a config da chain pelo nome (pool.chain); fallback Base. */
export const chainCfg = (name: string | null | undefined): AppChain => CHAINS[name ?? 'Base'] ?? CHAINS.Base;
