import { useCallback, useEffect, useState } from 'react';

/** Allowlist de admin. TODO Humberto: trocar/adicionar a SUA carteira de admin. */
const ADMIN_ALLOWLIST = ['0xB1390d94faCBc45DB9D509b7b050141C83B56055'].map((a) => a.toLowerCase());

export function isAdminAddress(addr: string | null): boolean {
  return !!addr && ADMIN_ALLOWLIST.includes(addr.toLowerCase());
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

/** Connect injetado (MetaMask/Rabby...) — sem custódia, sem libs pesadas. */
export function useWallet() {
  const [address, setAddress] = useState<string | null>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem('mz_addr') : null,
  );
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const sync = () => setAddress(localStorage.getItem('mz_addr'));
    sync();
    window.addEventListener('mz-wallet', sync);
    const eth = window.ethereum;
    const onAccounts = (...args: unknown[]) => {
      const a = (args[0] as string[] | undefined)?.[0] ?? null;
      if (a) localStorage.setItem('mz_addr', a);
      else localStorage.removeItem('mz_addr');
      window.dispatchEvent(new Event('mz-wallet'));
    };
    eth?.on?.('accountsChanged', onAccounts);
    return () => {
      window.removeEventListener('mz-wallet', sync);
      eth?.removeListener?.('accountsChanged', onAccounts);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert('Instale uma carteira (MetaMask, Rabby…) para continuar.');
      return;
    }
    setConnecting(true);
    try {
      const accs = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      const a = accs?.[0];
      if (a) {
        localStorage.setItem('mz_addr', a);
        window.dispatchEvent(new Event('mz-wallet'));
      }
    } catch {
      /* usuário cancelou */
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem('mz_addr');
    window.dispatchEvent(new Event('mz-wallet'));
  }, []);

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;
  return { address, short, connecting, connect, disconnect, isAdmin: isAdminAddress(address) };
}
