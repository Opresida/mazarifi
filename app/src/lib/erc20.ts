/** Encode mínimo de chamadas ERC20 (sem libs pesadas) — pra approve/allowance/balance via window.ethereum. */
const pad = (hex: string) => hex.replace(/^0x/, '').toLowerCase().padStart(64, '0');
const toHex = (n: bigint) => pad(n.toString(16));

export const MAX_UINT = (1n << 256n) - 1n;

export function encodeApprove(spender: string, amount: bigint): string {
  return '0x095ea7b3' + pad(spender) + toHex(amount); // approve(address,uint256)
}
export function encodeAllowance(owner: string, spender: string): string {
  return '0xdd62ed3e' + pad(owner) + pad(spender); // allowance(address,address)
}
export function encodeBalanceOf(owner: string): string {
  return '0x70a08231' + pad(owner); // balanceOf(address)
}
