import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, ExternalLink, Wallet } from 'lucide-react';
import type { NetworkMap, Position } from '../types';
import { fetchPositions } from '../api';
import { useWallet, switchToChain, sendTx } from '../lib/wallet';
import { quoteWithdraw, tokenAllowance, approveToken, type WithdrawQuote } from '../lib/zap';
import { chainCfg } from '../lib/chains';
import { friendlyError } from '../lib/txError';
import { Card } from './atoms';
import { fmtUsd } from '../lib/format';
import { WalletButton } from './WalletButton';

export function PositionsSection({ net }: { net: NetworkMap | null }) {
  const { address } = useWallet();
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [loading, setLoading] = useState(false);

  function reload() {
    if (!address) return;
    setLoading(true);
    fetchPositions(address)
      .then(setPositions)
      .catch(() => setPositions([]))
      .finally(() => setLoading(false));
  }
  useEffect(reload, [address]);

  if (!address) {
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center">
        <Wallet size={24} className="text-muted-2" />
        <p className="text-sm text-muted">Conecte sua carteira para ver e gerenciar suas posições.</p>
        <div className="mt-1"><WalletButton /></div>
      </Card>
    );
  }
  if (loading && !positions) return <Card className="p-8 text-center text-sm text-muted-2">Lendo sua carteira na Base…</Card>;
  if (!positions || positions.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center">
        <Wallet size={24} className="text-muted-2" />
        <p className="text-sm text-muted">Nenhuma posição em pools encontrada nessa carteira (na Base).</p>
        <p className="text-[11px] text-muted-2">Aplicou em alguma oportunidade? Ela aparece aqui depois de confirmar na rede.</p>
      </Card>
    );
  }
  const total = positions.reduce((s, p) => s + p.valueUsd, 0);
  return (
    <div>
      <p className="mb-2 text-sm text-muted">Total nas pools: <b className="font-display text-ftext">{fmtUsd(total)}</b></p>
      <div className="grid gap-3 sm:grid-cols-2">
        {positions.map((p) => (
          <WithdrawCard key={p.token} position={p} address={address} net={net} onDone={reload} />
        ))}
      </div>
    </div>
  );
}

type St = 'idle' | 'quoting' | 'ready' | 'approving' | 'withdrawing' | 'done';

function WithdrawCard({ position, address, net, onDone }: { position: Position; address: string; net: NetworkMap | null; onDone: () => void }) {
  const [st, setSt] = useState<St>('idle');
  const [quote, setQuote] = useState<WithdrawQuote | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const pchain = position.chain ?? 'Base';
  const n = net?.[pchain];
  const outUsd = quote?.amountOut ? Number(quote.amountOut) / 1e6 : null;
  const impactPct = quote?.priceImpact != null ? quote.priceImpact / 100 : null;
  const gasUsd = quote?.gas && n?.gas_price_gwei && n?.eth_usd ? (Number(quote.gas) * n.gas_price_gwei) / 1e9 * n.eth_usd : null;

  async function doQuote() {
    setErr(null);
    setSt('quoting');
    try {
      const q = await quoteWithdraw(position.token, position.amount, address, pchain);
      if (!q.supported) {
        setErr(`Saque indisponível (${q.reason}).`);
        setSt('idle');
        return;
      }
      setQuote(q);
      setSt('ready');
    } catch (e) {
      setErr(friendlyError(e));
      setSt('idle');
    }
  }

  async function pollAllowance(spender: string, need: bigint) {
    for (let i = 0; i < 25; i++) {
      if ((await tokenAllowance(address, spender, position.token)) >= need) return true;
      await new Promise((r) => setTimeout(r, 3000));
    }
    return false;
  }

  async function doWithdraw() {
    if (!quote?.to || !quote.data || !quote.spender) return;
    setErr(null);
    try {
      await switchToChain(pchain);
      const need = BigInt(position.amount);
      if ((await tokenAllowance(address, quote.spender, position.token)) < need) {
        setSt('approving');
        await approveToken(position.token, quote.spender);
        if (!(await pollAllowance(quote.spender, need))) {
          setErr('A aprovação ainda não confirmou — espere uns segundos e clique Sacar de novo.');
          setSt('ready');
          return;
        }
      }
      setSt('withdrawing');
      const hash = await sendTx({ to: quote.to, data: quote.data, value: quote.value });
      setTxHash(hash);
      setSt('done');
      setTimeout(onDone, 4000);
    } catch (e) {
      setErr(friendlyError(e));
      setSt('ready');
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display font-semibold text-ftext">{position.symbol || position.name || 'Posição'}</p>
          <p className="truncate text-[11px] text-muted-2">{position.protocol ?? 'pool'}</p>
        </div>
        <p className="shrink-0 font-display tnum text-base font-semibold text-lime">{fmtUsd(position.valueUsd)}</p>
      </div>

      {st === 'done' ? (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-lime"><CheckCircle2 size={14} /> Saque enviado!</p>
          {txHash && <a href={`${chainCfg(pchain).explorer}/tx/${txHash}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-lime hover:text-lime-bright">Ver no {chainCfg(pchain).explorerName} <ExternalLink size={12} /></a>}
        </div>
      ) : st === 'ready' || st === 'approving' || st === 'withdrawing' ? (
        <>
          <p className="mt-2 rounded-lg border border-edge bg-ink/40 p-2.5 text-[11px] leading-relaxed text-muted">
            Sacar tudo → recebe <b className="text-ftext">~${outUsd?.toFixed(2)} USDC</b> (já líquido). Impacto ~{impactPct?.toFixed(2)}% · gás {gasUsd != null ? `~$${gasUsd.toFixed(3)}` : '—'}
            {quote?.feeBps ? <> · <span className="text-gold">taxa Mazari {(quote.feeBps / 100).toFixed(2)}%</span></> : null} · não-custodial.
          </p>
          <button onClick={doWithdraw} disabled={st === 'approving' || st === 'withdrawing'} className="mt-2 w-full rounded-xl bg-lime px-4 py-2 text-sm font-semibold text-ink hover:bg-lime-bright disabled:opacity-60">
            {st === 'approving' ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Aprovando…</span>
              : st === 'withdrawing' ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Confirme na carteira…</span>
              : 'Confirmar saque'}
          </button>
        </>
      ) : (
        <button onClick={doQuote} disabled={st === 'quoting'} className="mt-3 w-full rounded-xl border border-edge px-4 py-2 text-sm font-semibold text-ftext hover:border-lime/40 disabled:opacity-60">
          {st === 'quoting' ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Calculando…</span> : 'Sacar pra USDC'}
        </button>
      )}
      {err && <p className="mt-2 flex items-start gap-1.5 text-[11px] text-rose"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {err}</p>}
    </Card>
  );
}
