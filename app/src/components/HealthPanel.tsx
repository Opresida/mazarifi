import { useState, useEffect } from 'react';
import { Bot, Check } from 'lucide-react';
import { fetchAutopilot, quoteMigrate, type AutopilotItem, type AutopilotResult } from '../lib/autopilot';
import { isPro, setProPreview } from '../lib/pro';
import { switchToChain, sendTx } from '../lib/wallet';
import { approveToken, tokenAllowance } from '../lib/zap';
import { friendlyError } from '../lib/txError';
import { perfUsd, healthScore, recoveryAnalysis, type Health } from '../lib/health';
import { costBasis, clearPosition, recordDeposit } from '../lib/ledger';
import { decline, shouldShow, wasDeclined } from '../lib/proposals';
import { fmtUsd } from '../lib/format';

const BAND = {
  saudavel: { label: 'Saudável', color: 'text-lime', bar: 'bg-lime', ring: 'border-lime/30' },
  atencao: { label: 'Atenção', color: 'text-amber', bar: 'bg-amber', ring: 'border-amber/30' },
  vermelho: { label: 'Linha vermelha', color: 'text-rose', bar: 'bg-rose', ring: 'border-rose/30' },
} as const;

/** Saúde da Aplicação (Pro): por posição mostra saúde, performance, IL e — quando precisa — a análise ficar-vs-trocar. Não-custodial. */
export function HealthPanel({ address }: { address: string | null }) {
  const [pro, setPro] = useState(() => isPro(address));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AutopilotResult | null>(null);

  const reload = () => { if (address) fetchAutopilot(address).then(setData).catch(() => {}); };
  useEffect(() => { setPro(isPro(address)); }, [address]);
  useEffect(() => {
    if (!address || !pro) { setData(null); return; }
    setLoading(true);
    fetchAutopilot(address).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, pro]);

  if (!address) return null;

  if (!pro) {
    return (
      <div className="rounded-2xl border border-amber/25 bg-gradient-to-br from-amber/[0.08] to-transparent p-5">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-amber" />
          <span className="font-display font-bold text-ftext">Saúde da Aplicação</span>
          <span className="rounded bg-amber/15 px-1.5 text-[10px] font-bold uppercase text-amber">Pro</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A Mazari acompanha cada aplicação sua — quanto rende ou perde, o estado de IL, e se vale trocar pra uma pool melhor. Você aprova; a gente executa em 1 clique. Disponível no <b className="text-amber">Mazari Pro</b>.
        </p>
        <button onClick={() => { setProPreview(true); setPro(true); }} className="mt-3 rounded-lg border border-amber/40 px-3 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/10">
          Ativar preview (teste)
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-lime/25 bg-gradient-to-br from-lime/[0.05] to-transparent p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-lime" />
          <span className="font-display font-bold text-ftext">Saúde da Aplicação</span>
          <span className="rounded bg-lime/15 px-1.5 text-[10px] font-bold uppercase text-lime">Pro · preview</span>
        </div>
        <button onClick={() => { setProPreview(false); setPro(false); }} className="text-[11px] text-muted-2 hover:text-muted">desativar</button>
      </div>

      {loading && <p className="mt-3 text-sm text-muted">Analisando suas aplicações…</p>}

      {!loading && data && data.items.length === 0 && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {data.total > 0 ? 'Você tem posições, mas ainda não consigo casá-las com as pools que cubro.' : 'Quando você aplicar pela Mazari, eu analiso a saúde de cada posição aqui.'} A gente continua de olho 24/7.
        </p>
      )}

      {!loading && data && data.items.map((it) => <HealthCard key={`${it.from.chain}:${it.from.token}`} it={it} address={address} onChanged={reload} />)}

      <p className="mt-3 text-[10px] leading-relaxed text-muted-2">
        A decisão é sempre sua — a Mazari mostra a análise e executa quando você aprova. Nunca move seu dinheiro sozinha.
      </p>
    </div>
  );
}

