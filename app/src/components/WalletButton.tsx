import { Wallet } from 'lucide-react';
import { useWallet } from '../lib/wallet';

export function WalletButton() {
  const { address, short, connect, connecting, disconnect } = useWallet();
  if (address) {
    return (
      <button
        onClick={disconnect}
        title="Desconectar"
        className="flex items-center gap-2 rounded-xl border border-edge bg-card px-3 py-2 text-sm text-ftext hover:border-lime/40"
      >
        <span className="h-2 w-2 rounded-full bg-lime" />
        <span className="tnum">{short}</span>
      </button>
    );
  }
  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="flex items-center gap-2 rounded-xl bg-lime px-3.5 py-2 text-sm font-semibold text-ink hover:bg-lime-bright disabled:opacity-60"
    >
      <Wallet size={16} />
      {connecting ? 'Conectando…' : 'Entrar com carteira'}
    </button>
  );
}
