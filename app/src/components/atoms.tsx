import type { ComponentType, ReactNode } from 'react';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { safetyBand } from '../lib/format';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-edge bg-card/70 ${className}`}>{children}</div>;
}

/** Série suave pra sparkline de demonstração (determinística por seed). */
export function demoSeries(seed: number, n = 24, up = true): number[] {
  const out: number[] = [];
  let v = 50;
  for (let i = 0; i < n; i++) {
    const noise = (Math.sin(seed + i * 0.7) + Math.sin(seed * 2 + i * 0.3)) * 4;
    v += noise + (up ? 1.6 : -0.4);
    out.push(Math.max(5, v));
  }
  return out;
}

export function Sparkline({ data, color = 'var(--color-lime)', height = 40 }: { data: number[]; color?: string; height?: number }) {
  const d = data.map((v, i) => ({ i, v }));
  const gid = 'sg' + color.replace(/[^a-z0-9]/gi, '');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={d} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gid})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatCard({
  label,
  value,
  delta,
  series,
  color = 'var(--color-lime)',
  demo,
}: {
  label: string;
  value: string;
  delta?: string;
  series?: number[];
  color?: string;
  demo?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="flex items-center gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-2">{label}</p>
        {demo && <DemoDot />}
      </div>
      <p className="font-display tnum mt-1 text-2xl font-bold text-ftext">{value}</p>
      {delta && <p className="text-xs font-medium" style={{ color }}>{delta}</p>}
      {series && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-70">
          <Sparkline data={series} color={color} height={36} />
        </div>
      )}
    </Card>
  );
}

export function RiskPill({ score, plain = true }: { score: number | null; plain?: boolean }) {
  const b = safetyBand(score);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: b.color, background: b.bg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: b.color }} />
      {b.label}
      {!plain && score != null && <span className="opacity-60">· {score}</span>}
    </span>
  );
}

export function RiskMeter({ score }: { score: number }) {
  const b = safetyBand(score);
  return (
    <div>
      <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: 'linear-gradient(90deg,#fb7185,#f5b544,#34e29b)' }}>
        <div className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded bg-white shadow" style={{ left: `${Math.min(98, Math.max(2, score))}%` }} />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display tnum text-2xl font-bold" style={{ color: b.color }}>{score}</span>
        <span className="text-sm text-muted">/100 · {b.label}</span>
      </div>
    </div>
  );
}

export function Donut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="flex items-center gap-4">
      <div className="h-28 w-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={34} outerRadius={52} paddingAngle={2} stroke="none">
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            <span className="text-muted">{d.name}</span>
            <span className="tnum ml-auto font-medium text-ftext">{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityItem({ icon: Icon, color, title, subtitle, time }: { icon: ComponentType<{ size?: number }>; color: string; title: string; subtitle: string; time: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${color}1f`, color }}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ftext">{title}</p>
        <p className="truncate text-xs text-muted-2">{subtitle}</p>
      </div>
      <span className="shrink-0 text-[10px] text-muted-2">{time}</span>
    </div>
  );
}

export function DemoDot() {
  return (
    <span className="rounded bg-iris/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-iris-bright" title="Número de exemplo (demonstração)">
      exemplo
    </span>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="font-display text-base font-semibold text-ftext">{children}</h3>
      {right}
    </div>
  );
}
