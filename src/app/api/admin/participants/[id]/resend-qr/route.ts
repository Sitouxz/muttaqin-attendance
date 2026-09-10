import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { uploadQrAssets } from "@/lib/qr/assets";
import { sendQrEmail } from "@/lib/email/send-qr";
import {
  sendRegistrationNotice,
  type DeliveryOutcome,
} from "@/lib/email/send-registration-notice";
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

  // SE gets the same record for a resend as for a registration.
  const notifySE = (delivery: DeliveryOutcome) =>
    sendRegistrationNotice({
      event: "resent",
      participant: {
        full_name: participant.full_name,
        serial_code: participant.serial_code,
        phone: participant.phone,
        email: participant.email,
        reg_channel: participant.reg_channel === "whatsapp" ? "whatsapp" : "email",
        qr_card_url: urls.qr_card_url,
      },
      delivery,
    });

  if (participant.reg_channel === "whatsapp") {
    const result = await sendQrWhatsApp({
      participant_id: participant.id,
      full_name: participant.full_name,
      phone: participant.phone,
      serial_code: participant.serial_code,
      qr_card_url: urls.qr_card_url,
    });
    if (!result.delivered) {
      if (result.reason === "not_configured") {
        // Fall back to inbound-first: re-arm so the card goes out when the
        // participant next messages the SE WhatsApp number.
        await serviceClient
          .from("participants")
          .update({ wa_qr_pending: true })
          .eq("id", id);
        await notifySE("awaiting_whatsapp");
        return NextResponse.json({
          success: true,
          channel: "whatsapp",
          status: "awaiting_whatsapp",
          qr_card_url: urls.qr_card_url,
        });
      }
      await notifySE("failed");
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    await serviceClient.from("participants").update({ wa_qr_pending: false }).eq("id", id);
    await notifySE("sent");
  } else {
    if (!participant.email) {
      return NextResponse.json({ error: "Participant has no email" }, { status: 422 });
    }
    const emailed = await sendQrEmail({
      full_name: participant.full_name,
      email: participant.email,
      serial_code: participant.serial_code,
      qr_card_url: urls.qr_card_url,
      qr_image_url: urls.qr_image_url,
      qr_token: participant.qr_token,
    })
      .then(() => true)
      .catch((err) => {
        console.error("[resend-qr] email failed:", err);
        return false;
      });
    await notifySE(emailed ? "sent" : "failed");
  }

  return NextResponse.json({
    success: true,
    channel: participant.reg_channel,
    qr_image_url: urls.qr_image_url,
    qr_card_url: urls.qr_card_url,
  });
}
