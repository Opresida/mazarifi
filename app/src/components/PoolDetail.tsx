import type { Pool } from '../types';
import { fmtUsd, fmtPct, riskBand } from '../lib/format';
import { RiskBadge } from './RiskBadge';

export function PoolDetail({ pool, onClose }: { pool: Pool; onClose: () => void }) {
  const isNT = pool.source === 'nortoken';
  const recalc = pool.fee_apr_honest != null;
  const b = riskBand(pool.risk_score);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-edge bg-ink-2 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-ftext">{pool.symbol}</span>
              <SourceTag source={pool.source} />
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {pool.project} · {pool.chain}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-muted hover:bg-panel-2 hover:text-ftext">
            ✕
          </button>
        </div>

        {/* risco */}
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-edge-soft bg-panel-solid p-4">
          <RiskBadge score={pool.risk_score} />
          <div>
            <p className="text-sm font-medium" style={{ color: b.color }}>
              Risco {b.label}
            </p>
            <p className="text-xs text-muted-2">Score 0-100 cego à origem — sem bônus por ser Nortoken.</p>
          </div>
        </div>

        {/* rendimento */}
        <div className="mt-4 rounded-2xl border border-edge-soft bg-panel-solid p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-2">Rendimento</p>
          {recalc ? (
            <div className="grid grid-cols-2 gap-3">
              <Metric label="APR (simples)" value={fmtPct(pool.fee_apr_honest)} accent="gold" />
              <Metric label="APY (composto diário)" value={fmtPct(pool.fee_apy_honest)} accent="iris" />
            </div>
          ) : (
            <Metric label="APY reportado" value={fmtPct(pool.apy_base)} accent="muted" />
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-2">
            {recalc ? (
              <>
                <span className="text-iris-bright">Recalculado por nós</span> a partir de volume/fee/TVL reais
                {isNT && ' (volume on-chain do evento SwapTracked — ground-truth)'}. APY ≥ APR porque assume
                reinvestimento diário.
              </>
            ) : (
              <>
                <span className="text-gold">Número reportado pelo DefiLlama</span> — ainda não recalculamos esta pool
                on-chain (próximo passo). Por isso marcamos a proveniência.
              </>
            )}
          </p>
        </div>

        {/* números */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric label="TVL" value={fmtUsd(pool.tvl_usd)} />
          <Metric label="Volume 24h" value={fmtUsd(pool.volume_usd_24h)} />
          <Metric label="Fee tier" value={pool.fee_tier != null ? `${(pool.fee_tier * 100).toFixed(2)}%` : '—'} />
          <Metric label="Proveniência" value={pool.provenance} />
        </div>

        {/* placar honesto */}
        <div className="mt-4 rounded-2xl border border-dashed border-edge bg-transparent p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-2">Placar honesto (fees − IL)</p>
          <p className="mt-1 text-sm text-muted">
            Em breve: o resultado REAL de ser LP (taxas ganhas − perda impermanente). Precisa de histórico de preço —
            é o que separa "APY bonito" de "lucro de verdade".
          </p>
        </div>

        {isNT && (
          <p className="mt-4 rounded-xl bg-iris/10 p-3 text-xs text-iris-bright ring-1 ring-iris/20">
            ⬢ Pool Nortoken — dados lidos direto da blockchain (preço, volume e posição travada). Nossa vantagem injusta.
          </p>
        )}
      </aside>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: 'gold' | 'iris' | 'muted' }) {
  const color = accent === 'gold' ? 'text-gold' : accent === 'iris' ? 'text-iris-bright' : 'text-ftext';
  return (
    <div className="rounded-xl border border-edge-soft bg-panel-solid p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-2">{label}</p>
      <p className={`font-display tnum mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function SourceTag({ source }: { source: Pool['source'] }) {
  return source === 'nortoken' ? (
    <span className="rounded-md bg-iris/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-iris-bright ring-1 ring-iris/30">
      ⬢ Nortoken
    </span>
  ) : (
    <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-2 ring-1 ring-edge">
      Externa
    </span>
  );
}
