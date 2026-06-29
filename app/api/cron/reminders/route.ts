import { NextRequest } from "next/server";
import { Intent } from "@/models/Intent";
import connectDB from "@/lib/mongodb";
import { sendRefundReminderEmail } from "@/lib/email/brevo";

// This route can be called by Vercel Cron or GitHub Actions.
// Typically you'd secure this with a secret header, e.g. `Authorization: Bearer <CRON_SECRET>`
export async function GET(req: NextRequest) {
  try {
    // 1. Verify cron secret if needed (omitted for local testing convenience, but add in production)
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();

    // 2. Find all intents that are past their expiry date and have not been claimed or refunded
    // AND haven't been notified yet.
    const expiredIntents = await Intent.find({
      status: { $nin: ["CLAIMED", "REFUNDED", "EXPIRED"] },
      expiresAt: { $lt: new Date() },
      notifiedExpired: { $ne: true },
    })
      .populate("senderUserId", "displayName email")
      .populate("recipientUserId", "displayName email");

    if (expiredIntents.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No expired intents to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let notifiedCount = 0;

    // 3. Process each expired intent
    for (const intent of expiredIntents) {
      try {
        const sender = intent.senderUserId as any; // populated
        
        // Update intent status to EXPIRED and set notifiedExpired to true
        intent.status = "EXPIRED";
        intent.notifiedExpired = true;
        await intent.save();

        if (sender && sender.email) {
          await sendRefundReminderEmail({
            senderEmail: sender.email,
            senderName: sender.displayName ?? "User",
            recipientEmail: intent.recipientEmail,
            amount: intent.amount,
            reference: intent.reference,
          });
          notifiedCount++;
        }
      } catch (err) {
        console.error(`[Cron] Error processing expired intent ${intent._id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, notifiedCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[GET /api/cron/reminders]", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
