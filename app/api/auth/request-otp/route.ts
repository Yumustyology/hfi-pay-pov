import { NextRequest } from "next/server";
import { requestOTP } from "@/lib/services/auth.service";
import { success, failure } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes("@")) return failure("Valid email required");
    await requestOTP(email);
    return success({ message: "Code sent to your email" });
  } catch (err: any) {
    console.error("[POST /api/auth/request-otp]", err);
    return failure(err.message ?? "Failed to send OTP", 500);
  }
}
