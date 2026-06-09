/**
 * Integridade de um token de incentivo (ex.: AERO) — pra INFORMAR a solidez, não assustar à toa.
 * Sinais grátis: mcap (tamanho), confidence (liquidez/confiabilidade do preço, DefiLlama), tracked (conhecido).
 * Opcionais (Etherscan): ageDays (tempo de mercado), verified (contrato verificado). knownProtocol = protocolo consolidado.
 */
export interface TokenIntegrityInput {
  mcapUsd: number | null;
  confidence: number | null; // 0-1 (DefiLlama)
  tracked: boolean; // o DefiLlama conhece/precifica o token?
  ageDays?: number | null;
  verified?: boolean | null;
  knownProtocol?: boolean;
}
export interface TokenIntegrity {
  score: number; // 0-100
  label: 'Sólido' | 'Razoável' | 'Cuidado';
  reasons: string[];
}

/**
 * Sólido = mcap > $50M E confidence ≥ 0,9 (token grande e líquido).
 * Cuidado = não-tracked, ou mcap < $1M, ou confidence < 0,5 (some/ilíquido).
 * Senão Razoável. Idade/verified/protocolo conhecido elevam; recém-criado puxa pra baixo.
 * Golden: AERO ($312M, 0,99) → Sólido; token $0,5M conf 0,3 → Cuidado.
 */
export function tokenIntegrity(i: TokenIntegrityInput): TokenIntegrity {
  const reasons: string[] = [];
  const mcap = i.mcapUsd ?? 0;
  const conf = i.confidence ?? 0;

  // base: 35 mcap + 35 liquidez + 15 idade + 15 verificado/conhecido
  let score = 0;
  if (mcap >= 1_000_000_000) { score += 35; reasons.push('mcap > $1B'); }
  else if (mcap >= 100_000_000) { score += 30; reasons.push('mcap > $100M'); }
  else if (mcap >= 50_000_000) { score += 24; reasons.push('mcap > $50M'); }
  else if (mcap >= 5_000_000) { score += 14; reasons.push('mcap moderado'); }
  else if (mcap > 0) { score += 5; reasons.push('mcap baixo'); }
  else reasons.push('sem mcap conhecido');

  if (conf >= 0.95) { score += 35; reasons.push('alta liquidez'); }
  else if (conf >= 0.9) { score += 30; reasons.push('boa liquidez'); }
  else if (conf >= 0.7) { score += 18; reasons.push('liquidez ok'); }
  else if (conf >= 0.5) { score += 8; reasons.push('liquidez baixa'); }
  else reasons.push('pouca liquidez');

  if (!i.tracked) { score = Math.min(score, 20); reasons.push('não rastreado'); }

  if (i.ageDays != null) {
    if (i.ageDays >= 365) { score += 15; reasons.push(`${Math.floor(i.ageDays / 365)}+ ano(s) no mercado`); }
    else if (i.ageDays >= 90) { score += 8; reasons.push(`${Math.round(i.ageDays / 30)} meses no mercado`); }
    else { reasons.push(`recém-criado (${Math.round(i.ageDays)}d)`); }
  }
  if (i.verified) { score += 8; reasons.push('contrato verificado'); }
  else if (i.verified === false) { reasons.push('contrato NÃO verificado'); }
  if (i.knownProtocol) { score += 7; reasons.push('protocolo conhecido'); }

  score = Math.max(0, Math.min(100, score));

  let label: TokenIntegrity['label'];
  if (!i.tracked || mcap < 1_000_000 || conf < 0.5) label = 'Cuidado';
  else if (mcap >= 50_000_000 && conf >= 0.9) label = 'Sólido';
  else label = 'Razoável';

  return { score, label, reasons };
}
