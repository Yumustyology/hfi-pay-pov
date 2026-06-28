// Lightweight auth helpers - will expand when we add proper session management
// For the MVP, we store userId in a signed cookie or use wallet address as identity

export function getUserFromRequest(request: Request): string | null {
  // TODO: Replace with proper session/JWT validation
  const userId = request.headers.get("x-user-id");
  return userId;
}

export function requireAuth(userId: string | null): asserts userId is string {
  if (!userId) {
    throw new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
