import { useCallback, useEffect, useState } from 'react';
import { chainCfg } from './chains';

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

/** Garante que a carteira está na chain certa (troca/adiciona a rede se preciso). */
export async function switchToChain(chainName: string): Promise<void> {
  if (!window.ethereum) throw new Error('Sem carteira');
  const cfg = chainCfg(chainName);
  const cid = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
  if (cid?.toLowerCase() === cfg.chainIdHex.toLowerCase()) return;
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: cfg.chainIdHex }] });
  } catch (e) {
    if ((e as { code?: number })?.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId: cfg.chainIdHex, chainName: cfg.chainName, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [cfg.rpc], blockExplorerUrls: [cfg.explorer] }],
      });
    } else throw e;
  }
}

/** Leitura on-chain (eth_call) — read-only. */
export async function ethCall(to: string, data: string): Promise<string> {
  if (!window.ethereum) throw new Error('Sem carteira');
  return (await window.ethereum.request({ method: 'eth_call', params: [{ to, data }, 'latest'] })) as string;
}

/** Envia 1 transação pra carteira ASSINAR (não-custodial). Retorna o hash. */
export async function sendTx(tx: { to: string; data: string; value?: string }): Promise<string> {
  if (!window.ethereum) throw new Error('Sem carteira');
  const from = localStorage.getItem('mz_addr');
  if (!from) throw new Error('Conecte a carteira');
  const value = tx.value && tx.value !== '0' ? '0x' + BigInt(tx.value).toString(16) : '0x0';
  return (await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ from, to: tx.to, data: tx.data, value }] })) as string;
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
