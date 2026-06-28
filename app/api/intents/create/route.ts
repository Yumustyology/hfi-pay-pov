import { NextRequest } from "next/server";
import { createIntent } from "@/lib/services/intent.service";
import { success, failure } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createIntent(body);
    if (!result.ok) return failure(result.error, result.status);
    return success(result.data);
  } catch (err: any) {
    console.error("[POST /api/intents/create]", err);
    return failure(err.message ?? "Internal server error", 500);
  }
}
