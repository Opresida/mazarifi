/** Smoke de integração (read-only): prova que getPoolPrice lê o preço de uma pool real.
 *  Usa uma pool Nortoken EXISTENTE (smoke v3) passando o hook antigo. */
import type { Address } from 'viem';
import { getPoolPrice, poolIdFor } from '../src/pool.js';

const TOKEN = '0x60AE68C10bf1581d6D23c0B5Ebb6490ab765fdA5' as Address; // pool do smoke v3
const OLD_HOOK = '0xDA4e860FFD739F8A63851E19Be1AafA5D8B480CC' as Address;

const pid = poolIdFor(TOKEN, OLD_HOOK);
console.log('poolId:', pid);
const price = await getPoolPrice(TOKEN, OLD_HOOK);
console.log('preço (tokens por ETH):', price);
console.log(price != null ? 'OK — reader lê preço on-chain' : 'pool sem preço (ou inexistente)');
