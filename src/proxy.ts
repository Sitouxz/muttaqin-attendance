import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";

// In-memory rate limit store (per Vercel Edge instance)
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const hits = (rateLimitMap.get(ip) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  rateLimitMap.set(ip, hits);
  return hits.length > 10;
}

export async function proxy(request: NextRequest) {
  // Rate limiting on registration endpoint
  if (
    request.nextUrl.pathname === "/api/register" &&
    request.method === "POST"
  ) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }
  }

  // Auth guard for /admin (except /admin/login) and for the scanner.
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const guarded =
    (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) ||
    // The scanner reads participant data and writes attendance, and the schema
    // has always expected an operator behind a check-in (attendance.checked_in_by
    // references admins). It is staff-only, not public.
    pathname.startsWith("/scan");

  if (guarded && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/scan/:path*", "/api/register"],
};
