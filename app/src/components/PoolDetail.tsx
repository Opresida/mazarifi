import type { Pool, NetworkInfo } from '../types';
import { fmtUsd, fmtUsdExact, fmtPct, fmtAgo, riskBand } from '../lib/format';
import { poolEntryCostPct, poolGasUsd, managedInfo } from '../lib/pool';
import { RiskBadge } from './RiskBadge';

export function PoolDetail({ pool, net = null, onClose }: { pool: Pool; net?: NetworkInfo | null; onClose: () => void }) {
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
        <PoolDetailContent pool={pool} net={net} />
      </aside>
    </div>
  );
}

/** Conteúdo reutilizável — usado no drawer e na página do ativo (`/pool/:key`). */
export function PoolDetailContent({ pool, net = null }: { pool: Pool; net?: NetworkInfo | null }) {
  const isNT = pool.source === 'nortoken';
  const managed = managedInfo(pool);
  const hasReturn = pool.return_15d != null;
  const entryCost = poolEntryCostPct(pool);
  const gasUsd = poolGasUsd(pool, net);
  const gasTxt = gasUsd > 0 ? (gasUsd >= 0.01 ? fmtUsdExact(gasUsd) : `$${gasUsd.toFixed(4)}`) : '—';
  const hasReward = pool.reward_return_15d != null && pool.reward_return_15d > 0;
  const floor = (pool.fee_return_15d ?? 0) - (pool.il_15d ?? 0); // rendimento SEM o incentivo (fee − IL)
  const b = riskBand(pool.risk_score);
  const win = pool.window_days ?? 15;
  const ret = pool.return_15d;
  const retLabel = ret != null ? `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%` : '—';
  const volBandTxt = pool.vol_low != null && pool.vol_high != null ? `${Math.round(pool.vol_low)}% a ${Math.round(pool.vol_high)}%` : null;
  const volatile = pool.vol_low != null && pool.vol_high != null && pool.vol_low > 0 && pool.vol_high > pool.vol_low * 2.5;

  return (
    <>
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

        {managed ? (
          /* pool GERENCIADA: a Beefy cuida do range → mostramos o APY do vault (não a cascata fee/IL) */
          <div className="mt-4 rounded-2xl border border-iris/30 bg-iris/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-iris">APY gerenciado</p>
              <span className="rounded-md bg-panel-2 px-2 py-0.5 text-[10px] text-muted">estimativa</span>
            </div>
            <div className="mt-2">
              <span className="font-display tnum text-3xl font-bold text-iris">{(pool.net_annual_15d ?? pool.apy_base ?? 0).toFixed(1)}%</span>
              <span className="ml-2 text-xs text-muted-2">ao ano</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-2">
              ⚙ <b className="text-ftext">A {managed.manager} cuida do range</b> e faz auto-compound pra você — taxa de{' '}
              <b>{managed.managerFeePct}%</b> sobre o rendimento, já embutida nesse APY. Pool <b>concentrada</b> · o número{' '}
              <span className="text-rose">pode variar bastante</span> (APY de pool concentrada oscila). Liquidez do pool:{' '}
              <b>{fmtUsd(pool.tvl_usd)}</b>.
            </p>
          </div>
        ) : (
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
                  <CascadeRow
                    label={`Incentivo${pool.reward_symbol ? ` (em ${pool.reward_symbol})` : ' (emissão)'}`}
                    value={`+${fmtPct(pool.reward_return_15d, 2)}`}
                    tone="pos"
                    tag="temporário"
                  />
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
        )}

        {/* incentivo: informar a SOLIDEZ do token, não assustar à toa */}
        {hasReward &&
          (() => {
            const ri = pool.reward_integrity;
            const label = ri?.label ?? 'Razoável';
            const sym = pool.reward_symbol ?? 'um token';
            const tone =
              label === 'Sólido'
                ? { box: 'border-safe/30 bg-safe/8 text-safe', emoji: '🟢', head: 'token sólido' }
                : label === 'Cuidado'
                  ? { box: 'border-rose/30 bg-rose/8 text-rose', emoji: '🔴', head: 'cuidado com esse token' }
                  : { box: 'border-gold/30 bg-gold/8 text-gold', emoji: '🟡', head: 'token razoável' };
            const facts: string[] = [];
            if (ri?.mcapUsd) facts.push(`${fmtUsd(ri.mcapUsd)} de mercado`);
            if (ri?.confidence != null) facts.push(`liquidez ${Math.round(ri.confidence * 100)}%`);
            if (ri?.ageDays != null) facts.push(ri.ageDays >= 365 ? `${Math.floor(ri.ageDays / 365)}+ ano(s) no mercado` : `${Math.round(ri.ageDays / 30)} meses no mercado`);
            if (ri?.verified) facts.push('contrato verificado');
            if (ri?.knownProtocol) facts.push('protocolo conhecido');
            return (
              <div className={`mt-3 rounded-2xl border p-4 text-xs leading-relaxed ${tone.box}`}>
                <p className="font-semibold">
                  {tone.emoji} Incentivo pago em <span className="text-ftext">{sym}</span> — {tone.head}.
                </p>
                {facts.length > 0 && <p className="mt-1 opacity-90">{facts.join(' · ')}.</p>}
                <p className="mt-1.5 opacity-90">
                  {label === 'Sólido' ? (
                    <>Mesmo sólido, o incentivo é separado do principal — dá pra <b>realizar (vender {sym})</b> de tempos em tempos pra travar o ganho.</>
                  ) : (
                    <>Incentivo é <b>frágil</b>: você precisa <b>vender {sym}</b> (mais swap + gás) e ele <b>pode cair</b>. Se a emissão secar, some.</>
                  )}
                </p>
                <p className="mt-2 rounded-lg bg-ink/40 px-2.5 py-1.5 text-ftext">
                  Sem o incentivo (só fee − IL), rendeu <b className="text-safe">{`${floor >= 0 ? '+' : ''}${floor.toFixed(2)}%`}</b> nesses {win} dias — o piso seguro.
                </p>
                <p className="mt-1.5 text-[10px] text-muted-2">Auditoria não é verificável on-chain — confira no site do projeto.</p>
              </div>
            );
          })()}

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
        {/* CUSTOS — transparência total: TODO custo listado aqui */}
        <div className="mt-4 rounded-2xl border border-gold/25 bg-gold/8 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold">💸 Custos — transparência total</p>
          <div className="mt-2.5 space-y-2 text-sm">
            <CostRow label="Perda impermanente" note="já descontada do rendimento" value={pool.il_15d ? `−${fmtPct(pool.il_15d, 2)}` : '0%'} />
            {entryCost > 0 ? (
              <CostRow label="Swap pra montar/desmontar o par" note="uma vez, na entrada + saída" value={`~${entryCost.toFixed(2)}%`} />
            ) : (
              <CostRow label="Swap de entrada" note="empréstimo não tem (só deposita)" value="—" muted />
            )}
            <CostRow
              label="Gás de rede"
              note={net ? `${(net.gas_price_gwei ?? 0).toFixed(4)} gwei · ao vivo · atualizado ${fmtAgo(net.updated_at)}` : 'indisponível'}
              value={gasTxt}
            />
            {entryCost > 0 && <CostRow label="Slippage (impacto no preço)" note="depende do valor — avisamos no projetor se for grande" value="variável" muted />}
            <CostRow label="Taxa da Mazari Fi" note="taxa única na entrada; saída grátis" value="0,30% na entrada" muted />
          </div>
          <p className="mt-2.5 border-t border-gold/15 pt-2 text-[11px] leading-relaxed text-gold/80">
            Gás é fixo em dólar (uns centavos na Base) → pesa mais em valor pequeno. O projetor já soma <b>swap + gás</b> no "se paga em ~N dias".
          </p>
        </div>

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
    </>
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

function CostRow({ label, value, note, muted }: { label: string; value: string; note?: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted">
        {label}
        {note && <span className="mt-0.5 block text-[10px] leading-snug text-muted-2">{note}</span>}
      </span>
      <span className={`shrink-0 font-display tnum font-semibold ${muted ? 'text-muted-2' : 'text-ftext'}`}>{value}</span>
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
