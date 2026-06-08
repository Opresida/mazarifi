import type { Address } from 'viem';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

/** Endereços do trio v4 do Nortoken na Base Sepolia (com taxa condicional). */
export const BASE_SEPOLIA = {
  chainId: 84532,
  poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as Address,
  stateView: '0x571291b572ed32ce6751a2Cb2486EbEe8DEfB9B4' as Address,
  hook: '0xA39cb2daE62F788195CCdB147155eae9915580CC' as Address,
  lock: '0x82644C1BCA7dB9707C77f6eA8A4984624d350f45' as Address,
  factory: '0x08De01b7A9a31357f85411Cc526A972E3b1B9917' as Address,
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  explorer: 'https://sepolia.basescan.org',
} as const;
