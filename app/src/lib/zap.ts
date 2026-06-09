import { sendTx } from './wallet';
import { encodeApprove, MAX_UINT } from './erc20';

export const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export interface ZapQuote {
  supported: boolean;
  reason?: string;
  lpTarget?: string;
  lpSymbol?: string | null;
  tokenIn?: string;
  amountIn?: string;
  to?: string;
  data?: string;
  value?: string;
  spender?: string;
  amountOut?: string;
  gas?: string;
  priceImpact?: number; // basis points (93 = 0,93%)
}

/** Pede ao nosso proxy a transação do zap (a chave Enso fica no servidor). */
export async function quoteZap(poolKey: string, amountUsdc: number, fromAddress: string, slippageBps = 50): Promise<ZapQuote> {
  const q = new URLSearchParams({ poolKey, amountUsdc: String(amountUsdc), fromAddress, slippageBps: String(slippageBps) });
  const r = await fetch(`/api/zap/quote?${q.toString()}`);
  if (!r.ok) return { supported: false, reason: `erro ${r.status}` };
  return r.json();
}

/** Allowance atual de USDC pro spender — lido pelo NOSSO servidor (RPC confiável, sem a RPC instável da carteira). */
export async function usdcAllowance(owner: string, spender: string): Promise<bigint> {
  try {
    const r = await fetch(`/api/zap/allowance?owner=${owner}&spender=${spender}`);
    if (!r.ok) return 0n;
    const j = (await r.json()) as { allowance?: string };
    return BigInt(j.allowance && j.allowance !== '0x' ? j.allowance : '0x0');
  } catch {
    return 0n; // se não der pra ler, assume 0 → faz o approve (seguro)
  }
}

/** Aprova USDC pro spender (uma vez). Retorna o hash. */
export async function approveUsdc(spender: string): Promise<string> {
  return sendTx({ to: USDC_BASE, data: encodeApprove(spender, MAX_UINT) });
}
