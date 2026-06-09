import { useState } from 'react';
import { projectEarnings } from '../lib/money';
import { fmtUsdExact } from '../lib/format';

export function MoneyProjector({
  netAprPct,
  entryCostPct = 0,
  title = 'Quanto você quer aplicar?',
}: {
  netAprPct: number | null;
  entryCostPct?: number;
  title?: string;
}) {
  const [amount, setAmount] = useState(1000);
  const p = projectEarnings(amount, netAprPct, entryCostPct);
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
      {p.entryCost > 0 ? (
        <div className="mt-3 rounded-xl border border-gold/25 bg-gold/8 px-3 py-2 text-[11px] leading-relaxed text-gold">
          Custo de entrada ~{fmtUsdExact(p.entryCost)} (uma vez, pra montar a posição).{' '}
          {p.breakEvenDays != null ? (
            <>Se paga em ~<strong>{Math.ceil(p.breakEvenDays)} dia{Math.ceil(p.breakEvenDays) > 1 ? 's' : ''}</strong> — depois disso é lucro.</>
          ) : (
            <>O rendimento atual é baixo demais pra cobrir esse custo rápido.</>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-safe">✓ Sem custo de entrada — é um empréstimo, você só deposita.</p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-muted-2">
        Estimativa dos últimos 15 dias, já tirando as perdas. Rende mais ou menos — <strong className="text-muted">não é garantia</strong>.
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
