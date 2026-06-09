import { useEffect, useState } from 'react';
import { Compass, Wallet } from 'lucide-react';
import type { NetworkInfo } from '../types';
import { fetchNetwork } from '../api';
import { Shell, type NavItem } from '../components/Shell';
import { PositionsSection } from '../components/PositionsSection';
import { WalletButton } from '../components/WalletButton';

const NAV: NavItem[] = [
  { path: '/dashboard', label: 'Oportunidades', icon: Compass },
  { path: '/minhas-aplicacoes', label: 'Minha aplicação', icon: Wallet },
];

export function MinhaAplicacaoPage() {
  const [net, setNet] = useState<NetworkInfo | null>(null);
  useEffect(() => {
    fetchNetwork()
      .then(setNet)
      .catch(() => {});
  }, []);
  return (
    <Shell nav={NAV} topRight={<WalletButton />}>
      <h1 className="font-display text-2xl font-bold text-ftext">Minhas aplicações</h1>
      <p className="mt-1 text-sm text-muted">O que você tem aplicado nas pools, na Base — com o valor de hoje e o botão de sacar.</p>
      <div className="mt-5">
        <PositionsSection net={net} />
      </div>
    </Shell>
  );
}
