import { Schema, model, models } from "mongoose";

/**
 * Stores short-lived OTP codes for email verification during registration.
 * MongoDB TTL index automatically deletes documents after 10 minutes.
 */
const OtpVerificationSchema = new Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  otp: { type: String, required: true },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, expires: 0 }, // TTL: remove when expiresAt is reached
});

export const OtpVerification =
  models.OtpVerification || model("OtpVerification", OtpVerificationSchema);
