export function fmtUsd(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  if (v >= 1) return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null) return '—';
  return `${v.toFixed(digits)}%`;
}

/** Banda de risco → rótulo + cor (alto score = mais confiável). */
export function riskBand(score: number | null): { label: string; color: string; bg: string } {
  if (score == null) return { label: '—', color: 'var(--color-muted)', bg: 'rgba(154,156,184,.12)' };
  if (score >= 75) return { label: 'Sólido', color: 'var(--color-teal)', bg: 'rgba(45,212,191,.12)' };
  if (score >= 50) return { label: 'Moderado', color: 'var(--color-gold)', bg: 'rgba(245,181,68,.12)' };
  return { label: 'Arriscado', color: 'var(--color-rose)', bg: 'rgba(251,113,133,.12)' };
}
