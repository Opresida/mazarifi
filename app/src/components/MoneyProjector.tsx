import { useState } from 'react';
import { projectEarnings } from '../lib/money';
import { fmtUsdExact } from '../lib/format';

export function MoneyProjector({ netAprPct, title = 'Quanto você quer aplicar?' }: { netAprPct: number | null; title?: string }) {
  const [amount, setAmount] = useState(1000);
  const p = projectEarnings(amount, netAprPct);
  return (
    <div className="rounded-2xl border border-edge bg-card/70 p-4">
      <label className="text-sm font-medium text-ftext">{title}</label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border border-edge bg-ink px-3">
          <span className="text-muted">$</span>
          <input
            type="number"
            value={amount}
            min={0}
            onChange={(e) => setAmount(Math.min(1e9, Math.max(0, Number(e.target.value) || 0)))}
            className="w-28 bg-transparent py-2 pl-1 font-display tnum text-lg text-ftext outline-none"
          />
        </div>
        {[100, 1000, 10000].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${amount === v ? 'border-lime/40 bg-lime/10 text-lime' : 'border-edge text-muted hover:text-ftext'}`}
          >
            ${v.toLocaleString('en-US')}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Proj label="Por dia" v={p.perDay} />
        <Proj label="Por mês" v={p.perMonth} />
        <Proj label="Por ano" v={p.perYear} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-2">
        Estimativa dos últimos 7 dias, já tirando as perdas. Rende mais ou menos — <strong className="text-muted">não é garantia</strong>.
      </p>
    </div>
  );
}

function Proj({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-xl border border-edge-soft bg-ink p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-2">{label}</p>
      <p className="font-display tnum mt-0.5 text-base font-bold text-lime">+{fmtUsdExact(v)}</p>
    </div>
  );
}
