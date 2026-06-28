/**
 * lib/otp.ts
 * Generates a 6-digit numeric OTP. No external package required.
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
