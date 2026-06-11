import { describe, it, expect } from 'vitest';
import { perfUsd, healthScore, recoveryAnalysis } from './health';

describe('perfUsd', () => {
  it('quinzena = realizado 15d; dia e mês derivados', () => {
    const p = perfUsd(1000, 3); // 3% em 15d
    expect(p.fortnightPct).toBe(3);
    expect(p.fortnightUsd).toBeCloseTo(30);
    expect(p.dayUsd).toBeCloseTo(2); // (3/15)% de 1000
    expect(p.monthUsd).toBeCloseTo(60);
  });
  it('rendimento negativo (perda) propaga', () => {
    expect(perfUsd(1000, -2).fortnightUsd).toBeCloseTo(-20);
  });
});

describe('healthScore', () => {
  it('empréstimo seguro rendendo, acima do aporte = saudável', () => {
    const h = healthScore({ return15d: 0.5, il15d: 0, riskScore: 85, volLow: 5, volHigh: 5.2, valueUsd: 1000, costUsd: 980 });
    expect(h.band).toBe('saudavel');
    expect(h.underwaterPct).toBeLessThanOrEqual(0);
  });
  it('abaixo do aporte = vermelho', () => {
    const h = healthScore({ return15d: 1, il15d: 8, riskScore: 70, volLow: 5, volHigh: 20, valueUsd: 900, costUsd: 1000 });
    expect(h.band).toBe('vermelho');
    expect(h.underwaterPct).toBeCloseTo(10);
  });
});

describe('recoveryAnalysis', () => {
  it('break-even = (perda + custo) / ganho extra diário; lean segurar se demora', () => {
    const r = recoveryAnalysis({ valueUsd: 900, costUsd: 1000, bestAnnualPct: 20, curAnnualPct: 5, switchCostUsd: 5 });
    expect(r.perdaRealizadaUsd).toBe(100);
    expect(r.extraGainUsdYear).toBeCloseTo(135); // 900 * 15%
    expect(r.breakEvenDias).toBeGreaterThan(250);
    expect(r.lean).toBe('segurar');
  });
  it('lean trocar quando recupera rápido (sem perda)', () => {
    const r = recoveryAnalysis({ valueUsd: 1000, costUsd: 1000, bestAnnualPct: 30, curAnnualPct: 5, switchCostUsd: 5 });
    expect(r.perdaRealizadaUsd).toBe(0);
    expect(r.breakEvenDias).toBeLessThan(30);
    expect(r.lean).toBe('trocar');
  });
});
