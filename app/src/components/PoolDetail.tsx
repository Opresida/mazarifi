import type { Pool } from '../types';
import { fmtUsd, fmtPct, riskBand } from '../lib/format';
import { RiskBadge } from './RiskBadge';

export function PoolDetail({ pool, onClose }: { pool: Pool; onClose: () => void }) {
  const isNT = pool.source === 'nortoken';
  const hasReturn = pool.return_15d != null;
  const b = riskBand(pool.risk_score);
  const win = pool.window_days ?? 15;
  const ret = pool.return_15d;
  const retLabel = ret != null ? `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%` : '—';
  const volBandTxt = pool.vol_low != null && pool.vol_high != null ? `${Math.round(pool.vol_low)}% a ${Math.round(pool.vol_high)}%` : null;
  const volatile = pool.vol_low != null && pool.vol_high != null && pool.vol_low > 0 && pool.vol_high > pool.vol_low * 2.5;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-edge bg-ink-2 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-ftext">{pool.symbol}</span>
              <SourceTag source={pool.source} />
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {pool.project} · {pool.chain}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-muted hover:bg-panel-2 hover:text-ftext">
            ✕
          </button>
        </div>

        {/* risco */}
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-edge-soft bg-panel-solid p-4">
          <RiskBadge score={pool.risk_score} />
          <div>
            <p className="text-sm font-medium" style={{ color: b.color }}>
              Risco {b.label}
            </p>
            <p className="text-xs text-muted-2">Score 0-100 cego à origem — sem bônus por ser Nortoken.</p>
          </div>
        </div>

        {/* rendimento REALIZADO 15d — a cascata honesta */}
        <div className="mt-4 rounded-2xl border border-edge-soft bg-panel-solid p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-2">Rendeu nos últimos {win} dias</p>
            <span className="rounded-md bg-panel-2 px-2 py-0.5 text-[10px] text-muted">realizado</span>
          </div>

          {hasReturn ? (
            <>
              <div className="mt-2">
                <span className="font-display tnum text-3xl font-bold" style={{ color: (ret ?? 0) < 0 ? 'var(--color-rose)' : 'var(--color-safe)' }}>
                  {retLabel}
                </span>
                <span className="ml-2 text-xs text-muted-2">em {win} dias · ≈ {(pool.net_annual_15d ?? 0).toFixed(0)}%/ano</span>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <CascadeRow label="Fee (quem troca paga)" value={`+${fmtPct(pool.fee_return_15d, 2)}`} tone="pos" />
                {pool.reward_return_15d ? (
                  <CascadeRow label="Incentivo (emissão)" value={`+${fmtPct(pool.reward_return_15d, 2)}`} tone="pos" tag="temporário" />
                ) : null}
                <CascadeRow label="Perda impermanente" value={pool.il_15d ? `−${fmtPct(pool.il_15d, 2)}` : '0%'} tone="neg" />
                <div className="!mt-2 border-t border-edge-soft pt-2">
                  <CascadeRow label={`RENDEU (em ${win} dias)`} value={retLabel} tone="net" />
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-2">
                Número <span className="text-safe">realizado</span> (aconteceu de verdade) na janela de {win} dias, já{' '}
                <span className="text-safe">líquido de IL</span>. O "%/ano" é só uma projeção.
                {volatile && volBandTxt && (
                  <> ⚠ <span className="text-rose">Varia muito</span>: nesses {win} dias oscilou de <b>{volBandTxt}</b> ao ano.</>
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {pool.il_risk === 'yes' ? (
                <>
                  Esta pool <span className="text-rose">tem risco de IL</span> e ainda não medimos o IL dela — mostramos só
                  o <span className="text-gold">reportado ({fmtPct(pool.apy_base)})</span> e <b>não fingimos</b> que é líquido.
                </>
              ) : (
                <>Reportado: <span className="text-gold">{fmtPct(pool.apy_base)}</span>.</>
              )}
            </p>
          )}
        </div>

        {/* números */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric label="Já aplicado aqui" value={fmtUsd(pool.tvl_usd)} />
          {pool.exposure === 'single' ? (
            <Metric label="Tipo" value="Empréstimo" />
          ) : (
            <>
              <Metric label="Volume 24h" value={fmtUsd(pool.volume_usd_24h)} />
              {pool.fee_tier != null && <Metric label="Taxa da troca" value={`${(pool.fee_tier * 100).toFixed(2)}%`} />}
            </>
          )}
          <Metric label="Fonte do dado" value={pool.provenance} />
        </div>
        {pool.exposure === 'single' && (
          <p className="mt-2 text-xs leading-relaxed text-muted-2">
            💡 Oportunidade de <b className="text-ftext">empréstimo</b>: você deposita e rende juros — não é uma pool de troca,
            por isso não tem "volume" nem "taxa de troca".
          </p>
        )}

        {/* nota honesta de CL (Fase C pendente) */}
        {(pool.exposure === 'multi' || isNT) && (
          <p className="mt-4 rounded-xl border border-dashed border-edge p-3 text-xs leading-relaxed text-muted-2">
            ⚠ Em liquidez concentrada o número assume a posição <b>dentro do range</b> (fora do range = 0 fee). Backtest de
            range e custos de rebalanceamento entram no próximo refinamento — não fingimos precisão que ainda não temos.
          </p>
        )}

        {isNT && (
          <p className="mt-4 rounded-xl bg-iris/10 p-3 text-xs text-iris-bright ring-1 ring-iris/20">
            ⬢ Pool Nortoken — dados lidos direto da blockchain (preço, volume e posição travada). Nossa vantagem injusta.
          </p>
        )}
      </aside>
    </div>
  );
}

function CascadeRow({ label, value, tone, tag }: { label: string; value: string; tone: 'pos' | 'neg' | 'net'; tag?: string }) {
  const color = tone === 'net' ? 'var(--color-gold)' : tone === 'neg' ? 'var(--color-rose)' : 'var(--color-ftext)';
  return (
    <div className="flex items-center justify-between">
      <span className={tone === 'net' ? 'font-semibold text-ftext' : 'text-muted'}>
        {label}
        {tag && <span className="ml-2 rounded bg-rose/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose">{tag}</span>}
      </span>
      <span className="font-display tnum font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: 'gold' | 'iris' | 'muted' }) {
  const color = accent === 'gold' ? 'text-gold' : accent === 'iris' ? 'text-iris-bright' : 'text-ftext';
  return (
    <div className="rounded-xl border border-edge-soft bg-panel-solid p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-2">{label}</p>
      <p className={`font-display tnum mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function SourceTag({ source }: { source: Pool['source'] }) {
  return source === 'nortoken' ? (
    <span className="rounded-md bg-iris/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-iris-bright ring-1 ring-iris/30">
      ⬢ Nortoken
    </span>
  ) : (
    <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-2 ring-1 ring-edge">
      Externa
    </span>
  );
}
