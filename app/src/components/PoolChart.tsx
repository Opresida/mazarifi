import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis, XAxis, Tooltip } from 'recharts';
import type { ChartPoint, PoolChartData } from '../types';
import { fetchPoolChart } from '../api';
import { fmtUsd } from '../lib/format';
import { Card } from './atoms';

type Tab = 'price' | 'apy' | 'tvl';
const LIME = '#34E29B';

export function PoolChart({ poolKey, isPair }: { poolKey: string; isPair: boolean }) {
  const [data, setData] = useState<PoolChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>(isPair ? 'price' : 'apy');

  useEffect(() => {
    setLoading(true);
    fetchPoolChart(poolKey)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [poolKey]);

  if (loading) return <Card className="p-4"><p className="py-12 text-center text-sm text-muted-2">Carregando histórico…</p></Card>;
  if (!data) return null;

  const hasPrice = (data.price?.length ?? 0) >= 3;
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'price', label: 'Preço', show: hasPrice },
    { id: 'apy', label: 'Rendimento', show: data.apy.length > 0 },
    { id: 'tvl', label: 'TVL', show: data.tvl.length > 0 },
  ];
  const active = tabs.find((t) => t.id === tab)?.show ? tab : (tabs.find((t) => t.show)?.id ?? 'tvl');
  const series: ChartPoint[] = active === 'price' ? data.price ?? [] : active === 'apy' ? data.apy : data.tvl;
  const fmt = (v: number) => (active === 'price' ? v.toFixed(4) : active === 'apy' ? `${v.toFixed(1)}%` : fmtUsd(v));

  const vals = series.map((s) => s.v);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 0;
  const cur = vals.length ? vals[vals.length - 1] : 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ftext">Histórico</p>
        <div className="inline-flex rounded-lg border border-edge bg-ink p-0.5 text-xs font-medium">
          {tabs.filter((t) => t.show).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-md px-2.5 py-1 transition-colors ${active === t.id ? 'bg-lime/15 text-lime' : 'text-muted hover:text-ftext'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {series.length < 2 ? (
        <p className="py-10 text-center text-xs text-muted-2">Sem histórico suficiente pra essa métrica.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="Mínimo" v={fmt(min)} />
            <Stat label="Atual" v={fmt(cur)} accent />
            <Stat label="Máximo" v={fmt(max)} />
          </div>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="poolchart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={LIME} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={LIME} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <XAxis dataKey="t" hide />
                <Tooltip
                  contentStyle={{ background: '#11131D', border: '1px solid #1F2433', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#8b93a7' }}
                  labelFormatter={(t) => new Date(t as number).toLocaleDateString('pt-BR')}
                  formatter={(v) => [fmt(v as number), active === 'price' ? 'preço' : active === 'apy' ? 'rend.' : 'TVL']}
                />
                <Area type="monotone" dataKey="v" stroke={LIME} strokeWidth={1.5} fill="url(#poolchart)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {active === 'price' && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-2">
              Preço do par (ratio dos 2 ativos). MIN/ATUAL/MAX <b>observados</b> nos últimos ~30 dias — não é um range gerenciado por nós.
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function Stat({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-edge-soft bg-ink p-2">
      <p className="text-[9px] uppercase tracking-wide text-muted-2">{label}</p>
      <p className={`font-display tnum mt-0.5 text-sm font-semibold ${accent ? 'text-lime' : 'text-ftext'}`}>{v}</p>
    </div>
  );
}
