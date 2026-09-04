import { RegisterSchema } from "@/lib/validations/participant";
import { serviceClient } from "@/lib/supabase/service";
import { uploadQrAssets } from "@/lib/qr/assets";
import { sendQrEmail } from "@/lib/email/send-qr";
import { sendQrWhatsApp } from "@/lib/whatsapp/send-qr";
import { isWhatsAppConfigured } from "@/lib/whatsapp/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, reg_channel, ...rest } = parsed.data;

  const { data: participant, error } = await serviceClient
    .from("participants")
    .insert({ ...rest, reg_channel, email: email || null })
    .select()
    .single();

  if (error || !participant) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  // Generate + upload both QR images, then deliver over the chosen channel.
  // "awaiting_whatsapp": card is ready but business-initiated WhatsApp is not
  // available yet — it goes out when the registrant first messages the SE number
  // (handled by the chatbot webhook via /api/whatsapp/claim-qr).
  let delivery: "sent" | "awaiting_whatsapp" | "failed" = "failed";
  try {
    const urls = await uploadQrAssets(participant);

    await serviceClient
      .from("participants")
      .update({ qr_image_url: urls.qr_image_url, qr_card_url: urls.qr_card_url })
      .eq("id", participant.id);

    if (reg_channel === "whatsapp") {
      if (isWhatsAppConfigured()) {
        const result = await sendQrWhatsApp({
          full_name: participant.full_name,
          phone: participant.phone,
          serial_code: participant.serial_code,
          qr_card_url: urls.qr_card_url,
        });
        if (result.delivered) {
          delivery = "sent";
        } else {
          await serviceClient
            .from("participants")
            .update({ wa_qr_pending: true })
            .eq("id", participant.id);
          delivery = "awaiting_whatsapp";
        }
      } else {
        await serviceClient
          .from("participants")
          .update({ wa_qr_pending: true })
          .eq("id", participant.id);
        delivery = "awaiting_whatsapp";
      }
    } else {
      await sendQrEmail({
        full_name: participant.full_name,
        email: participant.email!,
        serial_code: participant.serial_code,
        qr_card_url: urls.qr_card_url,
        qr_image_url: urls.qr_image_url,
        qr_token: participant.qr_token,
      });
      delivery = "sent";
    }
  } catch (err) {
    console.error("QR provisioning/delivery error:", err);
    delivery = "failed";
    // Non-fatal — registration succeeded; admin can resend.
  }

  return NextResponse.json(
    {
      success: true,
      participant_id: participant.id,
      serial_code: participant.serial_code,
      reg_channel,
      delivery,
    },
    { status: 201 },
  );
}
