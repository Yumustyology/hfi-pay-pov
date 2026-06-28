import { NextRequest } from "next/server";
import { findByIdentifier } from "@/lib/services/user.service";
import { success, failure } from "@/lib/response";

/**
 * POST /api/relay/resolve
 *
 * The single relay endpoint the frontend uses for identifier resolution.
 * Today: queries MongoDB.
 * Tomorrow: routes the request to the user's home relay over HTTP.
 * Next year: gossip network lookup.
 *
 * The frontend never changes.
 */
export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();

    if (!identifier || typeof identifier !== "string") {
      return failure("identifier is required");
    }

    const user = await findByIdentifier(identifier.trim());

    if (!user) {
      return success({ found: false });
    }

    return success({
      found: true,
      verified: user.isVerified ?? true,
      displayName: user.displayName,
      relayId: user.homeRelay,
      wallet: user.walletAddress,
    });
  } catch (err: any) {
    console.error("[POST /api/relay/resolve]", err);
    return failure(err.message ?? "Resolution failed", 500);
  }
}
