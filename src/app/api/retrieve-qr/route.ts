import { RetrieveQrRequestSchema } from "@/lib/validations/participant";
import { generateOtp, hashOtp } from "@/lib/utils/otp";
import { serviceClient } from "@/lib/supabase/service";
import { sendOtpEmail } from "@/lib/email/send-otp";
import { NextRequest, NextResponse } from "next/server";

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RetrieveQrRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email } = parsed.data;

  // Look up participant by email
  const { data: participant } = await serviceClient
    .from("participants")
    .select("id, email")
    .eq("email", email)
    .single();

  if (!participant) {
    return NextResponse.json({ error: "EMAIL_NOT_FOUND" }, { status: 404 });
  }

  // Generate OTP and hash
  const otp = generateOtp();
  const otp_hash = await hashOtp(otp);

  const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  // Insert OTP request
  const { error: insertError } = await serviceClient.from("otp_requests").insert({
    email,
    otp_hash,
    expires_at,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Send OTP email (non-fatal — OTP row already exists, user can retry)
  try {
    await sendOtpEmail({ email, otp, expiresInMinutes: OTP_TTL_SECONDS / 60 });
  } catch (emailErr) {
    console.error("OTP email failed:", emailErr);
  }

  return NextResponse.json({ sent: true });
}
