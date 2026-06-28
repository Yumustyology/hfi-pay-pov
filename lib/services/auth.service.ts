/**
 * lib/services/auth.service.ts
 *
 * Two operations:
 *  1. requestOTP(email)             – generates code, stores in Mongo, sends via Brevo
 *  2. verifyAndCreateUser(...)      – validates code, creates User, cleans up OTP
 *
 * The verify step creates the user atomically — no separate /register call needed.
 */

import connectDB from "@/lib/mongodb";
import { OtpVerification } from "@/models/OtpVerification";
import User from "@/models/User";
import { generateOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/email/brevo";
import { DEFAULT_RELAY_ID } from "@/features/relay/relay.constants";

// ─── Request OTP ──────────────────────────────────────────────────────────────

export async function requestOTP(email: string): Promise<void> {
  await connectDB();
  const normalized = email.trim().toLowerCase();
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Upsert — one active OTP per email at a time
  await OtpVerification.findOneAndUpdate(
    { email: normalized },
    { otp, verified: false, expiresAt },
    { upsert: true, new: true }
  );

  const result = await sendOTPEmail({ email: normalized, otp });

  // Dev fallback: if Brevo isn't configured, log OTP to console
  if (!result.success) {
    console.log(`\n[HFI Pay OTP] ──────────────────────────`);
    console.log(`  Email : ${normalized}`);
    console.log(`  Code  : ${otp}`);
    console.log(`  Exp   : 5 minutes`);
    console.log(`────────────────────────────────────────\n`);
  }
}

// ─── Verify OTP + Create User ─────────────────────────────────────────────────

export async function verifyAndCreateUser(params: {
  displayName: string;
  walletAddress: string;
  email: string;
  otp: string;
}) {
  await connectDB();
  const { displayName, walletAddress, email, otp } = params;
  const normalized = email.trim().toLowerCase();
  const wallet = walletAddress.trim().toLowerCase();

  // Validate OTP
  const record = await OtpVerification.findOne({ email: normalized });
  if (!record) throw new Error("OTP not found or expired. Request a new code.");
  if (record.otp !== otp.trim()) throw new Error("Incorrect code.");
  if (new Date() > record.expiresAt) throw new Error("Code expired. Request a new code.");

  // Uniqueness checks
  const [existingEmail, existingWallet] = await Promise.all([
    User.findOne({ email: normalized }),
    User.findOne({ walletAddress: wallet }),
  ]);
  if (existingEmail) throw new Error("Email is already registered.");
  if (existingWallet) throw new Error("Wallet is already registered.");

  // Create user
  const user = await User.create({
    displayName: displayName.trim(),
    email: normalized,
    walletAddress: wallet,
    homeRelay: DEFAULT_RELAY_ID,
    isVerified: true,
  });

  // Clean up OTP
  await OtpVerification.deleteOne({ email: normalized });

  return user;
}
