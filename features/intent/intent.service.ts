/**
 * features/intent/intent.service.ts
 *
 * The heart of HFI Pay. All business logic for payment intents lives here.
 * API routes are thin orchestrators — they call this service and return its result.
 *
 * Factory pattern: createIntentService() accepts injected dependencies so this
 * code can migrate to NestJS (or any DI framework) without changes.
 */

import connectDB from "@/lib/mongodb";
import { Intent } from "@/models/Intent";
import { Notification } from "@/models/Notification";
import User from "@/models/User";
import { generateReference } from "@/lib/reference";
import { resolveIdentifier } from "@/features/relay/relay.service";
import { sendPaymentEmail, sendClaimConfirmationEmail } from "@/lib/email/brevo";
import { decryptEmail } from "@/lib/relay-crypto";
import type {
  CreateIntentInput,
  ClaimIntentInput,
  RefundIntentInput,
  IntentResult,
} from "./intent.types";

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createIntent(
  input: CreateIntentInput
): Promise<{ ok: true; data: IntentResult } | { ok: false; error: string; status: number }> {
  await connectDB();

  const { senderWallet, recipientEmail, amount, txHash, contractPaymentId } = input;

  // Validate
  if (!senderWallet || !recipientEmail || !amount || !txHash) {
    return { ok: false, error: "Missing required fields", status: 400 };
  }

  // Find sender
  const sender = await User.findOne({
    walletAddress: { $regex: new RegExp(`^${senderWallet}$`, "i") },
  });
  if (!sender) {
    return { ok: false, error: "Sender wallet not registered with HFI Pay", status: 400 };
  }

  // Resolve recipient via relay service
  const resolved = await resolveIdentifier(recipientEmail);
  if (!resolved) {
    return { ok: false, error: "Recipient email not registered with HFI Pay", status: 404 };
  }

  // Prevent duplicate txHash
  const existing = await Intent.findOne({ txHash });
  if (existing) {
    return { ok: false, error: "Transaction already recorded", status: 409 };
  }

  // Load full recipient document (need _id for notifications)
  const recipient = await User.findOne({ walletAddress: resolved.walletAddress });
  if (!recipient) {
    return { ok: false, error: "Recipient not found", status: 404 };
  }

  const reference = generateReference();

  // Save intent
  const intent = await Intent.create({
    reference,
    senderUserId: sender._id,
    recipientUserId: recipient._id,
    senderWallet: senderWallet.toLowerCase(),
    recipientWallet: recipient.walletAddress,
    recipientEmail: recipientEmail.trim().toLowerCase(),
    amount,
    txHash,
    contractPaymentId: contractPaymentId ?? null,
    status: "FUNDED",
  });

  // In-app notifications
  await Notification.insertMany([
    {
      type: "payment_received",
      userId: recipient._id,
      intentId: intent._id,
      title: "💰 Incoming Payment",
      message: `${sender.displayName} sent you ${amount} ETH. Reference: ${reference}.`,
    },
    {
      type: "payment_sent",
      userId: sender._id,
      intentId: intent._id,
      title: "✅ Payment Locked",
      message: `You sent ${amount} ETH to ${recipientEmail}. Reference: ${reference}.`,
    },
  ]);

  // Email — decrypt the recipient's email from the relay store
  let emailSent = false;
  try {
    const plainEmail = decryptEmail(recipient.encryptedEmail);
    const emailResult = await sendPaymentEmail({
      recipientEmail: plainEmail,
      recipientName: recipient.displayName,
      senderName: sender.displayName ?? "HFI Pay User",
      amount,
      reference,
      intentId: intent._id.toString(),
    });
    if (emailResult.success) {
      emailSent = true;
      await Intent.findByIdAndUpdate(intent._id, { status: "EMAIL_SENT" });
    }
  } catch (err) {
    console.error("[intentService.create] email send failed:", err);
  }

  return {
    ok: true,
    data: {
      reference,
      status: emailSent ? "EMAIL_SENT" : "FUNDED",
      amount,
      txHash,
      contractPaymentId: contractPaymentId ?? null,
    },
  };
}

// ─── Claim ────────────────────────────────────────────────────────────────────

