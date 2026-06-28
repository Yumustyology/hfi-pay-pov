import { failure, success } from "@/lib/response";
import connectDB from "@/lib/mongodb";
import { OtpVerification } from "@/models/OtpVerification";
import {
  findByEmail,
  findByWallet,
  createUser,
} from "@/lib/services/user.service";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { displayName, email, walletAddress } = body;

    if (!displayName || !email || !walletAddress) {
      return failure("Missing required fields: displayName, email, walletAddress");
    }

    const normalized = email.trim().toLowerCase();

    // Confirm OTP was verified for this email
    const otpRecord = await OtpVerification.findOne({
      email: normalized,
      verified: true,
    });
    if (!otpRecord) {
      return failure("Email not verified. Complete OTP verification first.");
    }

    if (await findByEmail(normalized)) return failure("Email already registered");
    if (await findByWallet(walletAddress)) return failure("Wallet already registered");

    const user = await createUser({ displayName, email: normalized, walletAddress });

    // Clean up OTP record
    await OtpVerification.deleteOne({ email: normalized });

    return success(
      {
        _id: user._id,
        displayName: user.displayName,
        email: user.email,
        walletAddress: user.walletAddress,
        homeRelay: user.homeRelay,
        preferredChain: user.preferredChain,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      201
    );
  } catch (err: any) {
    console.error("[POST /api/auth/register]", err);
    return failure(err.message ?? "Internal server error", 500);
  }
}
