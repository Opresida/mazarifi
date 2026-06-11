import { useEffect, useState } from 'react';
import { Bot, Sparkles, ArrowRight, Check } from 'lucide-react';
import { fetchAutopilot, quoteMigrate, type AutopilotSuggestion, type AutopilotResult } from '../lib/autopilot';
import { isPro, setProPreview } from '../lib/pro';
import { switchToChain, sendTx } from '../lib/wallet';
import { approveToken, tokenAllowance } from '../lib/zap';
import { friendlyError } from '../lib/txError';

/** Autopilot assistido (Pro): vigia as posições e troca em 1 clique pra uma pool melhor. Não-custodial (você assina). */
export function AutopilotPanel({ address }: { address: string | null }) {
  const [pro, setPro] = useState(() => isPro(address));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AutopilotResult | null>(null);

  useEffect(() => { setPro(isPro(address)); }, [address]);
  useEffect(() => {
    if (!address || !pro) { setData(null); return; }
    setLoading(true);
    fetchAutopilot(address).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [address, pro]);

  if (!address) return null;

  if (!pro) {
    return (
      <div className="rounded-2xl border border-amber/25 bg-gradient-to-br from-amber/[0.08] to-transparent p-5">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-amber" />
          <span className="font-display font-bold text-ftext">Autopilot</span>
          <span className="rounded bg-amber/15 px-1.5 text-[10px] font-bold uppercase text-amber">Pro</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A gente vigia suas aplicações 24/7 e, quando aparece uma pool melhor, te avisa e troca em <b className="text-ftext">1 clique</b> — você só assina. Disponível no <b className="text-amber">Mazari Pro</b>.
        </p>
        <button onClick={() => { setProPreview(true); setPro(true); }} className="mt-3 rounded-lg border border-amber/40 px-3 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/10">
          Ativar preview (teste)
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-lime/25 bg-gradient-to-br from-lime/[0.06] to-transparent p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-lime" />
          <span className="font-display font-bold text-ftext">Autopilot</span>
          <span className="rounded bg-lime/15 px-1.5 text-[10px] font-bold uppercase text-lime">Pro · preview</span>
        </div>
        <button onClick={() => { setProPreview(false); setPro(false); }} className="text-[11px] text-muted-2 hover:text-muted">desativar</button>
      </div>

      {loading && <p className="mt-3 text-sm text-muted">Vasculhando as melhores pools pra você…</p>}

      {!loading && data && data.suggestions.length === 0 && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          ✓ <b className="text-lime">Tudo otimizado.</b> {data.total > 0 ? `Suas ${data.total} aplicações já estão no melhor lugar.` : 'Quando você tiver aplicações, eu fico de olho.'} A gente continua vigiando 24/7.
        </p>
      )}

      {!loading && data && data.suggestions.map((s) => (
        <SwitchCard key={s.from.token} s={s} address={address} onDone={() => fetchAutopilot(address).then(setData).catch(() => {})} />
      ))}

      <p className="mt-3 text-[10px] leading-relaxed text-muted-2">
        Você assina cada troca — a Mazari nunca move seu dinheiro sozinha. Taxa de auto-switch <b className="text-amber">0,20%</b> (+ 0,30% de entrada na nova pool).
      </p>
    </div>
  );
}

function SwitchCard({ s, address, onDone }: { s: AutopilotSuggestion; address: string; onDone: () => void }) {
  const [st, setSt] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function doSwitch() {
    setErr(null);
    setSt('busy');
    try {
      await switchToChain(s.from.chain);
      const q = await quoteMigrate(s.from.token, s.from.amount, s.to.poolKey, address);
      if (!q.supported || !q.to || !q.data || !q.spender) {
        setErr('Essa troca ainda não dá pra montar em 1 clique — em breve.');
        setSt('idle');
        return;
      }
      const need = BigInt(s.from.amount);
      if ((await tokenAllowance(address, q.spender, s.from.token, s.from.chain)) < need) {
        await approveToken(s.from.token, q.spender);
        for (let i = 0; i < 25; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          if ((await tokenAllowance(address, q.spender, s.from.token, s.from.chain)) >= need) break;
        }
      }
      await sendTx({ to: q.to, data: q.data, value: q.value });
      setSt('done');
      setTimeout(onDone, 4000);
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
    <div className="mt-3 rounded-xl border border-edge bg-ink/40 p-3.5">
      <div className="flex items-center gap-1.5 text-sm font-medium text-ftext">
        <Sparkles size={14} className="text-lime" /> Achei uma pool melhor pra você
      </div>
      <div className="font-mono mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{s.from.symbol ?? s.from.protocol ?? 'sua pool'} · {s.from.annualPct.toFixed(1)}%/ano</span>
        <ArrowRight size={14} className="text-lime" />
        <span className="font-semibold text-lime">{s.to.symbol ?? s.to.project} · {s.to.annualPct.toFixed(1)}%/ano</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        <b className="text-ftext">+{s.deltaPct.toFixed(1)}% ao ano</b> (≈ +${s.extraGainUsdYear.toFixed(0)}/ano nos seus ${s.from.valueUsd.toFixed(0)}) · a troca se paga em ~{s.paybackDays} dias.
      </p>
      {err && <p className="mt-2 text-xs text-rose">{err}</p>}
      <button onClick={doSwitch} disabled={st === 'busy'} className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-lime px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:bg-lime-bright disabled:opacity-60">
        {st === 'busy' ? 'Trocando…' : 'Trocar agora (1 clique)'} {st !== 'busy' && <ArrowRight size={13} />}
      </button>
    </div>
  );
}
