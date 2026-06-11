import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { Compass, Wallet, ArrowLeft, CheckCircle2, AlertTriangle, MinusCircle, ArrowRight } from 'lucide-react';
import type { Pool, NetworkMap } from '../types';
import { fetchPool, fetchPools, fetchNetwork } from '../api';
import { Shell, type NavItem } from '../components/Shell';
import { Card } from '../components/atoms';
import { PoolDetailContent } from '../components/PoolDetail';
import { DepositPanel } from '../components/DepositPanel';
import { PoolChart } from '../components/PoolChart';
import { MoneyProjector } from '../components/MoneyProjector';
import { TokenDetailsCard } from '../components/TokenDetailsCard';
import { WalletButton } from '../components/WalletButton';
import { buildChecklist, type CheckItem } from '../lib/checklist';
import { beefyChecklist } from '../lib/beefyRisks';
import { bestAlternative, migrationAdvice } from '../lib/migration';
import { poolAnnual, poolName, poolEntryCostPct, poolGasUsd, managedInfo, pendleInfo } from '../lib/pool';
import { fmtUsdExact } from '../lib/format';

const NAV: NavItem[] = [
  { path: '/dashboard', label: 'Oportunidades', icon: Compass },
  { path: '/minhas-aplicacoes', label: 'Minha aplicação', icon: Wallet },
];

