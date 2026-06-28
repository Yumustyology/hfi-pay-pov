import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { OtpVerification } from "@/models/OtpVerification";
import { sendOTPEmail } from "@/lib/email/brevo";
import { failure, success } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return failure("Valid email required", 400);
    }

    const normalized = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert: one OTP record per email at a time
    await OtpVerification.findOneAndUpdate(
      { email: normalized },
      { otp, verified: false, expiresAt },
      { upsert: true, new: true }
    );

    const emailResult = await sendOTPEmail({ email: normalized, otp });

    if (!emailResult.success) {
      // Dev fallback — log to server console so registration still works
      console.log(`[HFI Pay OTP] ${normalized} → ${otp}`);
    }

    return success({ message: "OTP sent" });
  } catch (err: any) {
    console.error("[POST /api/auth/send-otp]", err);
    return failure(err.message ?? "Internal server error", 500);
  }
}
