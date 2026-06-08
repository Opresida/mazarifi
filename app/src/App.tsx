import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Pool, Stats } from './types';
import { fetchPools, fetchStats } from './api';
import { fmtUsd, fmtPct, riskBand } from './lib/format';
import { RiskBadge } from './components/RiskBadge';
import { PoolDetail } from './components/PoolDetail';

type SourceFilter = 'all' | 'nortoken' | 'external';
type Sort = 'risk' | 'yield' | 'tvl';

export function App() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [src, setSrc] = useState<SourceFilter>('all');
  const [sort, setSort] = useState<Sort>('risk');
  const [selected, setSelected] = useState<Pool | null>(null);

  useEffect(() => {
    Promise.all([fetchPools(), fetchStats()])
      .then(([p, s]) => {
        setPools(p);
        setStats(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const view = useMemo(() => {
    const yieldOf = (p: Pool) => p.net_apr ?? p.apy_base ?? 0;
    return pools
      .filter((p) => (src === 'all' ? true : p.source === src))
      .filter((p) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return p.symbol.toLowerCase().includes(q) || p.project.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sort === 'tvl') return (b.tvl_usd ?? 0) - (a.tvl_usd ?? 0);
        if (sort === 'yield') return yieldOf(b) - yieldOf(a);
        return (b.risk_score ?? 0) - (a.risk_score ?? 0) || yieldOf(b) - yieldOf(a);
      });
  }, [pools, src, search, sort]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-8">
        {/* ── Header ── */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-iris/15 ring-1 ring-iris/30">
                <span className="text-lg text-iris-bright">⬢</span>
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold leading-none tracking-tight text-ftext">
                  Mazari <span className="text-iris-bright">Fi</span>
                </h1>
                <p className="mt-0.5 text-xs text-muted-2">Inteligência de pools · rendimento honesto, ajustado a risco</p>
              </div>
            </div>
          </div>
          <span className="rounded-full border border-edge bg-panel-solid px-3 py-1 text-xs text-muted">
            Ranking <span className="text-iris-bright">cego à origem</span> · sem APY inflado
          </span>
        </header>

        {/* ── Stats ── */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pools rastreadas" value={stats ? String(stats.total) : '—'} />
          <Stat label="TVL rastreado" value={stats ? fmtUsd(stats.tvl_total) : '—'} accent="gold" />
          <Stat label="Pools Nortoken" value={stats ? String(stats.nortoken) : '—'} accent="iris" hint="ground-truth on-chain" />
          <Stat label="Externas (Base)" value={stats ? String(stats.external) : '—'} hint="via DefiLlama" />
        </section>

        {/* ── Faixa de honestidade (o diferencial) ── */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 rounded-2xl border border-edge-soft bg-panel-solid/60 px-4 py-3 text-xs text-muted">
          <span><b className="text-gold">net</b> = fee + incentivo <b className="text-rose">− IL</b> − custos (o número que importa)</span>
          <span>sempre <b className="text-iris-bright">líquido de perda impermanente</b>, com a janela do lado</span>
          <span>risco = mesma régua p/ todas (Nortoken não ganha bônus)</span>
        </div>

        {/* ── Filtros ── */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar símbolo ou protocolo…"
            className="w-full max-w-xs rounded-xl border border-edge bg-panel-solid px-3.5 py-2 text-sm text-ftext placeholder:text-muted-2 outline-none focus:border-iris/60"
          />
          <Seg value={src} onChange={setSrc} options={[['all', 'Todas'], ['nortoken', '⬢ Nortoken'], ['external', 'Externas']]} />
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-2">
            ordenar:
            <Seg value={sort} onChange={setSort} options={[['risk', 'Risco'], ['yield', 'Rendimento'], ['tvl', 'TVL']]} />
          </div>
        </div>

        {/* ── Tabela ── */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-edge-soft bg-panel-solid/50">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 border-b border-edge-soft px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-2">
            <span>Risco</span>
            <span>Pool</span>
            <span className="text-right">TVL</span>
            <span className="hidden text-right sm:block">Vol 24h</span>
            <span className="text-right">Rendimento</span>
          </div>

          {loading && <Empty>Carregando pools reais…</Empty>}
          {error && <Empty>Erro: {error}. A API está rodando? (porta 3001)</Empty>}
          {!loading && !error && view.length === 0 && <Empty>Nenhuma pool com esse filtro.</Empty>}

          {view.map((p) => (
            <Row key={p.pool_key} pool={p} onClick={() => setSelected(p)} />
          ))}
        </div>

        <footer className="mt-6 text-center text-xs text-muted-2">
          {stats?.updated_at ? `Atualizado ${new Date(stats.updated_at).toLocaleString('pt-BR')}` : ''} · Fase 1
          (read-only) · testnet + Base mainnet
        </footer>
      </div>

      {selected && <PoolDetail pool={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Row({ pool, onClick }: { pool: Pool; onClick: () => void }) {
  const isNT = pool.source === 'nortoken';
  const hasNet = pool.net_apr != null;
  const showRange = pool.range_low != null && pool.range_high != null && Math.abs(pool.range_high - pool.range_low) >= 0.1;
  const netLabel = showRange ? `${fmtPct(pool.range_low, 1)}–${fmtPct(pool.range_high, 1)}` : fmtPct(pool.net_apr, 1);
  const netNeg = (pool.net_apr ?? 0) < 0;
  return (
    <button
      onClick={onClick}
      className="grid w-full grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 border-b border-edge-soft/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-panel-2/60"
      style={isNT ? { boxShadow: 'inset 3px 0 0 var(--color-iris)' } : undefined}
    >
      <RiskBadge score={pool.risk_score} size="sm" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-display font-semibold text-ftext">{pool.symbol}</span>
          {isNT && (
            <span className="shrink-0 rounded bg-iris/15 px-1.5 py-px text-[9px] font-bold uppercase text-iris-bright ring-1 ring-iris/30">
              ⬢ NT
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-2">
          {pool.project} · {pool.chain}
        </p>
      </div>
      <span className="tnum text-right text-sm text-ftext">{fmtUsd(pool.tvl_usd)}</span>
      <span className="tnum hidden text-right text-sm text-muted sm:block">{fmtUsd(pool.volume_usd_24h)}</span>
      <div className="text-right">
        {hasNet ? (
          <div className="tnum leading-tight">
            <span className="font-display font-semibold" style={{ color: netNeg ? 'var(--color-rose)' : 'var(--color-gold)' }}>
              {netLabel}
            </span>
            <p className="text-[10px] text-muted-2">
              net{pool.il_pct ? ` · −IL ${fmtPct(pool.il_pct, 2)}` : ''} · {pool.window_days ?? 7}d
            </p>
          </div>
        ) : (
          <div className="tnum leading-tight">
            <span className="font-display font-semibold text-ftext">{fmtPct(pool.apy_base)}</span>
            <p className="text-[10px] text-muted-2">{pool.il_risk === 'yes' ? '⚠ IL não medido' : 'reportado'}</p>
          </div>
        )}
      </div>
    </button>
  );
}

function Stat({ label, value, accent, hint }: { label: string; value: string; accent?: 'gold' | 'iris'; hint?: string }) {
  const color = accent === 'gold' ? 'text-gold' : accent === 'iris' ? 'text-iris-bright' : 'text-ftext';
  return (
    <div className="rounded-2xl border border-edge-soft bg-panel-solid/60 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-2">{label}</p>
      <p className={`font-display tnum mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-2">{hint}</p>}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="inline-flex rounded-xl border border-edge bg-panel-solid p-0.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === v ? 'bg-iris/20 text-iris-bright' : 'text-muted hover:text-ftext'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-2">{children}</div>;
}
