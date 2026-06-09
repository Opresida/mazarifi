import { useState } from 'react';
import { projectEarnings, priceImpactPct } from '../lib/money';
import { fmtUsd, fmtUsdExact } from '../lib/format';

export function MoneyProjector({
  netAprPct,
  entryCostPct = 0,
  gasUsd = 0,
  tvlUsd = null,
  title = 'Quanto você quer aplicar?',
}: {
  netAprPct: number | null;
  entryCostPct?: number;
  gasUsd?: number;
  tvlUsd?: number | null;
  title?: string;
}) {
  const [amount, setAmount] = useState(1000);
  const p = projectEarnings(amount, netAprPct, entryCostPct, gasUsd);
  const isTrade = entryCostPct > 0;
  const slippage = isTrade ? priceImpactPct(amount, tvlUsd) : 0;
  const breakEven = p.breakEvenDays != null ? Math.ceil(p.breakEvenDays) : null;

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

      {/* Custo de entrada: swap + gás (ao vivo) + break-even */}
      <div className="mt-3 rounded-xl border border-gold/25 bg-gold/8 px-3 py-2 text-[11px] leading-relaxed text-gold">
        {p.entryCost > 0 ? (
          <>
            <span className="font-semibold">Custo de entrada ~{fmtUsdExact(p.entryCost)}</span> (uma vez):{' '}
            {p.swapCost > 0 ? `swap ${fmtUsdExact(p.swapCost)} + ` : 'só o '}gás {fmtUsdExact(p.gasCost)}{' '}
            <span className="text-gold/70">(ao vivo)</span>.{' '}
            {breakEven != null ? (
              <>Se paga em ~<strong>{breakEven} dia{breakEven > 1 ? 's' : ''}</strong> — depois é lucro.</>
            ) : (
              <>O rendimento atual não cobre esse custo rápido.</>
            )}
          </>
        ) : (
          <>✓ Praticamente sem custo de entrada.</>
        )}
      </div>

      {/* Slippage: aviso quando o valor é grande pra pool */}
      {isTrade && slippage > 0.1 && (
        <p className="mt-2 rounded-xl border border-rose/25 bg-rose/8 px-3 py-2 text-[11px] leading-relaxed text-rose">
          ⚠ Impacto no preço ~{slippage.toFixed(2)}% na entrada/saída — seu valor é grande pra essa pool (TVL {fmtUsd(tvlUsd)}). Considere dividir.
        </p>
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
