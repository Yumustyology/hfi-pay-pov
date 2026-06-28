import { NextRequest } from "next/server";
import { verifyAndCreateUser } from "@/lib/services/auth.service";
import { success, failure } from "@/lib/response";

/**
 * POST /api/auth/verify-otp
 *
 * Validates OTP + creates User atomically.
 * On success, the client sets hfi_wallet cookie and redirects to /dashboard.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { displayName, walletAddress, email, otp } = body;

    if (!displayName || !walletAddress || !email || !otp) {
      return failure("Missing required fields: displayName, walletAddress, email, otp");
    }

    const user = await verifyAndCreateUser({ displayName, walletAddress, email, otp });

    return success(
      {
        _id: user._id,
        displayName: user.displayName,
        email: user.email,
        walletAddress: user.walletAddress,
        homeRelay: user.homeRelay,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      201
    );
  } catch (err: any) {
    console.error("[POST /api/auth/verify-otp]", err);
    return failure(err.message ?? "Verification failed", 400);
  }
}
