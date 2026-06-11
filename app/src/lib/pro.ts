import { isAdminAddress } from './wallet';

/** Mazari Pro — gating do Autopilot/auto-switch.
 *  PREVIEW: admin OU flag local (`mz_pro`). Substituir pela cobrança real quando o billing existir (ver docs/RECEITA.md #3). */
const KEY = 'mz_pro';

export function isPro(address: string | null): boolean {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1') return true;
  return isAdminAddress(address);
}

export function setProPreview(on: boolean): void {
  if (typeof localStorage === 'undefined') return;
  if (on) localStorage.setItem(KEY, '1');
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('mz-pro'));
}
