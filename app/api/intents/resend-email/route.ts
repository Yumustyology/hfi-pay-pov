import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Intent } from "@/models/Intent";
import { findByWallet } from "@/lib/services/user.service";
import { sendPaymentEmail } from "@/lib/email/brevo";
import { success, failure } from "@/lib/response";

/**
 * POST /api/intents/resend-email
 * Body: { intentId: string; senderWallet: string }
 *
 * Re-sends the claim notification email to the recipient.
 * Only the original sender can trigger this, and only for
 * unclaimed (FUNDED | EMAIL_SENT) intents.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { intentId, senderWallet } = body ?? {};

    if (!intentId || !senderWallet) {
      return failure("Missing intentId or senderWallet", 400);
    }

    const intent = await Intent.findById(intentId).lean() as any;
    if (!intent) return failure("Intent not found", 404);

    // Security: only the original sender may resend
    if (intent.senderWallet?.toLowerCase() !== senderWallet.toLowerCase()) {
      return failure("Forbidden: you are not the sender of this intent", 403);
    }

    // Only allow resend while still claimable
    const resendable = ["FUNDED", "EMAIL_SENT", "CREATED"];
    if (!resendable.includes(intent.status)) {
      return failure(`Cannot resend email for a ${intent.status} intent`, 400);
    }

    // Look up the sender's display name for the email template
    const sender = await findByWallet(senderWallet);
    if (!sender) return failure("Sender profile not found", 404);

    const result = await sendPaymentEmail({
      recipientEmail: intent.recipientEmail,
      recipientName: intent.recipientEmail.split("@")[0],
      senderName: sender.displayName ?? "Someone",
      amount: intent.amount,
      reference: intent.reference,
      intentId: intent._id.toString(),
    });

    if (!result.success) {
      return failure(result.error ?? "Failed to send email", 502);
    }

    // Bump status to EMAIL_SENT so it's visible in history
    await Intent.findByIdAndUpdate(intentId, { status: "EMAIL_SENT" });

    return success({ message: "Claim email re-sent successfully" });
  } catch (err: any) {
    console.error("[POST /api/intents/resend-email]", err);
    return failure(err.message ?? "Internal server error", 500);
  }
}
