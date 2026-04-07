import { RegisterSchema } from "@/lib/validations/participant";
import { generateQrToken, generateQrPng } from "@/lib/utils/qr";
import { serviceClient } from "@/lib/supabase/service";
import { sendQrEmail } from "@/lib/email/send-qr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Check duplicate email
  const { data: existing } = await serviceClient
    .from("participants")
    .select("id")
    .eq("email", data.email)
    .single();
  if (existing) {
    return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
  }

  const qr_token = generateQrToken();

  const { data: participant, error } = await serviceClient
    .from("participants")
    .insert({ ...data, qr_token })
    .select()
    .single();

  if (error || !participant) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  // Generate and upload QR PNG (named by qr_token per spec)
  try {
    const qrBuffer = await generateQrPng(qr_token);
    const { error: uploadError } = await serviceClient.storage
      .from("qr-codes")
      .upload(`${qr_token}.png`, qrBuffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("QR Upload Error:", uploadError);
      // Still attempt to send email if registration succeeded
    } else {
      const { data: urlData } = serviceClient.storage
        .from("qr-codes")
        .getPublicUrl(`${qr_token}.png`);

      const qr_image_url = urlData.publicUrl;

      await serviceClient
        .from("participants")
        .update({ qr_image_url })
        .eq("id", participant.id);

      await sendQrEmail({ ...participant, qr_image_url, qr_token });
    }
  } catch (err) {
    console.error("QR Generation/Email Error:", err);
    // Non-fatal — registration still succeeded
  }

  return NextResponse.json(
    { success: true, participant_id: participant.id },
    { status: 201 }
  );
}
