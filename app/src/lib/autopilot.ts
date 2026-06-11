/** Autopilot assistido (não-custodial): vigia as posições e sugere trocar pra uma pool melhor. */
export interface AutopilotSuggestion {
  from: { token: string; symbol: string | null; protocol: string | null; valueUsd: number; amount: string; decimals: number; chain: string; annualPct: number };
  to: { poolKey: string; symbol: string | null; project: string; annualPct: number };
  deltaPct: number;
  extraGainUsdYear: number;
  switchCostUsd: number;
  paybackDays: number;
}
export interface AutopilotResult {
  suggestions: AutopilotSuggestion[];
  monitored: number;
  total: number;
}

export async function fetchAutopilot(address: string): Promise<AutopilotResult> {
  const r = await fetch(`/api/autopilot?address=${address}`);
  if (!r.ok) throw new Error(`autopilot ${r.status}`);
  return r.json();
}

export interface MigrateQuote {
  supported: boolean;
  reason?: string;
  to?: string;
  data?: string;
  value?: string;
  spender?: string;
  amountOut?: string;
  gas?: string;
  priceImpact?: number;
  feeBps?: number; // 50 = 0,30% entrada + 0,20% auto-switch
  lpSymbol?: string | null;
}

/** Monta a tx da troca (posição atual → pool melhor) pro usuário ASSINAR. */
export async function quoteMigrate(fromToken: string, fromAmount: string, toPoolKey: string, fromAddress: string): Promise<MigrateQuote> {
  const q = new URLSearchParams({ fromToken, fromAmount, toPoolKey, fromAddress });
  const r = await fetch(`/api/autopilot/migrate?${q.toString()}`);
  if (!r.ok) return { supported: false, reason: `erro ${r.status}` };
  return r.json();
}
