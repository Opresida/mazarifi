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

// ───────────────────────────────────────────────────────────────────────────
// ORIGEM (de onde aceitamos dinheiro) — AMPLA. Diferente do DESTINO (CHAINS = pools, curado).
// O cliente pode ter ativo conhecido em qualquer uma dessas; a Mazari traz e investe.
// ───────────────────────────────────────────────────────────────────────────

/** Endereço-sentinela do ativo NATIVO (ETH/BNB/MATIC/AVAX) na LiFi. */
export const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';

export interface SourceChainCfg {
  name: string;
  chainId: number;
  chainIdHex: string;
  rpc: string;
  explorer: string;
  explorerName: string;
  nativeSymbol: string;
}

export const SOURCE_CHAINS: Record<string, SourceChainCfg> = {
  Ethereum: { name: 'Ethereum', chainId: 1, chainIdHex: '0x1', rpc: 'https://ethereum-rpc.publicnode.com', explorer: 'https://etherscan.io', explorerName: 'Etherscan', nativeSymbol: 'ETH' },
  Arbitrum: { name: 'Arbitrum', chainId: 42161, chainIdHex: '0xa4b1', rpc: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io', explorerName: 'Arbiscan', nativeSymbol: 'ETH' },
  Base: { name: 'Base', chainId: 8453, chainIdHex: '0x2105', rpc: process.env.BASE_RPC || 'https://mainnet.base.org', explorer: 'https://basescan.org', explorerName: 'BaseScan', nativeSymbol: 'ETH' },
  Optimism: { name: 'Optimism', chainId: 10, chainIdHex: '0xa', rpc: 'https://optimism-rpc.publicnode.com', explorer: 'https://optimistic.etherscan.io', explorerName: 'Etherscan', nativeSymbol: 'ETH' },
  Polygon: { name: 'Polygon', chainId: 137, chainIdHex: '0x89', rpc: 'https://polygon-bor-rpc.publicnode.com', explorer: 'https://polygonscan.com', explorerName: 'PolygonScan', nativeSymbol: 'POL' },
  'BNB Chain': { name: 'BNB Chain', chainId: 56, chainIdHex: '0x38', rpc: 'https://bsc-rpc.publicnode.com', explorer: 'https://bscscan.com', explorerName: 'BscScan', nativeSymbol: 'BNB' },
  Avalanche: { name: 'Avalanche', chainId: 43114, chainIdHex: '0xa86a', rpc: 'https://avalanche-c-chain-rpc.publicnode.com', explorer: 'https://snowtrace.io', explorerName: 'SnowTrace', nativeSymbol: 'AVAX' },
};

export const SOURCE_CHAIN_LIST = Object.values(SOURCE_CHAINS);
export const sourceChainById = (chainId: number): SourceChainCfg | undefined => SOURCE_CHAIN_LIST.find((c) => c.chainId === chainId);

export interface SourceToken {
  symbol: string;
  address: string; // lowercase
  decimals: number;
}

/** Allowlist de ativos CONHECIDOS/padrão por chainId (nativo + stables + WETH/WBTC). Só movemos estes (segurança). */
export const SOURCE_TOKENS: Record<number, SourceToken[]> = {
  1: [ // Ethereum
    { symbol: 'ETH', address: NATIVE_TOKEN, decimals: 18 },
    { symbol: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 },
    { symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
    { symbol: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18 },
    { symbol: 'WETH', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', decimals: 18 },
    { symbol: 'WBTC', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', decimals: 8 },
  ],
  42161: [ // Arbitrum
    { symbol: 'ETH', address: NATIVE_TOKEN, decimals: 18 },
    { symbol: 'USDC', address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', decimals: 6 },
    { symbol: 'USDT', address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', decimals: 6 },
    { symbol: 'DAI', address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', decimals: 18 },
    { symbol: 'WETH', address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', decimals: 18 },
    { symbol: 'WBTC', address: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f', decimals: 8 },
  ],
  8453: [ // Base
    { symbol: 'ETH', address: NATIVE_TOKEN, decimals: 18 },
    { symbol: 'USDC', address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', decimals: 6 },
    { symbol: 'DAI', address: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', decimals: 18 },
    { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    { symbol: 'cbBTC', address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf', decimals: 8 },
  ],
  10: [ // Optimism
    { symbol: 'ETH', address: NATIVE_TOKEN, decimals: 18 },
    { symbol: 'USDC', address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', decimals: 6 },
    { symbol: 'USDT', address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', decimals: 6 },
    { symbol: 'DAI', address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', decimals: 18 },
    { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    { symbol: 'WBTC', address: '0x68f180fcce6836688e9084f035309e29bf0a2095', decimals: 8 },
  ],
  137: [ // Polygon
    { symbol: 'POL', address: NATIVE_TOKEN, decimals: 18 },
    { symbol: 'USDC', address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', decimals: 6 },
    { symbol: 'USDT', address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', decimals: 6 },
    { symbol: 'DAI', address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', decimals: 18 },
    { symbol: 'WETH', address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', decimals: 18 },
    { symbol: 'WBTC', address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', decimals: 8 },
  ],
  56: [ // BNB Chain — ⚠ USDC/USDT são 18 casas aqui
    { symbol: 'BNB', address: NATIVE_TOKEN, decimals: 18 },
    { symbol: 'USDC', address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', decimals: 18 },
    { symbol: 'USDT', address: '0x55d398326f99059ff775485246999027b3197955', decimals: 18 },
    { symbol: 'DAI', address: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', decimals: 18 },
    { symbol: 'ETH', address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8', decimals: 18 },
    { symbol: 'BTCB', address: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', decimals: 18 },
  ],
  43114: [ // Avalanche
    { symbol: 'AVAX', address: NATIVE_TOKEN, decimals: 18 },
    { symbol: 'USDC', address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e', decimals: 6 },
    { symbol: 'USDT', address: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', decimals: 6 },
    { symbol: 'DAI', address: '0xd586e7f844cea2f87f50152665bcbc2c279d8d70', decimals: 18 },
    { symbol: 'WETH', address: '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab', decimals: 18 },
    { symbol: 'WBTC', address: '0x50b7545627a5162f82a992c33b87adc75187b218', decimals: 8 },
  ],
};

/** Set de endereços conhecidos (lowercase) por chainId — pra filtrar o que o Enso retorna. */
export const sourceTokenSet = (chainId: number): Map<string, SourceToken> =>
  new Map((SOURCE_TOKENS[chainId] ?? []).map((t) => [t.address.toLowerCase(), t]));
