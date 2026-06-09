/**
 * Meta on-chain de um token na Base via Etherscan V2 (multichain, chainid=8453).
 * Requer ETHERSCAN_API_KEY (grátis). SEM a chave, retorna tudo null (graceful — integridade roda só com mcap/liquidez).
 * Nota: no plano grátis, a Base só libera `getsourcecode` (verificado). Idade (getcontractcreation/txlist) é paga,
 * então `ageDays` fica null por ora (não fingimos).
 */
const ETHERSCAN_V2 = 'https://api.etherscan.io/v2/api';

export interface TokenMeta {
  verified: boolean | null; // contrato verificado (código-fonte público)?
  ageDays: number | null; // tempo desde a criação (indisponível no free tier da Base)
  name: string | null;
}

export async function getTokenMeta(address: string): Promise<TokenMeta> {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) return { verified: null, ageDays: null, name: null };
  try {
    const r = await fetch(`${ETHERSCAN_V2}?chainid=8453&module=contract&action=getsourcecode&address=${address}&apikey=${key}`);
    if (!r.ok) return { verified: null, ageDays: null, name: null };
    const j = (await r.json()) as { result?: Array<{ ABI?: string; ContractName?: string }> };
    const r0 = j.result?.[0];
    const verified = r0 ? !!r0.ABI && r0.ABI !== 'Contract source code not verified' : null;
    return { verified, ageDays: null, name: r0?.ContractName || null };
  } catch {
    return { verified: null, ageDays: null, name: null };
  }
}
