import { ChevronRight } from 'lucide-react';
import type { Pool, RewardIntegrity } from '../types';
import { fmtUsd } from '../lib/format';
import { poolReturn15d, poolAnnual, poolName, isConcentrated, isVolatile, managedInfo } from '../lib/pool';
import { RiskPill } from './atoms';

const rewardColor = (label?: RewardIntegrity['label']) =>
  label === 'Sólido' ? 'var(--color-safe)' : label === 'Cuidado' ? 'var(--color-risky)' : 'var(--color-gold)';
const rewardDot = (label?: RewardIntegrity['label']) => (label === 'Sólido' ? '🟢' : label === 'Cuidado' ? '🔴' : '🟡');

export function OpportunityCard({ pool, onOpen, rank }: { pool: Pool; onOpen: () => void; rank?: number }) {
  const ret = poolReturn15d(pool);
  const ann = poolAnnual(pool);
  const neg = (ret ?? 0) < 0;
  return (
    <button
      onClick={onOpen}
      className="group w-full rounded-2xl border border-edge bg-card/70 p-4 text-left transition-colors hover:border-lime/30"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {rank != null && <span className="font-display text-xs text-muted-2">#{rank}</span>}
          <span className="truncate font-display font-semibold text-ftext">{poolName(pool)}</span>
          <span className="shrink-0 rounded bg-ink px-1.5 py-0.5 text-[10px] text-muted-2">{pool.chain}</span>
          {managedInfo(pool) && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-iris"
              style={{ background: 'color-mix(in srgb, var(--color-iris) 16%, transparent)' }}
              title={`Gestão automática — cuidamos do range pra você (taxa ${managedInfo(pool)?.managerFeePct}% sobre o rendimento, via gestor parceiro auditado)`}
            >
              ⚙ Gerenciado
            </span>
          )}
          {pool.reward_symbol && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                color: rewardColor(pool.reward_integrity?.label),
                background: 'color-mix(in srgb, currentColor 14%, transparent)',
              }}
              title={`Incentivo em ${pool.reward_symbol}${pool.reward_integrity ? ` — ${pool.reward_integrity.label}` : ''}`}
            >
              +{pool.reward_symbol} {rewardDot(pool.reward_integrity?.label)}
            </span>
          )}
        </div>
        <RiskPill score={pool.risk_score} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-2">Rendeu nos últimos 15 dias</p>
          <p className="font-display tnum text-2xl font-bold" style={{ color: neg ? 'var(--color-risky)' : 'var(--color-lime)' }}>
            {ret != null ? `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%` : '—'}
          </p>
          <p className="truncate text-[10px] text-muted-2">
            {ann != null ? `≈ ${ann.toFixed(0)}%/ano` : 'sem dado de janela'}
            {(isConcentrated(pool) || managedInfo(pool)) && ' · concentrada'}
            {isVolatile(pool) && ' · ⚠ varia muito'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-muted-2">Já aplicado aqui</p>
          <p className="font-display tnum text-base font-semibold text-ftext">{fmtUsd(pool.tvl_usd)}</p>
        </div>
        <ChevronRight size={18} className="shrink-0 self-center text-muted-2 transition-colors group-hover:text-lime" />
      </div>
    </button>
  );
}
