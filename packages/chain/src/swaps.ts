import type { Hex } from 'viem';
import { publicClient } from './client';
import { BASE_SEPOLIA } from './deployments';
import { SWAP_TRACKED_EVENT } from './abis';

/** O protocolo cobra 0,2% (1/500) no âncora → volume = protocolFee × 500. PURA. */
export function anchorVolumeFromProtocolFee(protocolFeeWei: bigint): bigint {
  return protocolFeeWei * 500n;
}

export interface SwapStats {
  swapCount: number;
  protocolFeeWei: bigint; // fee do protocolo (0,2%) capturado no âncora
  clientFeeWei: bigint; // fee do projeto
  anchorVolumeWei: bigint; // volume REAL do âncora reconstruído dos fees
}

/** Volume/fees REAIS de uma pool Nortoken num intervalo de blocos (eventos SwapTracked). */
export async function getSwapStats(
  poolId: Hex,
  fromBlock: bigint,
  toBlock: bigint | 'latest' = 'latest',
): Promise<SwapStats> {
  const logs = await publicClient.getLogs({
    address: BASE_SEPOLIA.hook,
    event: SWAP_TRACKED_EVENT,
    args: { poolId },
    fromBlock,
    toBlock,
  });
  let protocolFeeWei = 0n;
  let clientFeeWei = 0n;
  for (const l of logs) {
    protocolFeeWei += (l.args.protocolFee as bigint | undefined) ?? 0n;
    clientFeeWei += (l.args.clientFee as bigint | undefined) ?? 0n;
  }
  return {
    swapCount: logs.length,
    protocolFeeWei,
    clientFeeWei,
    anchorVolumeWei: anchorVolumeFromProtocolFee(protocolFeeWei),
  };
}
