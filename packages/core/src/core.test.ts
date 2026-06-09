import { describe, it, expect } from 'vitest';
import { ilFullRange, concentratedAmplification, ilConcentrated, ilToUsd } from './il';
import { feeAprGross, aprNet, aprToApy, netYield, windowReturn, entryExitCostPct } from './apy';
import { honestScoreboard } from './scoreboard';
import { riskScore, riskBand, type RiskInput } from './risk';
import { migrationAdvice } from './migration';

describe('IL (impermanent loss)', () => {
  it('IL full-range: IL(1) = 0', () => {
    expect(ilFullRange(1)).toBeCloseTo(0, 10);
  });
  it('IL full-range: IL(4) ≈ -20%', () => {
    expect(ilFullRange(4)).toBeCloseTo(-0.2, 10);
  });
  it('IL é simétrico no preço (r e 1/r dão a mesma perda)', () => {
    expect(ilFullRange(4)).toBeCloseTo(ilFullRange(0.25), 10);
  });
  it('amplificação concentrada: range 16× (0.25,4) = 2', () => {
    expect(concentratedAmplification(0.25, 4)).toBeCloseTo(2, 10);
  });
  it('IL concentrado = full-range × amplificação', () => {
    expect(ilConcentrated(4, 0.25, 4)).toBeCloseTo(-0.4, 10);
  });
  it('ilToUsd converte fração em perda positiva', () => {
    expect(ilToUsd(-0.2, 10_000)).toBeCloseTo(2_000, 6);
  });
  it('rejeita razão de preço inválida', () => {
    expect(() => ilFullRange(0)).toThrow();
  });
});

describe('APY (fee-APR honesto)', () => {
  it('fee-APR bruto: vol=1e6, fee=0.3%, tvl=1e6 ⇒ 109,5% a.a.', () => {
    expect(feeAprGross({ volume24hUsd: 1_000_000, feeTier: 0.003, activeTvlUsd: 1_000_000 })).toBeCloseTo(1.095, 9);
  });
  it('TVL zero ⇒ 0 (sem divisão por zero)', () => {
    expect(feeAprGross({ volume24hUsd: 1_000_000, feeTier: 0.003, activeTvlUsd: 0 })).toBe(0);
  });
  it('fração no range reduz o APR proporcionalmente', () => {
    const full = feeAprGross({ volume24hUsd: 1_000_000, feeTier: 0.003, activeTvlUsd: 1_000_000 });
    const half = feeAprGross({ volume24hUsd: 1_000_000, feeTier: 0.003, activeTvlUsd: 1_000_000, fractionInRange: 0.5 });
    expect(half).toBeCloseTo(full / 2, 9);
  });
  it('APR líquido na Fase 1 (fees=0) = bruto', () => {
    expect(aprNet(1.095)).toBeCloseTo(1.095, 9);
  });
  it('APR líquido com fees é MULTIPLICATIVO (Doc 1 §2)', () => {
    expect(aprNet(0.1, 1000, 1000)).toBeCloseTo(0.081, 9); // 0,10 × 0,9 × 0,9
  });
  it('APR→APY: sem compor (n=1) APY = APR', () => {
    expect(aprToApy(0.1, 1)).toBeCloseTo(0.1, 9);
  });
  it('APR→APY: compondo diário (n=365) APY > APR', () => {
    expect(aprToApy(0.1, 365)).toBeCloseTo(0.10516, 5);
    expect(aprToApy(0.1, 365)).toBeGreaterThan(0.1);
  });
});

describe('netYield — LÍQUIDO de IL (o coração)', () => {
  it('sem IL: net ≈ fee', () => {
    const n = netYield({ feeAprPct: 5, windowDays: 7 });
    expect(n.netApr).toBeCloseTo(5, 6);
    expect(n.ilPct).toBe(0);
  });
  it('IL come o fee: fee +10% mas IL 0,5%/7d ⇒ NET negativo (a verdade que o APY esconde)', () => {
    const n = netYield({ feeAprPct: 10, ilPct: 0.5, windowDays: 7 });
    expect(n.netWindowPct).toBeCloseTo(-0.3082, 3);
    expect(n.netApr).toBeCloseTo(-16.07, 1);
    expect(n.netApr).toBeLessThan(0); // fee positivo, net NEGATIVO
  });
  it('incentivo entra separado e soma ao net', () => {
    const semReward = netYield({ feeAprPct: 8, ilPct: 0.1, windowDays: 7 });
    const comReward = netYield({ feeAprPct: 8, rewardAprPct: 4, ilPct: 0.1, windowDays: 7 });
    expect(comReward.netApr).toBeGreaterThan(semReward.netApr);
    expect(comReward.rewardPct).toBe(4);
  });
});

