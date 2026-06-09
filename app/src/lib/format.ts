export function fmtUsd(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  if (v >= 1) return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

/** Valor preciso em US$ (ex.: $1,234.56) — pro projetor de ganho. */
export function fmtUsdExact(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null) return '—';
  return `${v.toFixed(digits)}%`;
}

/** Nível de segurança em linguagem leiga (alto score = mais seguro). */
export function safetyBand(score: number | null): { label: string; color: string; bg: string } {
  if (score == null) return { label: '—', color: 'var(--color-muted)', bg: 'rgba(138,143,163,.12)' };
  if (score >= 75) return { label: 'Seguro', color: 'var(--color-safe)', bg: 'rgba(52,226,155,.12)' };
  if (score >= 50) return { label: 'Médio', color: 'var(--color-mid)', bg: 'rgba(245,181,68,.12)' };
  return { label: 'Arriscado', color: 'var(--color-risky)', bg: 'rgba(251,113,133,.12)' };
}

/** Alias de compat (PoolDetail/RiskBadge antigos). */
export const riskBand = safetyBand;
