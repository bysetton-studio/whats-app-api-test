import { NextResponse } from "next/server";
import crypto from "crypto";

// Routes Meta and the public need — no auth required.
const PUBLIC_PREFIXES = ["/api/webhook", "/api/auth", "/login", "/privacy"];

function expectedToken() {
  // Derive the session token from AUTH_PASSWORD so we only need one env var.
  return crypto
    .createHash("sha256")
    .update((process.env.AUTH_PASSWORD ?? "") + "-session")
    .digest("hex");
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = request.cookies.get("session")?.value;
  if (!process.env.AUTH_PASSWORD || session !== expectedToken()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
