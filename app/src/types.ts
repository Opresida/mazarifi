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
  // ── rendimento LÍQUIDO de IL (a cascata honesta) ──
  fee_apr: number | null; // % fee (componente)
  reward_apr: number | null; // % incentivo (TEMPORÁRIO)
  il_pct: number | null; // % IL na janela (0 = sem IL; null = aplicável mas não medido)
  cost_apr: number | null;
  net_window_pct: number | null; // resultado líquido NA janela
  net_apr: number | null; // % anualizado líquido
  net_apy: number | null; // % composto líquido (headline)
  range_low: number | null;
  range_high: number | null;
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
