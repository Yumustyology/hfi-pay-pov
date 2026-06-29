import { NextRequest } from "next/server";
import { findByIdentifier } from "@/lib/services/user.service";
import { resolveWallet } from "@/features/relay/relay.service";
import { failure, success } from "@/lib/response";

/**
 * GET /api/users/search
 *
 * ?identifier=john@example.com    — resolve any identifier (email, wallet, future: username/phone)
 * ?walletAddress=0x...             — resolve by wallet (dashboard profile load)
 *
 * The identifier= parameter is intentionally generic.
 * Today it resolves email. Later: @username, +2348142450182, etc.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier")?.trim();
    const walletAddress = searchParams.get("walletAddress")?.trim();

    if (walletAddress) {
      const resolved = await resolveWallet(walletAddress);
      if (!resolved) return success({ found: false });
      return success({ found: true, ...resolved, email: resolved.user?.email });
    }

    if (identifier) {
      const user = await findByIdentifier(identifier);
      if (!user) return success({ found: false });
      return success({
        found: true,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
        homeRelay: user.homeRelay,
        preferredChain: user.preferredChain,
        isVerified: user.isVerified,
        email: user.email,
      });
    }

    return failure("Provide identifier or walletAddress", 400);
  } catch (err: any) {
    console.error("[GET /api/users/search]", err);
    return failure(err.message ?? "Internal server error", 500);
  }
}