describe('windowReturn — "rendeu X% nos últimos N dias" (realizado)', () => {
  it('fee 2% − IL 0,5% em 15d ⇒ rendeu 1,5%; anualizado 36,5%', () => {
    const w = windowReturn({ feeReturnPct: 2, ilPct: 0.5, windowDays: 15 });
    expect(w.returnPct).toBeCloseTo(1.5, 9);
    expect(w.annualizedPct).toBeCloseTo(36.5, 6);
  });
  it('IL pode tornar o período NEGATIVO', () => {
    const w = windowReturn({ feeReturnPct: 0.5, ilPct: 2, windowDays: 15 });
    expect(w.returnPct).toBeLessThan(0);
  });
});

describe('entryExitCostPct — custo de entrar/sair (uma vez)', () => {
  it('empréstimo (single) não tem custo de swap', () => {
    expect(entryExitCostPct({ feeTier: null, exposure: 'single' })).toBe(0);
  });
  it('pool de troca = round-trip ≈ feeTier (0,3% → 0,3)', () => {
    expect(entryExitCostPct({ feeTier: 0.003, exposure: 'multi' })).toBeCloseTo(0.3, 9);
  });
  it('pool de troca sem feeTier conhecido assume 0,3%', () => {
    expect(entryExitCostPct({ feeTier: null, exposure: 'multi' })).toBeCloseTo(0.3, 9);
  });
});

describe('Placar honesto (fees − IL − custos)', () => {
  it('lucro real quando fees > IL + custos', () => {
    const s = honestScoreboard({ feesEarnedUsd: 100, ilUsd: 30, costsUsd: 5 });
    expect(s.netUsd).toBe(65);
    expect(s.profitable).toBe(true);
  });
  it('PREJUÍZO quando o IL come os fees (o que o APY esconde)', () => {
    const s = honestScoreboard({ feesEarnedUsd: 10, ilUsd: 30 });
    expect(s.netUsd).toBe(-20);
    expect(s.profitable).toBe(false);
  });
});

describe('Risco — CEGO À ORIGEM (integridade inegociável)', () => {
  const base: Omit<RiskInput, 'source'> = {
    contractAgeDays: 200,
    audited: true,
    tvlStability: 0.9,
    liquidityUsd: 5_000_000,
    trustScore: 80,
    sellable: true,
  };

  it('mesmos fatores, origem diferente ⇒ MESMO score', () => {
    const n = riskScore({ ...base, source: 'nortoken' });
    const e = riskScore({ ...base, source: 'external' });
    expect(n).toBe(e);
  });
  it('score fica em [0,100]', () => {
    expect(riskScore({ ...base, source: 'external' })).toBeGreaterThanOrEqual(0);
    expect(riskScore({ ...base, source: 'external' })).toBeLessThanOrEqual(100);
  });
  it('pior em tudo < melhor em tudo (monotônico nas dimensões reais)', () => {
    const ruim = riskScore({ source: 'nortoken', contractAgeDays: 1, audited: false, tvlStability: 0.1, liquidityUsd: 1000, trustScore: 10, sellable: false });
    const bom = riskScore({ source: 'external', contractAgeDays: 365, audited: true, tvlStability: 1, liquidityUsd: 10_000_000, trustScore: 95, sellable: true });
    expect(bom).toBeGreaterThan(ruim);
  });
  it('bandas', () => {
    expect(riskBand(80)).toBe('high');
    expect(riskBand(60)).toBe('medium');
    expect(riskBand(20)).toBe('low');
  });
});

describe('Radar de migração', () => {
  it('sugere quando o ganho extra paga o custo no horizonte', () => {
    const a = migrationAdvice({ gainAUsdPerYear: 100, gainBUsdPerYear: 300, switchCostUsd: 20, horizonDays: 180 });
    expect(a.worthIt).toBe(true);
    expect(a.paybackDays).toBeCloseTo(20 / (200 / 365), 6); // ~36,5 dias
  });
  it('NÃO sugere quando o custo não se paga no horizonte', () => {
    const a = migrationAdvice({ gainAUsdPerYear: 100, gainBUsdPerYear: 110, switchCostUsd: 50, horizonDays: 30 });
    expect(a.worthIt).toBe(false);
  });
  it('B pior que A ⇒ payback infinito', () => {
    const a = migrationAdvice({ gainAUsdPerYear: 300, gainBUsdPerYear: 100, switchCostUsd: 10, horizonDays: 365 });
    expect(a.paybackDays).toBe(Infinity);
    expect(a.worthIt).toBe(false);
  });
});
