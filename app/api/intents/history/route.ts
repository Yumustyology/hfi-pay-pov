import { NextRequest } from "next/server";
import { getUserHistory } from "@/lib/services/intent.service";
import { success, failure } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress");
    if (!walletAddress) return failure("Missing walletAddress", 400);

    const intents = await getUserHistory(walletAddress);
    return success({ intents });
  } catch (err: any) {
    console.error("[GET /api/intents/history]", err);
    return failure(err.message ?? "Internal server error", 500);
  }
}
