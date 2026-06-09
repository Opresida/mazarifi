import { useEffect, useState } from 'react';
import { Redirect } from 'wouter';
import { LayoutDashboard, Boxes, Users, BarChart3, LifeBuoy, Settings, RefreshCw, AlertTriangle, Droplet } from 'lucide-react';
import type { Pool, AdminMetrics } from '../types';
import { fetchPools, fetchAdminMetrics } from '../api';
import { poolReturn15d, poolAnnual, poolName } from '../lib/pool';
import { fmtUsd } from '../lib/format';
import { Shell, type NavItem } from '../components/Shell';
import { Card, StatCard, Donut, RiskMeter, ActivityItem, DemoDot, SectionTitle, Sparkline, demoSeries, RiskPill } from '../components/atoms';
import { WalletButton } from '../components/WalletButton';
import { useWallet } from '../lib/wallet';

const NAV: NavItem[] = [
  { path: '/admin', label: 'Visão Geral', icon: LayoutDashboard },
  { path: '/admin', label: 'Pools', icon: Boxes },
  { path: '/admin', label: 'Usuários', icon: Users },
  { path: '/admin', label: 'Receita', icon: BarChart3 },
  { path: '/admin', label: 'Tickets', icon: LifeBuoy },
  { path: '/admin', label: 'Config', icon: Settings },
];

const CHAIN_COLORS = ['#34e29b', '#7c6ff0', '#f5b544', '#fb7185', '#5cf0b3', '#9d90ff'];

