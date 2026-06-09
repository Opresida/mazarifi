/**
 * Meta on-chain de um token na Base via Etherscan V2 (multichain, chainid=8453).
 * Requer ETHERSCAN_API_KEY (grátis). SEM a chave, retorna tudo null (graceful — integridade roda só com mcap/liquidez).
 */
const ETHERSCAN_V2 = 'https://api.etherscan.io/v2/api';

export interface TokenMeta {
  verified: boolean | null; // contrato verificado (código-fonte público)?
  ageDays: number | null; // tempo desde a criação do contrato
  name: string | null;
}

export async function getTokenMeta(address: string): Promise<TokenMeta> {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) return { verified: null, ageDays: null, name: null };
  const base = `${ETHERSCAN_V2}?chainid=8453&apikey=${key}`;
  try {
    const [srcRes, creRes] = await Promise.all([
      fetch(`${base}&module=contract&action=getsourcecode&address=${address}`),
      fetch(`${base}&module=contract&action=getcontractcreation&contractaddresses=${address}`),
    ]);
    let verified: boolean | null = null;
    let name: string | null = null;
    let ageDays: number | null = null;

    if (srcRes.ok) {
      const j = (await srcRes.json()) as { result?: Array<{ ABI?: string; ContractName?: string }> };
      const r0 = j.result?.[0];
      if (r0) {
        verified = !!r0.ABI && r0.ABI !== 'Contract source code not verified';
        name = r0.ContractName || null;
      }
    }
    if (creRes.ok) {
      const j = (await creRes.json()) as { result?: Array<{ timestamp?: string }> };
      const ts = j.result?.[0]?.timestamp;
      if (ts && Number(ts) > 0) ageDays = (Date.now() / 1000 - Number(ts)) / 86400;
    }
    return { verified, ageDays, name };
  } catch {
    return { verified: null, ageDays: null, name: null };
  }
}
