import { NextResponse } from "next/server";

// Routes Meta and the public need — no auth required.
const PUBLIC_PREFIXES = ["/api/webhook", "/api/auth", "/login", "/privacy"];

async function expectedToken() {
  // Web Crypto API — available in Edge runtime.
  const encoded = new TextEncoder().encode((process.env.AUTH_PASSWORD ?? "") + "-session");
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = request.cookies.get("session")?.value;
  if (!process.env.AUTH_PASSWORD || session !== (await expectedToken())) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
