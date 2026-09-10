import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase/service";
import { appBaseUrl, cleanEnv } from "@/lib/whatsapp/client";

/**
 * Twilio delivery-status callback for a registrant's QR-card send.
 *
 * Registration clears `wa_qr_pending` as soon as Twilio accepts the template
 * send, but accepted is not delivered: a number with no WhatsApp account comes
 * back `undelivered` (63024) minutes later. Without this, that person is marked
 * served and drops off the admin "QR pending" badge. On failed/undelivered this
 * puts the flag back; every other status is a no-op.
 *
 * `pid` rides in the callback URL, which Twilio signs along with the body, so it
 * can't be forged without the account auth token.
 */

const FAILED = new Set(["failed", "undelivered"]);
const Query = z.object({ pid: z.string().uuid() });

/**
 * The URL Twilio signed is the statusCallback we gave it, built from
 * NEXT_PUBLIC_APP_URL. Rebuild it from that base rather than trusting req.url,
 * which a proxy may have rewritten; req.url stays as a fallback.
 */
function signedUrlCandidates(req: NextRequest): string[] {
  const base = appBaseUrl();
  const path = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  return [...new Set([base ? `${base}${path}` : "", req.url].filter(Boolean))];
}

export async function POST(req: NextRequest) {
  const authToken = cleanEnv(process.env.TWILIO_AUTH_TOKEN);
  if (!authToken) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const signed = signedUrlCandidates(req).some((url) =>
    twilio.validateRequest(authToken, signature, url, params),
  );
  if (!signed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = Query.safeParse({ pid: req.nextUrl.searchParams.get("pid") });
  if (!query.success) {
    return NextResponse.json({ error: "Invalid participant" }, { status: 400 });
  }

  const status = params.MessageStatus ?? "";
  if (!FAILED.has(status)) {
    return new NextResponse(null, { status: 204 });
  }

  const { data } = await serviceClient
    .from("participants")
    .update({ wa_qr_pending: true })
    .eq("id", query.data.pid)
    .eq("reg_channel", "whatsapp")
    .select("serial_code")
    .maybeSingle();

  console.warn(
    `[wa-status] ${data?.serial_code ?? query.data.pid}: ${status} (error ${params.ErrorCode ?? "none"}) — re-armed`,
  );
  return new NextResponse(null, { status: 204 });
}