export function AdminDashboard() {
  const { isAdmin, address } = useWallet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [m, setM] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([fetchPools(), fetchAdminMetrics()])
      .then(([p, mm]) => {
        setPools(p);
        setM(mm);
      })
      .catch(() => setError('Não consegui carregar os dados (a API está rodando na porta 3001?).'));
  }, [isAdmin]);

  // Gate: só carteira allowlist. Sem carteira → pede conectar; carteira não-admin → manda pro user.
  if (!address) return <ConnectGate />;
  if (!isAdmin) return <Redirect to="/dashboard" />;

  const top = [...pools].filter((p) => poolReturn15d(p) != null).sort((a, b) => (poolAnnual(b) ?? 0) - (poolAnnual(a) ?? 0)).slice(0, 6);
  const chainData = (m?.byChain ?? []).slice(0, 5).map((c, i) => ({ name: c.chain, value: c.tvl || c.pools, color: CHAIN_COLORS[i % CHAIN_COLORS.length] }));

  return (
    <Shell nav={NAV} topRight={<><span className="hidden text-xs text-muted-2 sm:block">Admin</span><WalletButton /></>}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ftext">Visão Geral</h1>
          <p className="mt-1 text-sm text-muted">Operação da Mazari Fi em tempo real.</p>
        </div>
        <RefreshCw size={16} className="text-muted-2" />
      </div>

      {error && <div className="mt-4 rounded-xl border border-rose/30 bg-rose/8 px-4 py-3 text-sm text-rose">{error}</div>}

      {/* Banner honesto */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-iris/25 bg-iris/8 px-4 py-2.5 text-xs text-iris-bright">
        <AlertTriangle size={14} /> Métricas de <strong>usuários, ganho e volume</strong> são <strong>exemplo (demonstração)</strong> até a tração real. Pools, oportunidades e alocação são <strong>dados reais</strong>.
      </div>

      {/* StatCards */}
      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Volume movimentado" value="$12.4M" delta="+8.7% (7D)" series={demoSeries(1)} demo />
        <StatCard label="Ganho Mazari" value="$48.2k" delta="+12.9% (7D)" series={demoSeries(2)} color="var(--color-gold)" demo />
        <StatCard label="Pools monitoradas" value={m ? String(m.pools) : '—'} delta="dado real" series={demoSeries(3)} />
        <StatCard label="Usuários" value="8,732" delta="+9.8% (7D)" series={demoSeries(4)} color="var(--color-iris)" demo />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Melhores oportunidades (REAL) */}
        <Card className="p-5">
          <SectionTitle>Melhores oportunidades <span className="ml-1 text-[10px] font-normal text-lime">· real</span></SectionTitle>
          <div className="overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 border-b border-edge-soft pb-2 text-[10px] uppercase tracking-wide text-muted-2">
              <span>#</span><span>Oportunidade</span><span className="text-right">Rendeu 15d</span><span className="text-right">Aplicado</span>
            </div>
            {top.map((p, i) => {
              const r = poolReturn15d(p);
              return (
                <div key={p.pool_key} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-edge-soft/60 py-2.5 text-sm last:border-0">
                  <span className="text-muted-2">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ftext">{poolName(p)}</p>
                    <p className="truncate text-[11px] text-muted-2">{p.project} · {p.chain}</p>
                  </div>
                  <span className="tnum text-right font-semibold" style={{ color: (r ?? 0) < 0 ? 'var(--color-risky)' : 'var(--color-lime)' }}>
                    {r != null ? `${r >= 0 ? '+' : ''}${r.toFixed(2)}%` : '—'}
                  </span>
                  <span className="tnum text-right text-muted">{fmtUsd(p.tvl_usd)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Receita Mazari (demo) */}
        <Card className="p-5">
          <SectionTitle right={<DemoDot />}>Receita Mazari (7D)</SectionTitle>
          <p className="font-display tnum text-3xl font-bold text-lime">+$5,240</p>
          <p className="text-xs text-muted">acumulado na semana (exemplo)</p>
          <div className="mt-3">
            <Sparkline data={demoSeries(7, 28)} height={120} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[['Diário', '$748'], ['Semanal', '$5,240'], ['Mensal', '$21.6k']].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-edge-soft bg-ink p-2">
                <p className="text-[10px] text-muted-2">{k}</p>
                <p className="tnum text-sm font-semibold text-ftext">{v}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Alocação por chain (REAL) */}
        <Card className="p-5">
          <SectionTitle>Alocação por rede <span className="ml-1 text-[10px] font-normal text-lime">· real</span></SectionTitle>
          {chainData.length ? <Donut data={chainData} /> : <p className="text-sm text-muted-2">—</p>}
        </Card>

        {/* Risco médio (REAL) */}
        <Card className="p-5">
          <SectionTitle>Risco médio das pools <span className="ml-1 text-[10px] font-normal text-lime">· real</span></SectionTitle>
          {m ? <RiskMeter score={Math.round(m.avg_risk)} /> : <p className="text-sm text-muted-2">—</p>}
          <p className="mt-3 text-xs text-muted">Média do nível de segurança das {m?.pools ?? 0} pools monitoradas.</p>
        </Card>

        {/* Atividade recente (mix) */}
        <Card className="p-5">
          <SectionTitle>Atividade recente</SectionTitle>
          <ActivityItem icon={Droplet} color="#34e29b" title="Nova pool detectada" subtitle="Ingestor atualizou o ranking" time="agora" />
          <ActivityItem icon={AlertTriangle} color="#f5b544" title="Risco aumentado (exemplo)" subtitle="Volatilidade alta numa pool" time="25m" />
          <ActivityItem icon={Users} color="#7c6ff0" title="Novo usuário (exemplo)" subtitle="Conectou a carteira" time="1h" />
        </Card>
      </section>

      {/* Usuários + Tickets (demo) */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle right={<DemoDot />}>Usuários recentes</SectionTitle>
          {[['0x71…3eF2', '$8,420', 'Seguro'], ['0x9a…b12c', '$2,110', 'Médio'], ['0xframe…77', '$540', 'Médio']].map((u, i) => (
            <div key={i} className="flex items-center justify-between border-b border-edge-soft/60 py-2.5 text-sm last:border-0">
              <span className="tnum text-muted">{u[0]}</span>
              <span className="tnum text-ftext">{u[1]}</span>
              <RiskPill score={u[2] === 'Seguro' ? 80 : 60} />
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <SectionTitle right={<DemoDot />}>Tickets de suporte</SectionTitle>
          {[['#1042', 'Dúvida sobre saque', 'aberto'], ['#1041', 'Como conectar carteira', 'respondido'], ['#1038', 'Erro no gráfico', 'fechado']].map((t, i) => (
            <div key={i} className="flex items-center justify-between border-b border-edge-soft/60 py-2.5 text-sm last:border-0">
              <span className="tnum text-muted-2">{t[0]}</span>
              <span className="min-w-0 flex-1 truncate px-3 text-ftext">{t[1]}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ color: t[2] === 'aberto' ? '#fb7185' : t[2] === 'respondido' ? '#f5b544' : '#34e29b', background: '#ffffff0a' }}>{t[2]}</span>
            </div>
          ))}
        </Card>
      </section>

      <p className="mt-6 text-center text-xs text-muted-2">© 2026 Mazari Fi · Admin · Built on Base</p>
    </Shell>
  );
}

function ConnectGate() {
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="max-w-sm rounded-2xl border border-edge bg-card/70 p-8 text-center">
        <h1 className="font-display text-xl font-bold text-ftext">Área do administrador</h1>
        <p className="mt-2 text-sm text-muted">Conecte a carteira de admin para acessar.</p>
        <div className="mt-5 flex justify-center">
          <WalletButton />
        </div>
      </div>
    </div>
  );
}
