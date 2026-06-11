/** Saúde da Aplicação — espelho de packages/core/src/health.ts (app não importa core; mesma matemática, testada lá). */

export interface Perf {
  dayUsd: number;
  dayPct: number;
  fortnightUsd: number;
  fortnightPct: number;
  monthUsd: number;
  monthPct: number;
}

export function perfUsd(valueUsd: number, return15dPct: number | null): Perf {
  const q = return15dPct ?? 0;
  const d = q / 15;
  const m = q * 2;
  const usd = (p: number) => (valueUsd * p) / 100;
  return { dayUsd: usd(d), dayPct: d, fortnightUsd: usd(q), fortnightPct: q, monthUsd: usd(m), monthPct: m };
}

export interface HealthInput {
  return15d: number | null;
  il15d: number | null;
  riskScore: number | null;
  volLow: number | null;
  volHigh: number | null;
  valueUsd: number;
  costUsd: number | null;
}
export type HealthBand = 'saudavel' | 'atencao' | 'vermelho';
export interface Health {
  score: number;
  band: HealthBand;
  underwaterPct: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function healthScore(i: HealthInput): Health {
  let score = i.riskScore ?? 60;
  if (i.return15d != null) score += i.return15d >= 0 ? Math.min(15, i.return15d * 5) : Math.max(-25, i.return15d * 8);
  if (i.il15d != null && i.il15d > 0) score -= Math.min(20, i.il15d * 2);
  if (i.volLow && i.volHigh && i.volLow > 0) {
    const r = i.volHigh / i.volLow;
    if (r > 2.5) score -= Math.min(15, (r - 2.5) * 5);
  }
  let underwaterPct = 0;
  if (i.costUsd && i.costUsd > 0) {
    underwaterPct = ((i.costUsd - i.valueUsd) / i.costUsd) * 100;
    if (underwaterPct > 0.5) score -= Math.min(40, underwaterPct * 3);
  }
  score = Math.round(clamp(score, 0, 100));
  const band: HealthBand = underwaterPct > 0.5 ? 'vermelho' : score >= 68 ? 'saudavel' : score >= 45 ? 'atencao' : 'vermelho';
  return { score, band, underwaterPct };
}

export interface RecoveryInput {
  valueUsd: number;
  costUsd: number | null;
  bestAnnualPct: number;
  curAnnualPct: number;
  switchCostUsd: number;
}
export interface Recovery {
  perdaRealizadaUsd: number;
  extraGainUsdYear: number;
  breakEvenDias: number;
  lean: 'trocar' | 'segurar';
}

export function recoveryAnalysis(i: RecoveryInput): Recovery {
  const perdaRealizadaUsd = i.costUsd && i.costUsd > i.valueUsd ? i.costUsd - i.valueUsd : 0;
  const extraGainUsdYear = (i.valueUsd * (i.bestAnnualPct - i.curAnnualPct)) / 100;
  const breakEvenDias = extraGainUsdYear > 0 ? Math.ceil((perdaRealizadaUsd + i.switchCostUsd) / (extraGainUsdYear / 365)) : Infinity;
  const lean: 'trocar' | 'segurar' = extraGainUsdYear > 0 && breakEvenDias <= 90 ? 'trocar' : 'segurar';
  return { perdaRealizadaUsd, extraGainUsdYear, breakEvenDias, lean };
}