function HealthCard({ it, address, onChanged }: { it: AutopilotItem; address: string; onChanged: () => void }) {
  const cb = costBasis(it.from.token, it.from.chain);
  const costUsd = cb?.costUsd ?? null;
  const health = healthScore({ ...it.metrics, valueUsd: it.from.valueUsd, costUsd });
  const perf = perfUsd(it.from.valueUsd, it.metrics.return15d);
  const band = BAND[health.band];
  const daysIn = cb ? Math.floor((Date.now() - cb.ts) / 86400_000) : null;
  const pnlUsd = costUsd != null ? it.from.valueUsd - costUsd : null;

  const hasBest = !!(it.best && it.advice);
  const proposalVisible = hasBest && shouldShow(it.from.token, it.from.chain) && (health.band === 'vermelho' || it.advice!.worthSwitch);
  const rec = hasBest
    ? recoveryAnalysis({ valueUsd: it.from.valueUsd, costUsd, bestAnnualPct: it.best!.annualPct, curAnnualPct: it.from.annualPct, switchCostUsd: it.advice!.switchCostUsd })
    : null;

  return (
    <div className={`mt-3 rounded-xl border ${band.ring} bg-ink/40 p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ftext">{it.from.symbol ?? it.from.protocol ?? 'Posição'}</p>
          <p className="font-mono text-[11px] text-muted-2">{fmtUsd(it.from.valueUsd)} · {it.from.type}</p>
        </div>
        <span className={`font-mono inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${band.color}`}>● {band.label} · {health.score}</span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-edge">
        <div className={`h-full rounded-full ${band.bar} transition-all`} style={{ width: `${health.score}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <PerfCell label="hoje" usd={perf.dayUsd} />
        <PerfCell label="quinzena" usd={perf.fortnightUsd} />
        <PerfCell label="mês" usd={perf.monthUsd} />
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        {pnlUsd != null ? (
          <>Desde que você entrou{daysIn != null ? ` (${daysIn}d)` : ''}: <b className={pnlUsd >= 0 ? 'text-lime' : 'text-rose'}>{pnlUsd >= 0 ? '+' : ''}{fmtUsd(pnlUsd)}</b>. </>
        ) : (
          <>Aporte não registrado neste navegador. </>
        )}
        {it.metrics.il15d != null && it.metrics.il15d > 0.1 ? <>IL estimado ~{it.metrics.il15d.toFixed(1)}%.</> : null}
      </p>

      {proposalVisible && rec && <Proposal it={it} rec={rec} health={health} address={address} onChanged={onChanged} reDeclined={wasDeclined(it.from.token, it.from.chain)} />}
    </div>
  );
}

function PerfCell({ label, usd }: { label: string; usd: number }) {
  const pos = usd >= 0;
  return (
    <div className="rounded-lg bg-ink/50 py-1.5 text-center">
      <p className={`font-mono tnum text-sm font-semibold ${pos ? 'text-lime' : 'text-rose'}`}>{pos ? '+' : ''}{fmtUsd(usd)}</p>
      <p className="text-[9px] uppercase tracking-wide text-muted-2">{label}</p>
    </div>
  );
}

function Proposal({ it, rec, health, address, onChanged, reDeclined }: { it: AutopilotItem; rec: ReturnType<typeof recoveryAnalysis>; health: Health; address: string; onChanged: () => void; reDeclined: boolean }) {
  const [st, setSt] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const red = health.band === 'vermelho' && rec.perdaRealizadaUsd > 0;

  async function approve() {
    setErr(null);
    setSt('busy');
    try {
      await switchToChain(it.from.chain);
      const q = await quoteMigrate(it.from.token, it.from.amount, it.best!.poolKey, address);
      if (!q.supported || !q.to || !q.data || !q.spender) { setErr('Troca indisponível em 1 clique agora — em breve.'); setSt('idle'); return; }
      const need = BigInt(it.from.amount);
      if ((await tokenAllowance(address, q.spender, it.from.token, it.from.chain)) < need) {
        await approveToken(it.from.token, q.spender);
        for (let i = 0; i < 25; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          if ((await tokenAllowance(address, q.spender, it.from.token, it.from.chain)) >= need) break;
        }
      }
      await sendTx({ to: q.to, data: q.data, value: q.value });
      clearPosition(it.from.token, it.from.chain);
      if (q.lpTarget) recordDeposit(q.lpTarget, it.from.chain, it.from.valueUsd);
      setSt('done');
      setTimeout(onChanged, 4000);
    } catch (e) {
      setErr(friendlyError(e));
      setSt('idle');
    }
  }

  if (st === 'done') {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-lime/30 bg-lime/5 p-3 text-sm text-lime">
        <Check size={15} /> Troca enviada! Em instantes seu dinheiro estará na pool melhor.
      </div>
    );
  }

  return (
    <div className={`mt-3 rounded-xl border p-3 ${red ? 'border-rose/30 bg-rose/[0.06]' : 'border-lime/25 bg-lime/5'}`}>
      <p className="text-[13px] font-semibold text-ftext">
        {reDeclined ? 'Nova análise' : red ? 'Sua aplicação entrou na linha vermelha' : 'Achei uma pool melhor pra você'}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        {red && <>Você está <b className="text-rose">{fmtUsd(-rec.perdaRealizadaUsd)}</b> abaixo do que aportou (perda no preço/IL). </>}
        Trocar pra <b className="text-lime">{it.best!.symbol ?? it.best!.project}</b> rende <b className="text-ftext">{it.best!.annualPct.toFixed(1)}%/ano</b> (vs {it.from.annualPct.toFixed(1)}% hoje)
        {red ? (
          <>: você realiza a perda agora + ~{fmtUsd(it.advice!.switchCostUsd)} de custo, mas o ganho a mais <b className="text-ftext">recupera em ~{rec.breakEvenDias} dias</b> e depois é lucro. Ficar mantém a chance de recuperar sem realizar — mas <b>depende dos preços voltarem</b>, ninguém garante.</>
        ) : (
          <>, se pagando em ~{it.advice!.paybackDays} dias.</>
        )}
      </p>
      <p className="mt-1.5 text-[11px] text-muted-2">
        Nossa leitura: <b className={rec.lean === 'trocar' ? 'text-lime' : 'text-amber'}>{rec.lean === 'trocar' ? 'trocar tende a compensar' : 'segurar tende a ser melhor por ora'}</b>. A decisão é sua.
      </p>
      {err && <p className="mt-1.5 text-xs text-rose">{err}</p>}
      <div className="mt-2.5 flex gap-2">
        <button onClick={approve} disabled={st === 'busy'} className="flex-1 rounded-lg bg-lime px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-lime-bright disabled:opacity-60">
          {st === 'busy' ? 'Trocando…' : 'Aprovar a troca'}
        </button>
        <button onClick={() => { decline(it.from.token, it.from.chain); onChanged(); }} disabled={st === 'busy'} className="rounded-lg border border-edge px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-ftext disabled:opacity-60">
          Não agora
        </button>
      </div>
    </div>
  );
}
