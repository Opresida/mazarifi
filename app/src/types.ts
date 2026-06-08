export interface Pool {
  pool_key: string;
  source: 'nortoken' | 'external';
  provenance: string; // 'nortoken-onchain' | 'defillama'
  chain: string;
  project: string;
  symbol: string;
  tvl_usd: number | null;
  apy_base: number | null; // % reportado
  apy_reward: number | null;
  volume_usd_24h: number | null;
  fee_tier: number | null;
  risk_score: number | null;
  fee_apr_honest: number | null; // % APR recalculado
  fee_apy_honest: number | null; // % APY (composto diário)
  net_usd: number | null;
  updated_at: string;
}

export interface Stats {
  total: number;
  nortoken: number;
  external: number;
  tvl_total: number;
  updated_at: string | null;
}
