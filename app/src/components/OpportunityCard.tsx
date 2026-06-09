import { ChevronRight } from 'lucide-react';
import type { Pool } from '../types';
import { fmtUsd, fmtPct } from '../lib/format';
import { poolNet, poolName } from '../lib/pool';
import { RiskPill } from './atoms';

export function OpportunityCard({ pool, onOpen, rank }: { pool: Pool; onOpen: () => void; rank?: number }) {
  const net = poolNet(pool);
  const neg = (net ?? 0) < 0;
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
        </div>
        <RiskPill score={pool.risk_score} />
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] text-muted-2">Quanto sobra pra você</p>
          <p className="font-display tnum text-2xl font-bold" style={{ color: neg ? 'var(--color-risky)' : 'var(--color-lime)' }}>
            {fmtPct(net, 1)} <span className="text-xs font-normal text-muted-2">por ano</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-2">Já aplicado aqui</p>
          <p className="font-display tnum text-base font-semibold text-ftext">{fmtUsd(pool.tvl_usd)}</p>
        </div>
        <ChevronRight size={18} className="ml-1 shrink-0 text-muted-2 transition-colors group-hover:text-lime" />
      </div>
    </button>
  );
}
