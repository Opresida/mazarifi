import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Home, Compass, Wallet, Clock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import type { Pool } from '../types';
import { fetchPools, fetchBest } from '../api';
import { poolReturn15d, poolAnnual, poolName, whyBest, isConcentrated, isVolatile, volBand } from '../lib/pool';
import { fmtAgo } from '../lib/format';
import { Shell, type NavItem } from '../components/Shell';
import { Card, RiskPill, SectionTitle } from '../components/atoms';
import { OpportunityCard } from '../components/OpportunityCard';
import { MoneyProjector } from '../components/MoneyProjector';
import { WalletButton } from '../components/WalletButton';
import { PoolDetail } from '../components/PoolDetail';
import { useWallet } from '../lib/wallet';

const NAV: NavItem[] = [
  { path: '/dashboard', label: 'Início', icon: Home },
  { path: '/dashboard', label: 'Oportunidades', icon: Compass },
  { path: '/dashboard', label: 'Minha aplicação', icon: Wallet },
  { path: '/dashboard', label: 'Histórico', icon: Clock },
];

export function UserDashboard() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [best, setBest] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Pool | null>(null);
  const { address, isAdmin } = useWallet();

  useEffect(() => {
    Promise.all([fetchPools(), fetchBest()])
      .then(([p, b]) => {
        setPools(p);
        setBest(b);
      })
      .catch(() => setError('Não consegui carregar os dados agora (a fonte pode estar fora do ar). Tente recarregar.'))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    return pools
      .filter((p) => poolReturn15d(p) != null)
      .filter((p) => (q ? p.symbol.toLowerCase().includes(q.toLowerCase()) || p.project.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => (poolAnnual(b) ?? 0) - (poolAnnual(a) ?? 0));
  }, [pools, q]);

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
      <h1 className="font-display text-2xl font-bold text-ftext">Onde seu dinheiro rende mais hoje</h1>
      <p className="mt-1 text-sm text-muted">
        Já com as perdas descontadas. Sem cilada, em linguagem clara.
        {best?.updated_at && <span className="text-muted-2"> · atualizado {fmtAgo(best.updated_at)}</span>}
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-rose/30 bg-rose/8 px-4 py-3 text-sm text-rose">{error}</div>
      )}

      {/* Melhor opção agora */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="glow-lime relative overflow-hidden rounded-3xl border border-lime/30 bg-card/80 p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/15 px-2.5 py-1 text-xs font-semibold text-lime">
            <Sparkles size={13} /> Melhor opção agora
          </span>
          {best ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold text-ftext">{poolName(best)}</h2>
                <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] text-muted-2">{best.chain}</span>
                <RiskPill score={best.risk_score} />
              </div>
              <p className="font-display tnum mt-2 text-4xl font-bold" style={{ color: (best.return_15d ?? 0) < 0 ? 'var(--color-risky)' : 'var(--color-lime)' }}>
                {best.return_15d != null ? `${best.return_15d >= 0 ? '+' : ''}${best.return_15d.toFixed(2)}%` : '—'}
                <span className="text-base font-normal text-muted-2"> nos últimos 15 dias</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-2">
                {poolAnnual(best) != null ? `≈ ${poolAnnual(best)!.toFixed(0)}% ao ano (estimativa)` : 'rendimento anual indisponível'}
                {isConcentrated(best) && ' · pool concentrada (assume range ideal)'}
                {isVolatile(best) && volBand(best) && ` · ⚠ variou de ${volBand(best)}`}
              </p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{whyBest(best)}</p>
              <button
                onClick={() => setSel(best)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-ink hover:bg-lime-bright"
              >
                Ver detalhes <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <p className="mt-4 text-muted">{loading ? 'Procurando a melhor opção…' : 'Sem opção disponível agora.'}</p>
          )}
        </div>

        {/* Projetor de ganho (na melhor opção) */}
        <MoneyProjector netAprPct={best ? poolAnnual(best) : null} title="Quanto você quer aplicar na melhor opção?" />
      </div>

      {/* Lista de oportunidades */}
      <div className="mt-8">
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
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-2">Carregando…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((p, i) => (
              <OpportunityCard key={p.pool_key} pool={p} rank={i + 1} onOpen={() => setSel(p)} />
            ))}
          </div>
        )}
      </div>

      {/* Minha aplicação (empty-state honesto) */}
      <div className="mt-8">
        <SectionTitle>Minha aplicação</SectionTitle>
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <ShieldCheck size={24} className="text-muted-2" />
          <p className="text-sm text-muted">
            {address ? 'Você ainda não aplicou em nenhuma oportunidade.' : 'Conecte sua carteira para acompanhar suas aplicações aqui.'}
          </p>
          {!address && (
            <div className="mt-1">
              <WalletButton />
            </div>
          )}
          <p className="text-[11px] text-muted-2">Aplicar pela Mazari Fi (1 clique) chega na próxima fase.</p>
        </Card>
      </div>

      {sel && <PoolDetail pool={sel} onClose={() => setSel(null)} />}
    </Shell>
  );
}
