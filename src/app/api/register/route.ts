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
    .insert({
      ...rest,
      reg_channel,
      email: email || null,
      // WhatsApp cards are delivered inbound-first; arm it up front so a
      // card-generation hiccup below still leaves the registrant claimable.
      wa_qr_pending: reg_channel === "whatsapp",
    })
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
      // wa_qr_pending is already true from the insert. Only a successful
      // business-initiated template send clears it here.
      if (isWhatsAppConfigured()) {
        const result = await sendQrWhatsApp({
          full_name: participant.full_name,
          phone: participant.phone,
          serial_code: participant.serial_code,
          qr_card_url: urls.qr_card_url,
        });
        if (result.delivered) {
          await serviceClient
            .from("participants")
            .update({ wa_qr_pending: false })
            .eq("id", participant.id);
          delivery = "sent";
        } else {
          delivery = "awaiting_whatsapp";
        }
      } else {
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
