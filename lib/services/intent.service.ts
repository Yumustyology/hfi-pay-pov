/**
 * lib/services/intent.service.ts
 *
 * The heart of HFI Pay. Every intent operation goes through here.
 * API routes call one function and return its result.
 *
 * Flow for createIntent():
 *   Validate → Find sender → Find recipient → Save intent
 *   → Notifications → Send email → Return
 */

import connectDB from "@/lib/mongodb";
import { Intent } from "@/models/Intent";
import { generateReference } from "@/lib/reference";
import { findByWallet, findByEmail } from "@/lib/services/user.service";
import { createNotifications } from "@/lib/services/notification.service";
import { sendPaymentEmail, sendClaimConfirmationEmail } from "@/lib/email/brevo";

// ─── Types ────────────────────────────────────────────────────────────────────

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string; status: number };
type Result<T> = Ok<T> | Err;

function ok<T>(data: T): Ok<T> { return { ok: true, data }; }
function err(error: string, status = 400): Err { return { ok: false, error, status }; }

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createIntent(body: {
  senderWallet: string;
  recipientEmail: string;
  amount: string;
  txHash: string;
  contractPaymentId?: number;
}): Promise<Result<{ reference: string; status: string; amount: string; txHash: string }>> {
  await connectDB();

  const { senderWallet, recipientEmail, amount, txHash, contractPaymentId } = body;

  if (!senderWallet || !recipientEmail || !amount || !txHash) {
    return err("Missing required fields: senderWallet, recipientEmail, amount, txHash");
  }

  const sender = await findByWallet(senderWallet);
  if (!sender) return err("Sender wallet is not registered with HFI Pay");

  const recipient = await findByEmail(recipientEmail);
  if (!recipient) return err("Recipient email is not registered with HFI Pay", 404);

  if (sender.email === recipient.email) return err("Cannot send payment to yourself");

  const dupe = await Intent.findOne({ txHash });
  if (dupe) return err("Transaction already recorded", 409);

  const reference = generateReference();

  const intent = await Intent.create({
    reference,
    senderUserId: sender._id,
    recipientUserId: recipient._id,
    senderWallet: senderWallet.toLowerCase(),
    recipientWallet: recipient.walletAddress.toLowerCase(),
    recipientEmail: recipientEmail.trim().toLowerCase(),
    amount,
    txHash,
    contractPaymentId: contractPaymentId ?? null,
    status: "FUNDED",
  });

  // Notifications (fire and forget errors)
  try {
    await createNotifications([
      {
        type: "payment_received",
        userId: recipient._id.toString(),
        intentId: intent._id.toString(),
        title: "💰 Incoming Payment",
        message: `${sender.displayName} sent you ${amount} ETH. Ref: ${reference}.`,
      },
      {
        type: "payment_sent",
        userId: sender._id.toString(),
        intentId: intent._id.toString(),
        title: "✅ Payment Locked",
        message: `You sent ${amount} ETH to ${recipientEmail}. Ref: ${reference}.`,
      },
    ]);
  } catch (e) {
    console.error("[intentService] notification error:", e);
  }

  // Email — recipient.email is plaintext now
  let finalStatus = "FUNDED";
  try {
    const emailResult = await sendPaymentEmail({
      recipientEmail: recipient.email,
      recipientName: recipient.displayName,
      senderName: sender.displayName,
      amount,
      reference,
      intentId: intent._id.toString(),
    });
    if (emailResult.success) {
      finalStatus = "EMAIL_SENT";
      await Intent.findByIdAndUpdate(intent._id, { status: "EMAIL_SENT" });
    }
  } catch (e) {
    console.error("[intentService] email error:", e);
  }

  return ok({ reference, status: finalStatus, amount, txHash });
}

// ─── Claim ────────────────────────────────────────────────────────────────────

