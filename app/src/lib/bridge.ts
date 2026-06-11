/** "A Mazari resolve": detecta o dinheiro do usuário em QUALQUER rede/ativo conhecido e traz pra investir. */

/** Um ativo conhecido que o usuário tem em alguma rede de origem. */
export interface FundingSource {
  chain: string; // 'Polygon' | 'BNB Chain' | ...
  token: string; // endereço (0x0000… = nativo)
  symbol: string; // 'USDT' | 'BNB' | ...
  amountUsd: number;
  amount: string; // base units (decimals do token)
  decimals: number;
}

/** Escaneia o que o usuário tem de ativo conhecido em todas as redes de origem (ordenado por valor). */
export async function fetchFundingSources(address: string): Promise<FundingSource[]> {
  try {
    const r = await fetch(`/api/funding-sources?address=${address}`);
    if (!r.ok) return [];
    const j = (await r.json()) as { sources?: FundingSource[] };
    return j.sources ?? [];
  } catch {
    return [];
  }
}

/** Quanto do ativo de origem (base units) equivale a `targetUsd`, limitado ao que o usuário tem. */
export function sourceAmountForUsd(src: FundingSource, targetUsd: number): string {
  if (src.amountUsd <= 0) return '0';
  const frac = Math.min(1, targetUsd / src.amountUsd);
  // amount × frac, em inteiro (base units)
  const amt = (BigInt(src.amount) * BigInt(Math.floor(frac * 1e6))) / 1_000_000n;
  return amt.toString();
}

export interface CrossDepositQuote {
  supported: boolean;
  reason?: string;
  to?: string;
  data?: string;
  value?: string;
  spender?: string;
  durationS?: number | null;
  tool?: string | null;
  depositUsd?: number; // USDC que entra no vault no destino
  vaultSymbol?: string | null;
  feePct?: number; // rebate Mazari da ponte (0 se não configurado)
}

/** Depósito cross-chain em 1 ASSINATURA: swap+ponte do ativo origem + investe no vault do destino. */
export async function quoteCrossDeposit(poolKey: string, fromChain: string, fromToken: string, fromAmount: string, fromAddress: string): Promise<CrossDepositQuote> {
  const q = new URLSearchParams({ poolKey, fromChain, fromToken, fromAmount, fromAddress });
  const r = await fetch(`/api/bridge/deposit-quote?${q.toString()}`);
  if (!r.ok) return { supported: false, reason: `erro ${r.status}` };
  return r.json();
}