export async function claimIntent(
  input: ClaimIntentInput
): Promise<{ ok: true; data: IntentResult } | { ok: false; error: string; status: number }> {
  await connectDB();

  const { reference, claimantWallet, txHash } = input;

  if (!reference) return { ok: false, error: "Missing reference", status: 400 };

  const intent = await Intent.findOne({ reference });
  if (!intent) return { ok: false, error: "Intent not found", status: 404 };

  if (intent.status === "CLAIMED") {
    return { ok: false, error: "Payment already claimed", status: 400 };
  }
  if (intent.status === "REFUNDED") {
    return { ok: false, error: "Payment was refunded", status: 400 };
  }

  // Verify wallet ownership
  if (claimantWallet.toLowerCase() !== intent.recipientWallet.toLowerCase()) {
    return { ok: false, error: "Wrong wallet — this payment belongs to a different address", status: 403 };
  }

  intent.status = "CLAIMED";
  if (txHash) intent.claimTxHash = txHash;
  await intent.save();

  // Notifications
  await Notification.insertMany([
    {
      type: "payment_claimed",
      userId: intent.senderUserId,
      intentId: intent._id,
      title: "💸 Funds Claimed",
      message: `Your payment of ${intent.amount} ETH (ref: ${reference}) has been claimed.`,
    },
    {
      type: "payment_claimed",
      userId: intent.recipientUserId,
      intentId: intent._id,
      title: "✅ Claim Successful",
      message: `You claimed ${intent.amount} ETH (ref: ${reference}).`,
    },
  ]);

  // Send claim confirmation to sender (non-blocking)
  try {
    const sender = await User.findById(intent.senderUserId);
    const recipient = await User.findById(intent.recipientUserId);
    if (sender?.encryptedEmail) {
      const senderEmail = decryptEmail(sender.encryptedEmail);
      sendClaimConfirmationEmail({
        senderEmail,
        senderName: sender.displayName ?? "HFI Pay User",
        recipientName: recipient?.displayName ?? "Recipient",
        amount: intent.amount,
        reference,
        txHash: txHash ?? intent.claimTxHash ?? "",
      }).catch((err: unknown) => console.error("[intentService.claim] email failed:", err));
    }
  } catch (err) {
    console.error("[intentService.claim] claim email error:", err);
  }

  return {
    ok: true,
    data: {
      reference,
      status: "CLAIMED",
      amount: intent.amount,
      txHash: txHash ?? intent.claimTxHash,
    },
  };
}

// ─── Refund ───────────────────────────────────────────────────────────────────

export async function refundIntent(
  input: RefundIntentInput
): Promise<{ ok: true; data: IntentResult } | { ok: false; error: string; status: number }> {
  await connectDB();

  const { reference, requesterWallet, txHash } = input;

  if (!reference) return { ok: false, error: "Missing reference", status: 400 };

  const intent = await Intent.findOne({ reference });
  if (!intent) return { ok: false, error: "Intent not found", status: 404 };

  if (intent.status === "CLAIMED") {
    return { ok: false, error: "Payment already claimed — cannot refund", status: 400 };
  }
  if (intent.status === "REFUNDED") {
    return { ok: false, error: "Payment already refunded", status: 400 };
  }

  // Only sender can refund
  if (requesterWallet.toLowerCase() !== intent.senderWallet.toLowerCase()) {
    return { ok: false, error: "Only the sender can refund this payment", status: 403 };
  }

  intent.status = "REFUNDED";
  if (txHash) intent.refundTxHash = txHash;
  await intent.save();

  await Notification.create({
    type: "payment_refunded",
    userId: intent.senderUserId,
    intentId: intent._id,
    title: "↩️ Funds Refunded",
    message: `You refunded ${intent.amount} ETH (ref: ${reference}) back to your wallet.`,
  });

  return {
    ok: true,
    data: {
      reference,
      status: "REFUNDED",
      amount: intent.amount,
      txHash: txHash ?? intent.refundTxHash,
    },
  };
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getUserHistory(walletAddress: string) {
  await connectDB();

  const user = await User.findOne({
    walletAddress: { $regex: new RegExp(`^${walletAddress}$`, "i") },
  });

  if (!user) return [];

  return Intent.find({
    $or: [{ senderUserId: user._id }, { recipientUserId: user._id }],
  })
    .sort({ createdAt: -1 })
    .populate("senderUserId", "displayName walletAddress")
    .populate("recipientUserId", "displayName walletAddress");
}

// ─── Find single ─────────────────────────────────────────────────────────────

export async function findIntent(reference: string) {
  await connectDB();
  return Intent.findOne({ reference })
    .populate("senderUserId", "displayName walletAddress")
    .populate("recipientUserId", "displayName walletAddress");
}
