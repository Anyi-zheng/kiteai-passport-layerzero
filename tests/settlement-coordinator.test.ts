import assert from "node:assert/strict";
import test from "node:test";
import { parsePaymentHeader } from "../src/passport.js";
import { SettlementCoordinator } from "../src/settlement-coordinator.js";

function paymentHeader(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

test("parses an authorization and creates a stable payment id", () => {
  const header = paymentHeader({ nonce: "kite-42", amount: "1000000" });
  const first = parsePaymentHeader(header);
  const second = parsePaymentHeader(header);

  assert.deepEqual(first.authorization, {
    nonce: "kite-42",
    amount: "1000000",
  });
  assert.match(first.paymentId, /^[a-f0-9]{64}$/);
  assert.equal(first.paymentId, second.paymentId);
});

test("rejects malformed payment headers before contacting the facilitator", () => {
  assert.throws(() => parsePaymentHeader("not valid!"), /valid base64/);
  assert.throws(
    () => parsePaymentHeader(Buffer.from("[]").toString("base64url")),
    /JSON object/,
  );
});

test("rejects invalid cache limits", () => {
  const settle = async () => ({ ok: true });
  assert.throws(
    () => new SettlementCoordinator(settle, Number.NaN),
    /limits must be positive/,
  );
  assert.throws(
    () => new SettlementCoordinator(settle, 100, 0),
    /limits must be positive/,
  );
});

test("coalesces concurrent settlement attempts", async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const coordinator = new SettlementCoordinator(async () => {
    calls += 1;
    await gate;
    return { transaction: "0xabc" };
  });
  const header = paymentHeader({ nonce: "same-payment" });

  const first = coordinator.settle(header);
  const retry = coordinator.settle(header);
  release();

  const [firstResult, retryResult] = await Promise.all([first, retry]);
  assert.equal(calls, 1);
  assert.equal(firstResult.cached, false);
  assert.equal(retryResult.cached, true);
  assert.deepEqual(firstResult.receipt, retryResult.receipt);
});

test("caches successes but retries failures and expired entries", async () => {
  let now = 1_000;
  let calls = 0;
  const coordinator = new SettlementCoordinator(
    async () => {
      calls += 1;
      if (calls === 1) throw new Error("temporary failure");
      return { attempt: calls };
    },
    100,
    10,
    () => now,
  );
  const header = paymentHeader({ nonce: "retryable" });

  await assert.rejects(coordinator.settle(header), /temporary failure/);
  const success = await coordinator.settle(header);
  const cached = await coordinator.settle(header);
  assert.equal(success.cached, false);
  assert.equal(cached.cached, true);
  assert.equal(calls, 2);

  now += 101;
  const expired = await coordinator.settle(header);
  assert.equal(expired.cached, false);
  assert.equal(calls, 3);
});
