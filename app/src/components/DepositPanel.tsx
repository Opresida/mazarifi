import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { Loader2, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';
import type { Pool, NetworkMap } from '../types';
import { useWallet, switchToChain, sendTx } from '../lib/wallet';
import { quoteZap, usdcAllowance, approveUsdc, tokenAllowance, approveToken, type ZapQuote } from '../lib/zap';
import { fetchFundingSources, sourceAmountForUsd, quoteCrossDeposit, type FundingSource, type CrossDepositQuote } from '../lib/bridge';
import { managedInfo } from '../lib/pool';
import { chainCfg, NATIVE } from '../lib/chains';
import { friendlyError } from '../lib/txError';
import { recordDeposit } from '../lib/ledger';
import { Card } from './atoms';

type St = 'idle' | 'quoting' | 'ready' | 'unsupported' | 'approving' | 'depositing' | 'done';

export function DepositPanel({ pool, net }: { pool: Pool; net: NetworkMap | null }) {
  const { address, connect, connecting } = useWallet();
  const [amount, setAmount] = useState(5);
  const [st, setSt] = useState<St>('idle');
  const [quote, setQuote] = useState<ZapQuote | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const n = net?.[pool.chain];
  const impactPct = quote?.priceImpact != null ? quote.priceImpact / 100 : null;
  const gasUsd = quote?.gas && n?.gas_price_gwei && n?.eth_usd ? (Number(quote.gas) * n.gas_price_gwei) / 1e9 * n.eth_usd : null;
  const highImpact = impactPct != null && impactPct > 1;

  // AUTO: "a Mazari resolve" — acha o dinheiro do usuário em QUALQUER rede/ativo conhecido e aponta de onde trazer.
  const [sources, setSources] = useState<FundingSource[] | null>(null);
  const loadSources = useCallback(async () => {
    if (address) setSources(await fetchFundingSources(address));
  }, [address]);
  useEffect(() => { loadSources(); }, [loadSources]);

  // USDC já na rede da pool? (caminho normal, sem ponte)
  const poolUsdc = sources?.find((s) => s.chain === pool.chain && s.symbol === 'USDC')?.amountUsd ?? 0;
  // melhor fonte em OUTRA rede (qualquer ativo conhecido), por valor
  const bestSource = (sources ?? []).filter((s) => s.chain !== pool.chain).sort((a, b) => b.amountUsd - a.amountUsd)[0];
  // precisa trazer de fora: não tem USDC bastante na rede da pool, mas tem dinheiro em outra rede
  const needsBridge = !!address && sources != null && poolUsdc < amount && !!bestSource;

  async function doQuote() {
    if (!address) return;
    setErr(null);
    setQuote(null);
    setSt('quoting');
    try {
      const q = await quoteZap(pool.pool_key, amount, address);
      setQuote(q);
      setSt(q.supported ? 'ready' : 'unsupported');
    } catch (e) {
      setErr(friendlyError(e));
      setSt('idle');
    }
  }

  async function pollAllowance(spender: string, need: bigint) {
    for (let i = 0; i < 25; i++) {
      if ((await usdcAllowance(address!, spender, pool.chain)) >= need) return true;
      await new Promise((r) => setTimeout(r, 3000));
    }
    return false;
  }

  async function doDeposit() {
    if (!quote?.to || !quote.data || !quote.spender || !address) return;
    setErr(null);
    try {
      await switchToChain(pool.chain);
      const need = BigInt(quote.amountIn ?? '0');
      if ((await usdcAllowance(address, quote.spender, pool.chain)) < need) {
        setSt('approving');
        await approveUsdc(quote.spender, pool.chain);
        if (!(await pollAllowance(quote.spender, need))) {
          setErr('A aprovação ainda não confirmou — espere uns segundos e clique Depositar de novo.');
          setSt('ready');
          return;
        }
      }
      setSt('depositing');
      const hash = await sendTx({ to: quote.to, data: quote.data, value: quote.value });
      setTxHash(hash);
      if (quote.lpTarget) recordDeposit(quote.lpTarget, pool.chain, amount); // aporte → Saúde da Aplicação
      setSt('done');
    } catch (e) {
      setErr(friendlyError(e));
      setSt('ready');
    }
  }

  if (st === 'done') {
    return (
      <Card className="glow-lime border-lime/30 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-lime"><CheckCircle2 size={16} /> Depósito enviado!</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">Sua transação foi assinada e enviada. A posição entra assim que confirmar na rede.</p>
        <Link href="/minhas-aplicacoes" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-ink hover:bg-lime-bright">
          Acompanhar minhas aplicações <ArrowRight size={15} />
        </Link>
        {txHash && (
          <a href={`${chainCfg(pool.chain).explorer}/tx/${txHash}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ftext">
            Ver no {chainCfg(pool.chain).explorerName} <ExternalLink size={13} />
          </a>
        )}
      </Card>
    );
  }

  return (
    <Card className="glow-lime border-lime/30 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ftext"><ShieldCheck size={15} className="text-lime" /> Depositar com 1 clique</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-2">Você põe USDC <b>na rede {pool.chain}</b>, a gente troca e monta a pool. <b>Não-custodial</b>: você assina da sua carteira, a Mazari nunca toca no dinheiro.</p>

      {!address ? (
        <button onClick={connect} disabled={connecting} className="mt-3 w-full rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-ink hover:bg-lime-bright disabled:opacity-60">
          {connecting ? 'Conectando…' : 'Conectar carteira'}
        </button>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-edge bg-ink px-3">
              <span className="text-muted">$</span>
              <input
                type="number"
                value={amount}
                min={1}
                onChange={(e) => {
                  setAmount(Math.max(0, Number(e.target.value) || 0));
                  setSt('idle');
                }}
                className="w-20 bg-transparent py-2 pl-1 font-display tnum text-base text-ftext outline-none"
              />
              <span className="text-[10px] text-muted-2">USDC</span>
            </div>
            {[5, 25, 100].map((v) => (
              <button key={v} onClick={() => { setAmount(v); setSt('idle'); }} className={`rounded-lg border px-2 py-1 text-xs ${amount === v ? 'border-lime/40 bg-lime/10 text-lime' : 'border-edge text-muted'}`}>${v}</button>
            ))}
          </div>

          {st !== 'ready' && st !== 'approving' && st !== 'depositing' && (
            needsBridge && bestSource ? (
              <BridgeCard poolKey={pool.pool_key} toChain={pool.chain} source={bestSource} targetUsd={amount} address={address!} onBridged={loadSources} />
            ) : (
              <button onClick={doQuote} disabled={st === 'quoting' || !(amount > 0)} className="mt-3 w-full rounded-xl border border-lime/40 bg-lime/10 px-4 py-2.5 text-sm font-semibold text-lime hover:bg-lime/15 disabled:opacity-60">
                {st === 'quoting' ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Simulando…</span> : 'Simular depósito'}
              </button>
            )
          )}

          {st === 'unsupported' && (
            <p className="mt-3 rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs leading-relaxed text-muted">
              ⏳ <b className="text-gold">Em breve</b> — essa oportunidade ainda não está no 1 clique. As outras já estão prontas. 👍
            </p>
          )}

          {(st === 'ready' || st === 'approving' || st === 'depositing') && quote && (
            <>
              <div className="mt-3 rounded-xl border border-edge bg-ink/40 p-3 text-[11px] leading-relaxed text-muted">
                <p className="font-semibold text-ftext">Isto é o que vai acontecer:</p>
                <ul className="mt-1.5 space-y-1">
                  <li>• Você deposita <b className="text-ftext">${amount} USDC</b> → entra na posição da pool{quote.lpSymbol ? ` (${quote.lpSymbol})` : ''}.</li>
                  <li>• A Enso troca metade e monta o par (1 transação, não-custodial).</li>
                  {managedInfo(pool) && (
                    <li className="text-lime">• ⚙ <b>Gestão automática</b>: rebalanceamos o range e fazemos auto-compound pra você (via gestor parceiro auditado; taxa {managedInfo(pool)?.managerFeePct}% sobre o rendimento, já embutida).</li>
                  )}
                  {quote.feeBps ? (
                    <li>• Taxa de entrada Mazari: <b className="text-gold">{(quote.feeBps / 100).toFixed(2)}%</b> (~${(amount * quote.feeBps / 10000).toFixed(2)}, uma vez) — <b className="text-ftext">saída grátis</b>.</li>
                  ) : null}
                  <li className={highImpact ? 'text-rose' : ''}>• Impacto no preço: <b>~{impactPct?.toFixed(2)}%</b>{highImpact ? ' ⚠ alto pra essa pool — considere valor menor' : ''}.</li>
                  <li>• Gás de rede: <b>{gasUsd != null ? `~$${gasUsd.toFixed(3)}` : '—'}</b> (você paga na transação) · slippage máx 0,5%.</li>
                </ul>
                <p className="mt-2 text-[10px] leading-relaxed text-muted-2">
                  <b className="text-ftext">Transparência total:</b> o rendimento mostrado já é <b>líquido</b> das taxas do protocolo (a fonte mostra o que sobra pro depositante). Se a posição for um vault gerenciado, a taxa do gestor (ex.: Beefy ~9,5% sobre o rendimento) também já está <b>embutida no APY</b>. Nada escondido.
                </p>
                <p className="mt-2 text-[10px] text-gold">⚠ Comece com pouco ($1–5) na primeira vez. Rendimento não é garantido.</p>
              </div>
              <button onClick={doDeposit} disabled={st === 'approving' || st === 'depositing'} className="mt-3 w-full rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-ink hover:bg-lime-bright disabled:opacity-60">
                {st === 'approving' ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Aprovando USDC…</span>
                  : st === 'depositing' ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Confirme na carteira…</span>
                  : `Depositar $${amount} USDC`}
              </button>
            </>
          )}

          {err && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-rose"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {err}</p>
          )}
        </>
      )}
    </Card>
  );
}

type BSt = 'idle' | 'quoting' | 'ready' | 'approving' | 'bridging' | 'done';

/** "A Mazari resolve": achamos o dinheiro do cliente em qualquer rede/ativo conhecido → num clique, swap+ponte+investe no vault. */
function BridgeCard({ poolKey, toChain, source, targetUsd, address, onBridged }: { poolKey: string; toChain: string; source: FundingSource; targetUsd: number; address: string; onBridged: () => void }) {
  const [bst, setBst] = useState<BSt>('idle');
  const [bq, setBq] = useState<CrossDepositQuote | null>(null);
  const [berr, setBerr] = useState<string | null>(null);
  const usd = Math.min(targetUsd, source.amountUsd);
  const fromAmount = sourceAmountForUsd(source, usd);
  const isNative = source.token.toLowerCase() === NATIVE;

  async function doQuote() {
    setBerr(null);
    setBst('quoting');
    try {
      const q = await quoteCrossDeposit(poolKey, source.chain, source.token, fromAmount, address);
      if (!q.supported) { setBerr(`Indisponível em 1 clique (${q.reason}).`); setBst('idle'); return; }
      setBq(q);
      setBst('ready');
    } catch (e) {
      setBerr(friendlyError(e));
      setBst('idle');
    }
  }

  async function doDeposit() {
    if (!bq?.to || !bq.data || !bq.spender) return;
    setBerr(null);
    try {
      await switchToChain(source.chain);
      const need = BigInt(fromAmount);
      if (!isNative && (await tokenAllowance(address, bq.spender, source.token, source.chain)) < need) {
        setBst('approving');
        await approveToken(source.token, bq.spender);
        let ok = false;
        for (let i = 0; i < 25; i++) {
          if ((await tokenAllowance(address, bq.spender, source.token, source.chain)) >= need) { ok = true; break; }
          await new Promise((r) => setTimeout(r, 3000));
        }
        if (!ok) { setBerr('A aprovação não confirmou — clique de novo.'); setBst('ready'); return; }
      }
      setBst('bridging');
      await sendTx({ to: bq.to, data: bq.data, value: bq.value });
      if (bq.lpTarget) recordDeposit(bq.lpTarget, toChain, bq.depositUsd ?? usd); // aporte → Saúde da Aplicação
      setBst('done');
      setTimeout(onBridged, 35000); // ~30s pro dinheiro atravessar e entrar no vault no destino
    } catch (e) {
      setBerr(friendlyError(e));
      setBst('ready');
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-lime/30 bg-lime/5 p-3 text-[11px] leading-relaxed text-muted">
      {bst === 'done' ? (
        <p className="text-lime">✅ <b>Em ~{bq?.durationS ?? 30}s seu dinheiro entra direto no vault da {toChain}</b> — 1 assinatura, mais nada. Acompanhe em "Minhas aplicações".</p>
      ) : (
        <>
          <p>💡 <b className="text-ftext">A Mazari achou seu dinheiro: ${source.amountUsd.toFixed(2)} em {source.symbol} ({source.chain})</b>. A gente traz pra <b className="text-ftext">{toChain}</b> <b className="text-ftext">e investe no vault — tudo num clique, você não faz nada manual.</b></p>
          {bq && (
            <p className="mt-1.5">Usa ~<b className="text-ftext">${usd.toFixed(2)}</b> de {source.symbol} → investe ~<b className="text-ftext">${bq.depositUsd?.toFixed(2)}</b> no vault · ~{bq.durationS ?? 30}s{bq.feePct ? ` · taxa Mazari ${bq.feePct.toFixed(2)}%` : ''} <span className="text-muted-2">(via {bq.tool})</span>.</p>
          )}
          <button
            onClick={bst === 'ready' ? doDeposit : doQuote}
            disabled={bst === 'quoting' || bst === 'approving' || bst === 'bridging'}
            className="mt-2 w-full rounded-lg bg-lime px-3 py-2 text-xs font-semibold text-ink hover:bg-lime-bright disabled:opacity-60"
          >
            {bst === 'quoting' ? <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Montando a melhor rota…</span>
              : bst === 'approving' ? <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Aprovando {source.symbol}…</span>
              : bst === 'bridging' ? <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Confirme na carteira…</span>
              : bst === 'ready' ? `Investir $${usd.toFixed(2)} com 1 clique` : `Investir com 1 clique (do seu ${source.symbol} na ${source.chain})`}
          </button>
          <p className="mt-1.5 text-[10px] text-muted-2">A Mazari cuida da rede e da troca pra você. Se a rede variar muito, seu USDC chega na {toChain} e você finaliza — nada se perde.</p>
          {berr && <p className="mt-1.5 text-rose">{berr}</p>}
        </>
      )}
    </div>
  );
}
