import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface LayerZeroMessagingFee {
  nativeFee: bigint;
  lzTokenFee: bigint;
}

export interface EndpointRouteParam {
  srcEid: number;
  dstEid: number;
  receiver: string;
  payloadLength: number;
}

export class LayerZeroFeeEstimator {
  private baseGas: bigint;
  private byteCost: bigint;

  constructor(baseGas = 100_000n, byteCost = 200n) {
    this.baseGas = baseGas;
    this.byteCost = byteCost;
  }

  public estimateFee(params: EndpointRouteParam): LayerZeroMessagingFee {
    if (params.payloadLength < 0) {
      throw new Error('payloadLength cannot be negative');
    }
    const computedGas = this.baseGas + BigInt(params.payloadLength) * this.byteCost;
    // Mock native fee calculation in wei based on 20 gwei gas price
    const nativeFee = computedGas * 20_000_000_000n;
    return {
      nativeFee,
      lzTokenFee: 0n,
    };
  }

  public validateEndpointCompatibility(srcEid: number, dstEid: number): boolean {
    // Valid cross-chain pairings: Kite (30268) <-> Arbitrum (30110)
    const validEids = new Set([30268, 30110, 2368, 42161]);
    return validEids.has(srcEid) && validEids.has(dstEid) && srcEid !== dstEid;
  }
}
