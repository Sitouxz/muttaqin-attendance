import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";

// In-memory rate limit store (per Vercel Edge instance)
const rateLimitMap = new Map<string, number[]>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST endpoints that answer differently for a value that is registered and one
 * that is not, so an unthrottled caller can walk a range and learn which people
 * are in the database.
 *
 * `/api/retrieve-qr/whatsapp` carries its own per-phone cooldown, but that can
 * only stop one number being spammed repeatedly — enumeration uses a *different*
 * number every time, so every probe is a fresh key and the cooldown never fires.
 * Throttling the caller instead is what bounds it.
 */
const THROTTLED_ROUTES: Record<string, number> = {
  "/api/register": 10,
  "/api/retrieve-qr/whatsapp": 10,
};

/**
 * Hits against one route from one caller, within the trailing window.
 *
 * Keyed by route as well as IP so a burst on one endpoint cannot lock the
 * caller out of another: retrying a QR retrieval should not spend the
 * registration budget.
 */
function isRateLimited(ip: string, route: string, max: number): boolean {
  const now = Date.now();

  // Entries whose window has fully expired are dead weight. Sweeping only once
  // the map is large keeps the common request off an O(n) scan, while stopping
  // a caller who rotates IPs from growing it without bound.
  if (rateLimitMap.size > 5000) {
    for (const [key, times] of rateLimitMap) {
      if (times.every((t) => now - t >= WINDOW_MS)) rateLimitMap.delete(key);
    }
  }

  const key = `${route}:${ip}`;
  const hits = (rateLimitMap.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  rateLimitMap.set(key, hits);
  return hits.length > max;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const limit = THROTTLED_ROUTES[pathname];
  if (limit !== undefined && request.method === "POST") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip, pathname, limit)) {
      return NextResponse.json(
        { error: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }
  }

  // Auth guard for /admin (except /admin/login) and for the scanner.
  const { response, user } = await updateSession(request);

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
  matcher: [
    "/admin/:path*",
    "/scan/:path*",
    "/api/register",
    "/api/retrieve-qr/whatsapp",
  ],
};
