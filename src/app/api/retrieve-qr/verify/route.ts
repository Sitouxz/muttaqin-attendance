import { RetrieveQrVerifySchema } from "@/lib/validations/participant";
import { verifyOtp } from "@/lib/utils/otp";
import { serviceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RetrieveQrVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, otp } = parsed.data;

  // Find newest unexpired, unused OTP request for this email
  const { data: otpRequest } = await serviceClient
    .from("otp_requests")
    .select("id, otp_hash, expires_at, used_at")
    .eq("email", email)
    .is("used_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otpRequest) {
    return NextResponse.json({ error: "OTP_NOT_FOUND" }, { status: 404 });
  }

  // Check expiry (belt-and-suspenders)
  if (new Date(otpRequest.expires_at) < new Date()) {
    return NextResponse.json({ error: "OTP_EXPIRED" }, { status: 410 });
  }

  // Verify OTP
  const valid = await verifyOtp(otp, otpRequest.otp_hash);
  if (!valid) {
    return NextResponse.json({ error: "INVALID_OTP" }, { status: 400 });
  }

  // Mark as used
  await serviceClient
    .from("otp_requests")
    .update({ used_at: new Date().toISOString() })
    .eq("id", otpRequest.id);

  // Fetch participant QR image URL
  const { data: participant } = await serviceClient
    .from("participants")
    .select("qr_image_url")
    .eq("email", email)
    .single();

  return NextResponse.json({ qr_image_url: participant?.qr_image_url ?? null });
}
