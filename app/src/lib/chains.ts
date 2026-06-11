/** Config de chain do lado do app (carteira/explorer). Inclui DESTINO (pools) + ORIGEM (de onde traz o dinheiro). */
export interface AppChain {
  name: string;
  chainId: number;
  chainIdHex: string;
  chainName: string; // nome pra adicionar a rede na carteira
  rpc: string;
  explorer: string;
  explorerName: string;
  nativeSymbol: string;
  usdc?: string; // USDC nativo (pool chains usam no approve do depósito same-chain)
  isPool?: boolean; // tem pools curadas (destino)?
}

export const CHAINS: Record<string, AppChain> = {
  // DESTINO (pools curadas)
  Base: { name: 'Base', chainId: 8453, chainIdHex: '0x2105', chainName: 'Base', rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org', explorerName: 'BaseScan', nativeSymbol: 'ETH', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', isPool: true },
  Arbitrum: { name: 'Arbitrum', chainId: 42161, chainIdHex: '0xa4b1', chainName: 'Arbitrum One', rpc: 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io', explorerName: 'Arbiscan', nativeSymbol: 'ETH', usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', isPool: true },
  // ORIGEM (de onde o cliente pode trazer dinheiro — a Mazari resolve)
  Ethereum: { name: 'Ethereum', chainId: 1, chainIdHex: '0x1', chainName: 'Ethereum', rpc: 'https://ethereum-rpc.publicnode.com', explorer: 'https://etherscan.io', explorerName: 'Etherscan', nativeSymbol: 'ETH' },
  Optimism: { name: 'Optimism', chainId: 10, chainIdHex: '0xa', chainName: 'OP Mainnet', rpc: 'https://optimism-rpc.publicnode.com', explorer: 'https://optimistic.etherscan.io', explorerName: 'Etherscan', nativeSymbol: 'ETH' },
  Polygon: { name: 'Polygon', chainId: 137, chainIdHex: '0x89', chainName: 'Polygon', rpc: 'https://polygon-bor-rpc.publicnode.com', explorer: 'https://polygonscan.com', explorerName: 'PolygonScan', nativeSymbol: 'POL' },
  'BNB Chain': { name: 'BNB Chain', chainId: 56, chainIdHex: '0x38', chainName: 'BNB Smart Chain', rpc: 'https://bsc-rpc.publicnode.com', explorer: 'https://bscscan.com', explorerName: 'BscScan', nativeSymbol: 'BNB' },
  Avalanche: { name: 'Avalanche', chainId: 43114, chainIdHex: '0xa86a', chainName: 'Avalanche C-Chain', rpc: 'https://avalanche-c-chain-rpc.publicnode.com', explorer: 'https://snowtrace.io', explorerName: 'SnowTrace', nativeSymbol: 'AVAX' },
};

/** Resolve a config da chain pelo nome; fallback Base. */
export const chainCfg = (name: string | null | undefined): AppChain => CHAINS[name ?? 'Base'] ?? CHAINS.Base;

/** Endereço-sentinela do ativo nativo (ETH/BNB/MATIC/AVAX). */
export const NATIVE = '0x0000000000000000000000000000000000000000';
