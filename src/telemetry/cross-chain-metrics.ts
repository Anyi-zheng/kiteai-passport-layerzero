export interface LayerZeroPacketMetrics {
  srcChainId: number;
  dstChainId: number;
  nonce: number;
  dispatchedAt: number;
  confirmedAt?: number;
}

export class CrossChainMetricsTracker {
  private inFlightPackets = new Map<string, LayerZeroPacketMetrics>();

  public recordDispatch(srcChainId: number, dstChainId: number, nonce: number): void {
    const key = `${srcChainId}:${dstChainId}:${nonce}`;
    this.inFlightPackets.set(key, {
      srcChainId,
      dstChainId,
      nonce,
      dispatchedAt: Date.now(),
    });
  }

  public recordConfirmation(srcChainId: number, dstChainId: number, nonce: number): number | null {
    const key = `${srcChainId}:${dstChainId}:${nonce}`;
    const packet = this.inFlightPackets.get(key);
    if (!packet) return null;

    const latencyMs = Date.now() - packet.dispatchedAt;
    this.inFlightPackets.delete(key);
    return latencyMs;
  }
}
