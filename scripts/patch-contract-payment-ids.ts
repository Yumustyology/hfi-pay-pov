/**
 * scripts/patch-contract-payment-ids.ts
 *
 * One-time script to backfill contractPaymentId for intents
 * where it is null or 0 by re-parsing the on-chain txHash.
 *
 * Run: npx ts-node --project tsconfig.json scripts/patch-contract-payment-ids.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { ethers } from "ethers";
import { ESCROW_ABI } from "../contracts/abi";

const MONGODB_URI = process.env.MONGODB_URI!;
const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";

const IntentSchema = new mongoose.Schema({
  reference: String,
  txHash: String,
  contractPaymentId: Number,
  status: String,
}, { strict: false });
const Intent = mongoose.models.Intent ?? mongoose.model("Intent", IntentSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const iface = new ethers.Interface(ESCROW_ABI);

  // Find all intents where contractPaymentId is missing or 0
  const broken = await Intent.find({
    $or: [
      { contractPaymentId: null },
      { contractPaymentId: 0 },
    ],
    txHash: { $exists: true, $ne: null },
  });

  console.log(`Found ${broken.length} intents to patch`);

  for (const intent of broken) {
    try {
      const receipt = await provider.getTransactionReceipt(intent.txHash);
      if (!receipt || receipt.status !== 1) {
        console.warn(`  [SKIP] ${intent.reference} — tx not confirmed`);
        continue;
      }

      let paymentId: number | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed && parsed.name === "PaymentCreated") {
            paymentId = Number(parsed.args[0]);
            break;
          }
        } catch {}
      }

      if (paymentId === undefined) {
        console.warn(`  [SKIP] ${intent.reference} — PaymentCreated event not found`);
        continue;
      }

      await Intent.findByIdAndUpdate(intent._id, { contractPaymentId: paymentId });
      console.log(`  [OK] ${intent.reference} → contractPaymentId = ${paymentId}`);
    } catch (e: any) {
      console.error(`  [ERR] ${intent.reference}:`, e.message);
    }
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(console.error);
