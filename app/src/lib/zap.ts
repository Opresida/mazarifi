import { sendTx } from './wallet';
import { encodeApprove, MAX_UINT } from './erc20';
import { chainCfg } from './chains';

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
  feeBps?: number; // taxa Mazari na ENTRADA (30 = 0,30%; 0 se não configurada)
}

/** Pede ao nosso proxy a transação do zap (a chave Enso fica no servidor). */
export async function quoteZap(poolKey: string, amountUsdc: number, fromAddress: string, slippageBps = 50): Promise<ZapQuote> {
  const q = new URLSearchParams({ poolKey, amountUsdc: String(amountUsdc), fromAddress, slippageBps: String(slippageBps) });
  const r = await fetch(`/api/zap/quote?${q.toString()}`);
  if (!r.ok) return { supported: false, reason: `erro ${r.status}` };
  return r.json();
}

/** Allowance atual do USDC (da chain) pro spender — lido pelo NOSSO servidor (RPC confiável). */
export async function usdcAllowance(owner: string, spender: string, chain: string): Promise<bigint> {
  try {
    const r = await fetch(`/api/zap/allowance?owner=${owner}&spender=${spender}&chain=${encodeURIComponent(chain)}`);
    if (!r.ok) return 0n;
    const j = (await r.json()) as { allowance?: string };
    return BigInt(j.allowance && j.allowance !== '0x' ? j.allowance : '0x0');
  } catch {
    return 0n; // se não der pra ler, assume 0 → faz o approve (seguro)
  }
}

/** Aprova o USDC da chain pro spender (uma vez). Retorna o hash. */
export async function approveUsdc(spender: string, chain: string): Promise<string> {
  const usdc = chainCfg(chain).usdc;
  if (!usdc) throw new Error(`sem USDC configurado pra ${chain}`);
  return sendTx({ to: usdc, data: encodeApprove(spender, MAX_UINT) });
}

/** Allowance de um token qualquer numa chain (pro saque OU pra origem do cross-chain). */
export async function tokenAllowance(owner: string, spender: string, token: string, chain?: string): Promise<bigint> {
  try {
    const q = new URLSearchParams({ owner, spender, token });
    if (chain) q.set('chain', chain);
    const r = await fetch(`/api/zap/allowance?${q.toString()}`);
    if (!r.ok) return 0n;
    const j = (await r.json()) as { allowance?: string };
    return BigInt(j.allowance && j.allowance !== '0x' ? j.allowance : '0x0');
  } catch {
    return 0n;
  }
}

/** Aprova um token qualquer pro spender (na chain atual da carteira). */
export async function approveToken(token: string, spender: string): Promise<string> {
  return sendTx({ to: token, data: encodeApprove(spender, MAX_UINT) });
}

export interface WithdrawQuote {
  supported: boolean;
  reason?: string;
  to?: string;
  data?: string;
  value?: string;
  spender?: string;
  amountOut?: string; // USDC base units (6) — JÁ líquido da taxa Mazari
  gas?: string;
  priceImpact?: number;
  feeBps?: number; // taxa da Mazari no saque (0 se não configurada)
}

/** Saque: monta a tx "posição → USDC" (Enso), na chain da posição. */
export async function quoteWithdraw(token: string, amount: string, fromAddress: string, chain: string, slippageBps = 50): Promise<WithdrawQuote> {
  const q = new URLSearchParams({ token, amount, fromAddress, chain, slippageBps: String(slippageBps) });
  const r = await fetch(`/api/zap/withdraw?${q.toString()}`);
  if (!r.ok) return { supported: false, reason: `erro ${r.status}` };
  return r.json();
}
