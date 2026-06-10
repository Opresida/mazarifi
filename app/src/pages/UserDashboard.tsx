import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Compass, Wallet, ArrowRight, Landmark, Repeat } from 'lucide-react';
import type { Pool, BestPicks, NetworkInfo } from '../types';
import { fetchPools, fetchBest, fetchNetwork } from '../api';
import { poolReturn15d, poolAnnual, poolName, whyBest, isConcentrated, isVolatile, volBand, poolEntryCostPct, poolGasUsd, managedInfo } from '../lib/pool';
import { fmtAgo } from '../lib/format';
import { Filters, applyFilters } from '../components/Filters';
import { Shell, type NavItem } from '../components/Shell';
import { RiskPill, SectionTitle } from '../components/atoms';
import { OpportunityCard } from '../components/OpportunityCard';
import { MoneyProjector } from '../components/MoneyProjector';
import { WalletButton } from '../components/WalletButton';
import { useWallet } from '../lib/wallet';

const NAV: NavItem[] = [
  { path: '/dashboard', label: 'Oportunidades', icon: Compass },
  { path: '/minhas-aplicacoes', label: 'Minha aplicação', icon: Wallet },
];

export function UserDashboard() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [best, setBest] = useState<BestPicks | null>(null);
  const [net, setNet] = useState<NetworkInfo | null>(null);
  const [projKind, setProjKind] = useState<'lending' | 'trade'>('lending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Set<string>>(new Set());
  const { address, isAdmin } = useWallet();
  const [, navigate] = useLocation();
  const goPool = (p: Pool) => navigate(`/pool/${encodeURIComponent(p.pool_key)}`);

  const toggleFilter = (id: string) =>
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  useEffect(() => {
    Promise.all([fetchPools(), fetchBest(), fetchNetwork().catch(() => null)])
      .then(([p, b, n]) => {
        setPools(p);
        setBest(b);
        setNet(n);
      })
      .catch(() => setError('Não consegui carregar os dados agora (a fonte pode estar fora do ar). Tente recarregar.'))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    const base = pools
      .filter((p) => poolReturn15d(p) != null)
      .filter((p) => (q ? p.symbol.toLowerCase().includes(q.toLowerCase()) || p.project.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => (poolAnnual(b) ?? 0) - (poolAnnual(a) ?? 0));
    return applyFilters(base, filters);
  }, [pools, q, filters]);

  return (
    <Shell
      nav={NAV}
      topRight={
        <>
          {isAdmin && (
            <Link href="/admin" className="hidden rounded-lg border border-edge px-3 py-2 text-xs text-muted hover:text-ftext sm:block">
              Admin
            </Link>
          )}
          <WalletButton />
        </>
      }
    >
      <h1 id="topo" className="scroll-mt-20 font-display text-2xl font-bold text-ftext">Onde seu dinheiro rende mais hoje</h1>
      <p className="mt-1 text-sm text-muted">
        Já com as perdas descontadas. Sem cilada, em linguagem clara.
        {(best?.lending?.updated_at ?? best?.trade?.updated_at) && (
          <span className="text-muted-2"> · atualizado {fmtAgo(best?.lending?.updated_at ?? best?.trade?.updated_at)}</span>
        )}
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-rose/30 bg-rose/8 px-4 py-3 text-sm text-rose">{error}</div>
      )}

      {/* DOIS destaques: empréstimo (seguro) vs pool de troca (rende mais) */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <HighlightCard kind="lending" pool={best?.lending ?? null} loading={loading} onOpen={goPool} />
        <HighlightCard kind="trade" pool={best?.trade ?? null} loading={loading} onOpen={goPool} />
      </div>

      {/* Projetor com abas: simula o ganho em cada um */}
      {(() => {
        const projPool = (projKind === 'lending' ? best?.lending : best?.trade) ?? best?.lending ?? best?.trade ?? null;
        return (
          <div className="mt-4">
            <div className="mb-2 inline-flex rounded-xl border border-edge bg-card p-1 text-xs font-medium">
              {(['lending', 'trade'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setProjKind(k)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${projKind === k ? 'bg-lime/15 text-lime' : 'text-muted hover:text-ftext'}`}
                >
                  {k === 'lending' ? <Landmark size={13} /> : <Repeat size={13} />}
                  {k === 'lending' ? 'Empréstimo' : 'Gerenciada'}
                </button>
              ))}
            </div>
            <MoneyProjector
              netAprPct={projPool ? poolAnnual(projPool) : null}
              entryCostPct={projPool ? poolEntryCostPct(projPool) : 0}
              gasUsd={projPool ? poolGasUsd(projPool, net) : 0}
              tvlUsd={projPool?.tvl_usd ?? null}
              showSlippage={projKind === 'trade'}
              title={`Quanto você quer aplicar ${projKind === 'lending' ? 'no empréstimo' : 'na gerenciada'}?`}
            />
          </div>
        );
      })()}

      {/* Lista de oportunidades */}
      <div id="oportunidades" className="mt-8 scroll-mt-20">
        <SectionTitle
          right={
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="w-40 rounded-xl border border-edge bg-card px-3 py-1.5 text-sm text-ftext placeholder:text-muted-2 outline-none focus:border-lime/50"
            />
          }
        >
          Todas as oportunidades
        </SectionTitle>
        <div className="mt-3">
          <Filters active={filters} onToggle={toggleFilter} onClear={() => setFilters(new Set())} count={list.length} />
        </div>
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-2">Carregando…</p>
        ) : list.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-2">Nenhuma oportunidade com esses filtros. Tente afrouxar.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {list.map((p, i) => (
              <OpportunityCard key={p.pool_key} pool={p} rank={i + 1} onOpen={() => goPool(p)} />
            ))}
          </div>
        )}
      </div>

      {/* CTA pra ver as posições (a aplicação vive na rota própria /minhas-aplicacoes) */}
      <div className="mt-8">
        <Link
          href="/minhas-aplicacoes"
          className="flex items-center justify-between rounded-2xl border border-edge bg-card/60 p-4 transition-colors hover:border-lime/30"
        >
          <div>
            <p className="font-display font-semibold text-ftext">Minhas aplicações</p>
            <p className="text-xs text-muted-2">Veja o que você já aplicou e saque quando quiser.</p>
          </div>
          <ArrowRight size={18} className="text-muted-2" />
        </Link>
      </div>
    </Shell>
  );
}

/** Card de destaque — um pra empréstimo (seguro), outro pra pool de troca (rende mais). */
function HighlightCard({ kind, pool, loading, onOpen }: { kind: 'lending' | 'trade'; pool: Pool | null; loading: boolean; onOpen: (p: Pool) => void }) {
  const isLending = kind === 'lending';
  const Icon = isLending ? Landmark : Repeat;
  const title = isLending ? 'Melhor empréstimo' : 'Melhor gerenciada';
  const explain = isLending
    ? 'Você empresta uma moeda e recebe juros. Mais simples e seguro — sem risco de variação.'
    : 'Pool em que a gestão automática cuida do range pra você. Rende mais; o número estima e pode variar.';
  const entry = pool ? poolEntryCostPct(pool) : 0;
  return (
    <div className={`relative overflow-hidden rounded-3xl border p-6 ${isLending ? 'glow-lime border-lime/30 bg-card/80' : 'border-gold/30 bg-card/80'}`}>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isLending ? 'bg-lime/15 text-lime' : 'bg-gold/15 text-gold'}`}>
        <Icon size={13} /> {title}
      </span>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-2">{explain}</p>
      {pool ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-bold text-ftext">{poolName(pool)}</h2>
            <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] text-muted-2">{pool.chain}</span>
            <RiskPill score={pool.risk_score} />
          </div>
          <p
            className="font-display tnum mt-2 text-3xl font-bold"
            style={{ color: (pool.return_15d ?? 0) < 0 ? 'var(--color-risky)' : isLending ? 'var(--color-lime)' : 'var(--color-gold)' }}
          >
            {pool.return_15d != null ? `${pool.return_15d >= 0 ? '+' : ''}${pool.return_15d.toFixed(2)}%` : '—'}
            <span className="text-sm font-normal text-muted-2"> em 15 dias</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-2">
            {poolAnnual(pool) != null ? `≈ ${poolAnnual(pool)!.toFixed(0)}% ao ano` : 'anual indisponível'}
            {entry > 0 && ` · custo de entrada ~${entry.toFixed(2)}%`}
            {managedInfo(pool) && ' · ⚙ gestão automática cuida do range'}
            {isConcentrated(pool) && ' · concentrada'}
            {isVolatile(pool) && volBand(pool) && ` · ⚠ variou ${volBand(pool)}`}
          </p>
          <button
            onClick={() => onOpen(pool)}
            className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink ${isLending ? 'bg-lime hover:bg-lime-bright' : 'bg-gold hover:brightness-110'}`}
          >
            Ver detalhes <ArrowRight size={16} />
          </button>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">{loading ? 'Procurando…' : `Sem ${isLending ? 'empréstimo' : 'pool de troca'} qualificado agora.`}</p>
      )}
    </div>
  );
}
