import { NextRequest } from "next/server";
import { getPaymentOnChain } from "@/lib/blockchain/escrow";
import { success, failure } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return failure("Missing id", 400);

    const payment = await getPaymentOnChain(Number(id));
    if (!payment) return failure("Payment not found on-chain", 404);

    return success({
      id: payment.id,
      claimed: payment.claimed,
      refunded: payment.refunded,
      recipient: payment.recipient,
      amountEth: payment.amountEth,
    });
  } catch (err: any) {
    console.error("[GET /api/intents/check-chain]", err);
    return failure(err.message ?? "Internal server error", 500);
  }
}
