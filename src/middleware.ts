/**
 * NigWrite - Rate Limiting Proxy
 * Applies rate limiting to all /api/* routes.
 * Created by: Wabi The Tech Nurse
 */

import { type NextRequest, NextResponse } from "next/server";
import { rateLimit, getLimitName } from "@/lib/rate-limit";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";

  const limitName = getLimitName(request.nextUrl.pathname);
  const result = rateLimit(ip, limitName);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter: result.retryAfter },
      { status: 429, headers: { "Retry-After": String(result.retryAfter ?? 60) } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
