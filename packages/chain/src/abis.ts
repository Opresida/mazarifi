/** ABIs mínimas pra leitura (read-only) das pools Nortoken. */

/** StateView.getSlot0(poolId) → (sqrtPriceX96, tick, protocolFee, lpFee). */
export const STATE_VIEW_ABI = [
  {
    type: 'function',
    name: 'getSlot0',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
    ],
  },
] as const;

/** Evento do hook: volume/fees REAIS por swap na pool Nortoken (ground-truth). */
export const SWAP_TRACKED_EVENT = {
  type: 'event',
  name: 'SwapTracked',
  inputs: [
    { name: 'poolId', type: 'bytes32', indexed: true },
    { name: 'sender', type: 'address', indexed: true },
    { name: 'feeCurrency', type: 'address', indexed: false },
    { name: 'protocolFee', type: 'uint256', indexed: false },
    { name: 'clientFee', type: 'uint256', indexed: false },
  ],
} as const;

/** Lock: `locks(uint256)` (o getter INCLUI a PoolKey `key` como 1º campo) + `nextLockId`. */
export const LOCK_ABI = [
  {
    type: 'function',
    name: 'locks',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
      { name: 'projectOwner', type: 'address' },
      { name: 'principalLiquidity', type: 'uint128' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'minTick', type: 'int24' },
      { name: 'maxTick', type: 'int24' },
      { name: 'unlockTime', type: 'uint64' },
      { name: 'keeper', type: 'address' },
      { name: 'active', type: 'bool' },
    ],
  },
  { type: 'function', name: 'nextLockId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

/** Factory: descoberta de tokens/posições Nortoken. */
export const FACTORY_ABI = [
  { type: 'function', name: 'isNortoken', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'getCreatorTokens', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'address[]' }] },
] as const;
