import "dotenv/config";
import express from "express";
import { paymentRequired, settleAuthorization } from "./passport.js";
import { SettlementCoordinator } from "./settlement-coordinator.js";

const app = express();
app.use(express.json());

const network = process.env.PASSPORT_NETWORK ?? "kite-testnet";
const facilitator =
  process.env.FACILITATOR_URL ?? "https://facilitator.pieverse.io";
const settlementCacheMs = Number(
  process.env.SETTLEMENT_CACHE_MS ?? 5 * 60_000,
);
const coordinator = new SettlementCoordinator(
  (authorization) =>
    settleAuthorization(authorization, facilitator, network),
  settlementCacheMs,
);

app.get("/health", (_, res) =>
  res.json({ ok: true, service: "kiteai-passport-layerzero" }),
);

app.get("/api/paid-resource", async (req, res) => {
  const header = req.header("X-PAYMENT");
  if (!header) {
    return res.status(402).json(
      paymentRequired(
        {
          payee:
            process.env.PAYEE_WALLET ??
            "0x0000000000000000000000000000000000000000",
          asset:
            process.env.PAYMENT_ASSET ??
            "0x0000000000000000000000000000000000000000",
          amount: process.env.PAYMENT_AMOUNT ?? "1000000",
          network,
          resource: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
          facilitatorUrl: facilitator,
        },
        "Paid KiteAI service response",
      ),
    );
  }

  try {
    const settlement = await coordinator.settle(header);
    return res.json({ ok: true, ...settlement, result: "paid resource" });
  } catch (error) {
    return res.status(402).json({
      error: error instanceof Error ? error.message : "Payment failed",
    });
  }
});

app.listen(Number(process.env.PORT ?? 8787), () =>
  console.log("Passport payment service ready"),
);
