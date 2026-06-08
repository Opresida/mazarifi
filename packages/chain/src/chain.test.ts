import { describe, it, expect } from 'vitest';
import type { Address } from 'viem';
import { poolIdFor, poolKeyFor, priceFromSqrtX96, POOL_FEE, TICK_SPACING } from './pool';
import { anchorVolumeFromProtocolFee } from './swaps';

const TOKEN_A = '0x746510ea9440f40e649266806196094e624Dffc6' as Address;
const TOKEN_B = '0x10e0a34B8e3CC08e3ac471663629193cC1605534' as Address;
const OTHER_HOOK = '0xDA4e860FFD739F8A63851E19Be1AafA5D8B480CC' as Address;

describe('pool — poolKey / poolId (sem rede)', () => {
  it('poolKey: ETH é currency0, fee 3000, tickSpacing 60', () => {
    const k = poolKeyFor(TOKEN_A);
    expect(k.currency0).toBe('0x0000000000000000000000000000000000000000');
    expect(k.currency1).toBe(TOKEN_A);
    expect(k.fee).toBe(POOL_FEE);
    expect(k.tickSpacing).toBe(TICK_SPACING);
  });
  it('poolId é determinístico, único por token e tem 32 bytes', () => {
    expect(poolIdFor(TOKEN_A)).toBe(poolIdFor(TOKEN_A));
    expect(poolIdFor(TOKEN_A)).not.toBe(poolIdFor(TOKEN_B));
    expect(poolIdFor(TOKEN_A)).toMatch(/^0x[0-9a-f]{64}$/);
  });
  it('hook diferente → poolId diferente', () => {
    expect(poolIdFor(TOKEN_A)).not.toBe(poolIdFor(TOKEN_A, OTHER_HOOK));
  });
});

describe('pool — preço a partir de sqrtPriceX96 (PURA)', () => {
  it('sqrtP = 2^96 → preço 1', () => {
    expect(priceFromSqrtX96(2n ** 96n)).toBeCloseTo(1, 9);
  });
  it('sqrtP = 2·2^96 → preço 4', () => {
    expect(priceFromSqrtX96(2n * 2n ** 96n)).toBeCloseTo(4, 6);
  });
});

describe('swaps — volume a partir do fee de protocolo (PURA)', () => {
  it('0,002 ETH de protocolFee ⇒ 1 ETH de volume (0,2%)', () => {
    expect(anchorVolumeFromProtocolFee(2_000_000_000_000_000n)).toBe(1_000_000_000_000_000_000n);
  });
});
