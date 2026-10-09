import { createHash } from "node:crypto";
import { z } from "zod";

const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const MAX_PAYMENT_HEADER_LENGTH = 32_768;
const MAX_AUTHORIZATION_BYTES = 16_384;

export type PaymentAuthorization = Record<string, unknown>;

export function paymentRequired(
  input: {
    payee: string;
    asset: string;
    amount: string;
    network: string;
    resource: string;
    facilitatorUrl: string;
  },
  description: string,
) {
  const parsed = {
    ...input,
    payee: address.parse(input.payee),
    asset: address.parse(input.asset),
    amount: z.string().regex(/^\d+$/).parse(input.amount),
    resource: z.string().url().parse(input.resource),
    facilitatorUrl: z.string().url().parse(input.facilitatorUrl),
  };

  return {
    x402Version: 1,
    error: "X-PAYMENT header is required",
    accepts: [
      {
        scheme: "gokite-aa",
        network: parsed.network,
        maxAmountRequired: parsed.amount,
        resource: parsed.resource,
        description,
        mimeType: "application/json",
        payTo: parsed.payee,
        asset: parsed.asset,
        maxTimeoutSeconds: 300,
        merchantName: "KiteAI Passport LayerZero Service",
      },
    ],
  };
}

export function parsePaymentHeader(header: string): {
  authorization: PaymentAuthorization;
  paymentId: string;
} {
  const encoded = header.trim();
  if (!encoded || encoded.length > MAX_PAYMENT_HEADER_LENGTH) {
    throw new Error("X-PAYMENT header has an invalid size");
  }
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(encoded)) {
    throw new Error("X-PAYMENT header is not valid base64");
  }

  const bytes = Buffer.from(encoded, "base64url");
  if (!bytes.length || bytes.length > MAX_AUTHORIZATION_BYTES) {
    throw new Error("Payment authorization has an invalid size");
  }

  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Payment authorization is not valid JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Payment authorization must be a JSON object");
  }

  return {
    authorization: value as PaymentAuthorization,
    paymentId: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    return await fetch(url, { ...init, signal });
  } catch (error) {
    if (signal.aborted) {
      throw new Error(`Facilitator request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

export async function settleAuthorization(
  authorization: PaymentAuthorization,
  facilitatorUrl: string,
  network: string,
  timeoutMs = 10_000,
): Promise<unknown> {
  const body = JSON.stringify({ authorization, network });
  const request = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  } satisfies RequestInit;

  const verify = await fetchWithTimeout(
    `${facilitatorUrl}/v2/verify`,
    request,
    timeoutMs,
  );
  if (!verify.ok) {
    throw new Error(`Payment verification failed (${verify.status})`);
  }

  const verification = (await verify.json()) as { isValid?: boolean };
  if (!verification.isValid) {
    throw new Error("Payment authorization is invalid");
  }

  const response = await fetchWithTimeout(
    `${facilitatorUrl}/v2/settle`,
    request,
    timeoutMs,
  );
  if (!response.ok) {
    throw new Error(`Payment settlement failed (${response.status})`);
  }
  return response.json();
}

export async function settle(
  header: string,
  facilitatorUrl: string,
  network: string,
): Promise<unknown> {
  const { authorization } = parsePaymentHeader(header);
  return settleAuthorization(authorization, facilitatorUrl, network);
}
