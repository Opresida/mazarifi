import type { Pool } from '../types';
import { chainCfg } from './chains';

/** Site oficial dos tokens que usamos (a Beefy não expõe via API — mapa curado). */
export const TOKEN_SITE: Record<string, string> = {
  WETH: 'https://ethereum.org', ETH: 'https://ethereum.org',
  USDC: 'https://www.circle.com/usdc', USDBC: 'https://www.circle.com/usdc',
  USDT: 'https://tether.to', DAI: 'https://makerdao.com', USDS: 'https://sky.money', SUSDS: 'https://sky.money',
  EURC: 'https://www.circle.com/eurc', GHO: 'https://gho.aave.com', EUSD: 'https://ethena.fi',
  CRVUSD: 'https://crvusd.curve.fi', 'USD+': 'https://overnight.fi',
  CBBTC: 'https://www.coinbase.com/cbbtc', WBTC: 'https://wbtc.network', TBTC: 'https://threshold.network', LBTC: 'https://www.lombard.finance',
  WSTETH: 'https://lido.fi', WEETH: 'https://ether.fi', CBETH: 'https://www.coinbase.com/cbeth', RETH: 'https://rocketpool.net',
  EZETH: 'https://www.renzoprotocol.com', SUPEROETHB: 'https://www.originprotocol.com/super-oeth', WSUPEROETHB: 'https://www.originprotocol.com/super-oeth',
  AERO: 'https://aerodrome.finance', VELO: 'https://velodrome.finance', WELL: 'https://moonwell.fi', MORPHO: 'https://morpho.org',
  VIRTUAL: 'https://www.virtuals.io', BRETT: 'https://www.basedbrett.com', DEGEN: 'https://www.degen.tips', EURA: 'https://www.angle.money',
  // Arbitrum
  ARB: 'https://arbitrum.io', GMX: 'https://gmx.io', PENDLE: 'https://www.pendle.finance', GRAIL: 'https://camelot.exchange', OP: 'https://www.optimism.io',
};

/** Link do explorer (BaseScan/Arbiscan) pro endereço, conforme a chain. */
export const explorerUrl = (chain: string, addr: string) => `${chainCfg(chain).explorer}/address/${addr}`;

export interface AssetRow {
  symbol: string;
  address: string | null;
  site: string | null;
  explorer: string | null;
}

/** Linhas de ativo: pareia os símbolos do par com os endereços (`raw.underlyingTokens`), por índice. */
export function assetRows(pool: Pool): AssetRow[] {
  const symbols = pool.symbol.toUpperCase().replace(/\//g, '-').split('-').filter(Boolean);
  const raw = pool.raw as { underlyingTokens?: string[] } | null | undefined;
  const addrs = raw?.underlyingTokens ?? [];
  return symbols.map((symbol, i) => {
    const address = addrs[i] ?? null;
    return { symbol, address, site: TOKEN_SITE[symbol] ?? null, explorer: address ? explorerUrl(pool.chain, address) : null };
  });
}
