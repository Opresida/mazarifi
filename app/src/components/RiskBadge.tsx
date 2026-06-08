import { riskBand } from '../lib/format';

export function RiskBadge({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' }) {
  const b = riskBand(score);
  const dim = size === 'sm' ? 'h-9 w-9 text-sm' : 'h-12 w-12 text-base';
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${dim} font-display tnum grid place-items-center rounded-xl font-bold`}
        style={{ color: b.color, background: b.bg, boxShadow: `inset 0 0 0 1px ${b.color}33` }}
        title={`Score de risco ${score ?? '—'}/100 — cego à origem`}
      >
        {score ?? '—'}
      </div>
      {size === 'md' && <span className="text-xs font-medium" style={{ color: b.color }}>{b.label}</span>}
    </div>
  );
}