export async function claimIntent(body: {
  reference: string;
  claimantWallet: string;
  txHash?: string;
}): Promise<Result<{ reference: string; status: string; amount: string }>> {
  await connectDB();

  const { reference, claimantWallet, txHash } = body;
  if (!reference) return err("Missing reference");

  const intent = await Intent.findOne({ reference });
  if (!intent) return err("Intent not found", 404);
  if (intent.status === "CLAIMED") return err("Already claimed");
  if (intent.status === "REFUNDED") return err("Payment was refunded");

  if (claimantWallet.toLowerCase() !== intent.recipientWallet.toLowerCase()) {
    return err("Wrong wallet — this payment is assigned to a different address", 403);
  }

  intent.status = "CLAIMED";
  if (txHash) intent.claimTxHash = txHash;
  await intent.save();

  // Notifications
  try {
    await createNotifications([
      {
        type: "payment_claimed",
        userId: intent.senderUserId.toString(),
        intentId: intent._id.toString(),
        title: "💸 Funds Claimed",
        message: `Your payment of ${intent.amount} ETH (ref: ${reference}) was claimed.`,
      },
      {
        type: "payment_claimed",
        userId: intent.recipientUserId.toString(),
        intentId: intent._id.toString(),
        title: "✅ Claim Successful",
        message: `You claimed ${intent.amount} ETH (ref: ${reference}).`,
      },
    ]);
  } catch (e) {
    console.error("[intentService] claim notification error:", e);
  }

  // Sender confirmation email (non-blocking)
  const { findByWallet: fw } = await import("@/lib/services/user.service");
  Promise.all([
    fw(intent.senderWallet),
    fw(intent.recipientWallet),
  ]).then(([sender, recipient]) => {
    if (sender?.email) {
      sendClaimConfirmationEmail({
        senderEmail: sender.email,
        senderName: sender.displayName,
        recipientName: recipient?.displayName ?? "Recipient",
        amount: intent.amount,
        reference,
        txHash: txHash ?? intent.claimTxHash ?? "",
      }).catch(console.error);
    }
  }).catch(console.error);

  return ok({ reference, status: "CLAIMED", amount: intent.amount });
}

// ─── Refund ───────────────────────────────────────────────────────────────────

export async function refundIntent(body: {
  reference: string;
  requesterWallet: string;
  txHash?: string;
}): Promise<Result<{ reference: string; status: string; amount: string }>> {
  await connectDB();

  const { reference, requesterWallet, txHash } = body;
  if (!reference) return err("Missing reference");

  const intent = await Intent.findOne({ reference });
  if (!intent) return err("Intent not found", 404);
  if (intent.status === "CLAIMED") return err("Already claimed — cannot refund");
  if (intent.status === "REFUNDED") return err("Already refunded");

  if (requesterWallet.toLowerCase() !== intent.senderWallet.toLowerCase()) {
    return err("Only the sender can refund", 403);
  }

  intent.status = "REFUNDED";
  if (txHash) intent.refundTxHash = txHash;
  await intent.save();

  try {
    await createNotifications([{
      type: "payment_refunded",
      userId: intent.senderUserId.toString(),
      intentId: intent._id.toString(),
      title: "↩️ Funds Refunded",
      message: `You refunded ${intent.amount} ETH (ref: ${reference}).`,
    }]);
  } catch (e) {
    console.error("[intentService] refund notification error:", e);
  }

  return ok({ reference, status: "REFUNDED", amount: intent.amount });
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getUserHistory(walletAddress: string) {
  await connectDB();
  const user = await findByWallet(walletAddress);
  if (!user) return [];

  return Intent.find({
    $or: [{ senderUserId: user._id }, { recipientUserId: user._id }],
  })
    .sort({ createdAt: -1 })
    .populate("senderUserId", "displayName walletAddress email")
    .populate("recipientUserId", "displayName walletAddress email");
}

// ─── Find ─────────────────────────────────────────────────────────────────────

export async function findIntent(reference: string) {
  await connectDB();
  return Intent.findOne({ reference })
    .populate("senderUserId", "displayName walletAddress")
    .populate("recipientUserId", "displayName walletAddress");
}

export async function findIntentById(id: string) {
  await connectDB();
  return Intent.findById(id)
    .populate("senderUserId", "displayName walletAddress")
    .populate("recipientUserId", "displayName walletAddress");
}
