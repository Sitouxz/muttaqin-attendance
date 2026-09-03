import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { uploadQrAssets } from "@/lib/qr/assets";
import { sendQrEmail } from "@/lib/email/send-qr";
import { sendQrWhatsApp } from "@/lib/whatsapp/send-qr";

/**
 * Re-delivers a participant's permanent QR. The token is unchanged (the QR is
 * meant to be permanent); the images are regenerated so any name/serial change
 * is picked up, then sent over the participant's registration channel.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: participant, error: fetchError } = await serviceClient
    .from("participants")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  let urls;
  try {
    urls = await uploadQrAssets(participant);
    await serviceClient
      .from("participants")
      .update({ qr_image_url: urls.qr_image_url, qr_card_url: urls.qr_card_url })
      .eq("id", id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "QR generation failed" },
      { status: 500 },
    );
  }

  if (participant.reg_channel === "whatsapp") {
    const result = await sendQrWhatsApp({
      full_name: participant.full_name,
      phone: participant.phone,
      serial_code: participant.serial_code,
      qr_card_url: urls.qr_card_url,
    });
    if (!result.delivered) {
      return NextResponse.json(
        { error: result.reason === "not_configured" ? "WhatsApp not configured" : result.error },
        { status: 502 },
      );
    }
  } else {
    if (!participant.email) {
      return NextResponse.json({ error: "Participant has no email" }, { status: 422 });
    }
    await sendQrEmail({
      full_name: participant.full_name,
      email: participant.email,
      serial_code: participant.serial_code,
      qr_card_url: urls.qr_card_url,
      qr_image_url: urls.qr_image_url,
      qr_token: participant.qr_token,
    }).catch((err) => {
      console.error("[resend-qr] email failed:", err);
    });
  }

  return NextResponse.json({
    success: true,
    channel: participant.reg_channel,
    qr_image_url: urls.qr_image_url,
    qr_card_url: urls.qr_card_url,
  });
}
