import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/([a-z]{2}-[A-Z]{2})(\/.*)?$/);

  if (!match?.[1]) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${match[1].slice(0, 2)}${match[2] ?? ""}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/:locale/:path*"]
};
