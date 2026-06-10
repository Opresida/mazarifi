/** Os dois destaques: melhor empréstimo e melhor pool de troca. */
export interface BestPicks {
  lending: Pool | null;
  trade: Pool | null;
}

/** Solidez do token de incentivo (ex.: AERO) — pra informar, não assustar. */
export interface RewardIntegrity {
  token: string;
  symbol: string | null;
  mcapUsd: number | null;
  confidence: number | null;
  ageDays: number | null;
  verified: boolean | null;
  knownProtocol: boolean;
  score: number;
  label: 'Sólido' | 'Razoável' | 'Cuidado';
  reasons: string[];
}

/** Ponto de série temporal (t = ms, v = valor). */
export interface ChartPoint {
  t: number;
  v: number;
}
/** Histórico da pool: preço do par (ratio), rendimento (apy) e TVL. */
export interface PoolChartData {
  price?: ChartPoint[];
  apy: ChartPoint[];
  tvl: ChartPoint[];
}

/** Posição DeFi do usuário (LP/vault que ele tem na carteira). */
export interface Position {
  token: string;
  symbol: string | null;
  name: string | null;
  valueUsd: number;
  amount: string; // base units
  decimals: number;
  protocol: string | null;
  logoUri: string | null;
}

/** Gás AO VIVO da Base + preço do ETH (custo de gás por tipo de operação, em US$). */
export interface NetworkInfo {
  gas_price_gwei: number | null;
  eth_usd: number | null;
  gas_lending_usd: number | null;
  gas_trade_usd: number | null;
  gas_concentrated_usd: number | null;
  updated_at: string;
}

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
  // ── rendimento REALIZADO em 15 dias (o número honesto) ──
  return_15d: number | null; // % que rendeu nos últimos 15 dias (HEADLINE)
  net_annual_15d: number | null; // % anualizado (estimativa, secundário)
  fee_return_15d: number | null; // fee realizado em 15d
  reward_return_15d: number | null; // incentivo realizado em 15d (TEMPORÁRIO)
  reward_symbol: string | null; // token do incentivo (ex.: 'AERO')
  reward_integrity: RewardIntegrity | null; // solidez do token de incentivo
  il_15d: number | null; // % IL em 15d (0 = sem IL; null = aplicável mas não medido)
  vol_low: number | null; // apyBase mínimo nos 15d (%)
  vol_high: number | null; // apyBase máximo nos 15d (%)
  window_days: number | null;
  exposure: string | null;
  il_risk: string | null;
  updated_at: string;
}

export interface Stats {
  total: number;
  nortoken: number;
  external: number;
  tvl_total: number;
  updated_at: string | null;
}

export interface AdminMetrics {
  pools: number;
  tvl_total: number;
  avg_risk: number;
  updated_at: string | null;
  byChain: { chain: string; pools: number; tvl: number }[];
  byRisk: { band: string; n: number }[];
}