export function PoolPage() {
  const [, params] = useRoute('/pool/:key');
  const key = params?.key ? decodeURIComponent(params.key) : '';
  const [pool, setPool] = useState<Pool | null>(null);
  const [all, setAll] = useState<Pool[]>([]);
  const [net, setNet] = useState<NetworkMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) return;
    setLoading(true);
    Promise.all([fetchPool(key), fetchPools(), fetchNetwork().catch(() => null)])
      .then(([p, a, n]) => {
        setPool(p);
        setAll(a);
        setNet(n);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [key]);

  return (
    <Shell nav={NAV} topRight={<WalletButton />}>
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ftext">
        <ArrowLeft size={14} /> Voltar pras oportunidades
      </Link>
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-2">Carregando…</p>
      ) : !pool ? (
        <p className="py-10 text-center text-sm text-muted-2">Oportunidade não encontrada.</p>
      ) : (
        <>
          <h1 className="mt-3 font-display text-2xl font-bold text-ftext">{poolName(pool)}</h1>
          <p className="mt-0.5 text-sm text-muted">{pool.project} · {pool.chain}</p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0 space-y-4">
              <PoolDetailContent pool={pool} net={net} />
              {pendleInfo(pool) && (
                <Card className="border-gold/30 bg-gold/5 p-4">
                  <p className="text-sm font-semibold text-gold">⏳ Rende fixo até {new Date(pendleInfo(pool)!.expiry).toLocaleDateString('pt-BR')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">Você trava um rendimento <b>fixo</b> até essa data (estilo renda fixa). No vencimento o rendimento para e seu valor fica resgatável 1:1 — o <b className="text-ftext">Autopilot (Pro)</b> te avisa pra rolar pra próxima <b className="text-ftext">em 1 clique</b>.</p>
                </Card>
              )}
              <MoneyProjector
                title="Simule seu ganho aqui"
                netAprPct={poolAnnual(pool)}
                entryCostPct={poolEntryCostPct(pool)}
                gasUsd={poolGasUsd(pool, net)}
                tvlUsd={pool.tvl_usd}
                showSlippage={!!managedInfo(pool)}
              />
              <PoolChart poolKey={pool.pool_key} isPair={pool.exposure === 'multi'} managed={!!managedInfo(pool)} />
              <TokenDetailsCard pool={pool} />
              <ChecklistCard pool={pool} />
            </div>
            <div className="space-y-4">
              {pool.source !== 'nortoken' && <DepositPanel pool={pool} net={net} />}
              <MigrationCard pool={pool} all={all} net={net} />
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}

function CheckIcon({ status }: { status: CheckItem['status'] }) {
  if (status === 'ok') return <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-safe" />;
  if (status === 'warn') return <AlertTriangle size={16} className="mt-0.5 shrink-0 text-gold" />;
  return <MinusCircle size={16} className="mt-0.5 shrink-0 text-muted-2" />;
}

function ChecklistCard({ pool }: { pool: Pool }) {
  // Pool gerenciada: usa o Risk Checklist real do vault (flags da Beefy).
  const beefy = beefyChecklist(managedInfo(pool)?.risks);
  if (beefy.length > 0) {
    return (
      <Card className="mt-4 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-2">Risk Checklist</p>
        <div className="mt-3 space-y-3">
          {beefy.map((it) => (
            <div key={it.label} className="flex items-start gap-2.5">
              <CheckIcon status={it.ok ? 'ok' : 'warn'} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ftext">{it.label}</p>
                <p className="text-[11px] leading-relaxed text-muted-2">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-edge-soft pt-2 text-[10px] leading-relaxed text-muted-2">
          Checagens essenciais do vault. Passar nelas <b>não garante</b> segurança — perda por exploit/falha ainda pode acontecer. Serve pra ajudar a sua análise.
        </p>
      </Card>
    );
  }
  const items = buildChecklist(pool);
  const srcLabel: Record<CheckItem['source'], string> = { auto: 'automático', curado: 'curado', pendente: 'pendente' };
  return (
    <Card className="mt-4 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-2">O que a gente verificou</p>
      <div className="mt-3 space-y-3">
        {items.map((it) => (
          <div key={it.label} className="flex items-start gap-2.5">
            <CheckIcon status={it.status} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ftext">
                {it.label}
                <span className="ml-2 rounded bg-ink px-1.5 py-0.5 text-[9px] uppercase text-muted-2">{srcLabel[it.source]}</span>
              </p>
              <p className="text-[11px] leading-relaxed text-muted-2">{it.note}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-edge-soft pt-2 text-[10px] leading-relaxed text-muted-2">
        Passar nessas checagens <b>não garante</b> segurança total — ajuda na sua análise. "Pendente" = ainda não checamos automaticamente (não fingimos que checamos).
      </p>
    </Card>
  );
}

function MigrationCard({ pool, all, net }: { pool: Pool; all: Pool[]; net: NetworkMap | null }) {
  const alt = bestAlternative(pool, all);
  if (!alt) {
    return (
      <Card className="p-4">
        <p className="text-sm font-semibold text-ftext">Radar de migração</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">✓ Esta já é a melhor do tipo agora — não há troca que compense.</p>
      </Card>
    );
  }
  const amount = 1000;
  const annA = poolAnnual(pool) ?? 0;
  const annB = poolAnnual(alt) ?? 0;
  const switchCost = (amount * (poolEntryCostPct(pool) + poolEntryCostPct(alt))) / 100 + poolGasUsd(pool, net) + poolGasUsd(alt, net);
  const adv = migrationAdvice((amount * annA) / 100, (amount * annB) / 100, switchCost, 365);
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-ftext">Radar de migração</p>
      {adv.worthIt ? (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Tem opção melhor: <b className="text-ftext">{poolName(alt)}</b> rende ≈<b className="text-lime">{annB.toFixed(0)}%/ano</b> (+{(annB - annA).toFixed(0)} p.p.). Trocando (ref. $1.000): custa ~{fmtUsdExact(switchCost)}, e <b>se paga em ~{Math.ceil(adv.paybackDays)} dias</b>.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Existe a <b className="text-ftext">{poolName(alt)}</b> rendendo um pouco mais, mas trocar <b>não compensa</b> em 1 ano — o custo da troca come o ganho extra. Fica onde está.
        </p>
      )}
      <Link href={`/pool/${encodeURIComponent(alt.pool_key)}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-lime hover:text-lime-bright">
        Ver {poolName(alt)} <ArrowRight size={13} />
      </Link>
    </Card>
  );
}
