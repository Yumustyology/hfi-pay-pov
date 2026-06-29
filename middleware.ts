import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware — protects /dashboard routes.
 *
 * After registration the client sets a cookie `hfi_wallet` with the wallet address.
 * The middleware checks for this cookie. The dashboard page does the full DB verification
 * on load (wallet → user exists).
 *
 * Cookie is set client-side after successful /api/auth/register response.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const wallet = request.cookies.get("hfi_wallet")?.value;

  if (pathname.startsWith("/dashboard")) {
    if (!wallet) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
