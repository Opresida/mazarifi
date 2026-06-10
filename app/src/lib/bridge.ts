/** Ponte de USDC entre redes (LiFi) — detecta onde está o dinheiro do usuário e traz pra rede da pool. */
export interface BridgeQuote {
  supported: boolean;
  reason?: string;
  to?: string;
  data?: string;
  value?: string;
  spender?: string;
  toAmount?: string | null; // USDC (6 casas) que chega no destino
  durationS?: number | null;
  tool?: string | null;
  feePct?: number; // rebate Mazari (0 se não configurado)
}

/** Saldo de USDC do usuário em cada chain (US$). */
export async function fetchUsdcBalances(address: string): Promise<Record<string, number>> {
  try {
    const r = await fetch(`/api/usdc-balances?address=${address}`);
    if (!r.ok) return {};
    return r.json();
  } catch {
    return {};
  }
}

/** Cotação da ponte USDC (origem → destino) — a LiFi escolhe a melhor rota. */
export async function quoteBridge(fromChain: string, toChain: string, fromAddress: string, amountUsdc: number): Promise<BridgeQuote> {
  const q = new URLSearchParams({ fromChain, toChain, fromAddress, amountUsdc: String(amountUsdc) });
  const r = await fetch(`/api/bridge/quote?${q.toString()}`);
  if (!r.ok) return { supported: false, reason: `erro ${r.status}` };
  return r.json();
}
