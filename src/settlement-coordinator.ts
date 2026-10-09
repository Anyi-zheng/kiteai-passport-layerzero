import {
  parsePaymentHeader,
  type PaymentAuthorization,
} from "./passport.js";

export type SettlementResult = {
  paymentId: string;
  receipt: unknown;
  cached: boolean;
};

type CompletedSettlement = {
  expiresAt: number;
  receipt: unknown;
};

/**
 * Prevents an API retry or two concurrent requests from settling the same
 * authorization more than once. Only successful settlements are cached.
 */
export class SettlementCoordinator {
  private readonly completed = new Map<string, CompletedSettlement>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly settleAuthorization: (
      authorization: PaymentAuthorization,
    ) => Promise<unknown>,
    private readonly ttlMs = 5 * 60_000,
    private readonly maxCompleted = 1_000,
    private readonly now: () => number = Date.now,
  ) {
    if (
      !Number.isFinite(ttlMs) ||
      ttlMs <= 0 ||
      !Number.isInteger(maxCompleted) ||
      maxCompleted <= 0
    ) {
      throw new Error("Settlement cache limits must be positive");
    }
  }

  async settle(header: string): Promise<SettlementResult> {
    const { authorization, paymentId } = parsePaymentHeader(header);
    this.removeExpired();

    const completed = this.completed.get(paymentId);
    if (completed) {
      return { paymentId, receipt: completed.receipt, cached: true };
    }

    const existing = this.inFlight.get(paymentId);
    if (existing) {
      return { paymentId, receipt: await existing, cached: true };
    }

    const request = this.settleAuthorization(authorization);
    this.inFlight.set(paymentId, request);
    try {
      const receipt = await request;
      this.remember(paymentId, receipt);
      return { paymentId, receipt, cached: false };
    } finally {
      this.inFlight.delete(paymentId);
    }
  }

  private removeExpired(): void {
    const time = this.now();
    for (const [paymentId, settlement] of this.completed) {
      if (settlement.expiresAt <= time) {
        this.completed.delete(paymentId);
      }
    }
  }

  private remember(paymentId: string, receipt: unknown): void {
    while (this.completed.size >= this.maxCompleted) {
      const oldest = this.completed.keys().next().value as string | undefined;
      if (!oldest) break;
      this.completed.delete(oldest);
    }
    this.completed.set(paymentId, {
      expiresAt: this.now() + this.ttlMs,
      receipt,
    });
  }
}
