import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Relay } from "@/models/Relay";
import { ALL_RELAYS } from "@/features/relay/relay.constants";
import { success, failure } from "@/lib/response";

/**
 * GET /api/relay/status
 *
 * Seeds all relay records into MongoDB on first call (idempotent).
 * Returns all registered relays with their status.
 * Called automatically by the dashboard to power the relay registry display.
 */
export async function GET(_req: NextRequest) {
  try {
    await connectDB();

    // Seed all relays (upsert — safe to call repeatedly)
    await Promise.all(
      ALL_RELAYS.map((relay) =>
        Relay.updateOne(
          { relayId: relay.relayId },
          { $setOnInsert: relay },
          { upsert: true }
        )
      )
    );

    const relays = await Relay.find({}).select(
      "relayId name endpoint status supportedIdentifiers supportedChains"
    );

    return success({ relays });
  } catch (err: any) {
    console.error("[GET /api/relay/status]", err);
    return failure(err.message ?? "Internal server error", 500);
  }
}
