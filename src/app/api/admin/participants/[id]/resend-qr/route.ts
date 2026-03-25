import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { generateQrToken, generateQrPng } from "@/lib/utils/qr";
import { sendReminderEmail } from "@/lib/email/send-reminder";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch participant
  const { data: participant, error: fetchError } = await serviceClient
    .from("participants")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  // Generate new QR token
  const newToken = generateQrToken();

  // Generate QR PNG
  const qrBuffer = await generateQrPng(newToken);

  // Upload to Supabase storage
  const fileName = `${newToken}.png`;
  const { error: uploadError } = await serviceClient.storage
    .from("qr-codes")
    .upload(fileName, qrBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = serviceClient.storage.from("qr-codes").getPublicUrl(fileName);

  // Update participant
  const { error: updateError } = await serviceClient
    .from("participants")
    .update({ qr_token: newToken, qr_image_url: publicUrl })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Find the next upcoming session to include in email (best-effort)
  const { data: nextSession } = await serviceClient
    .from("sessions")
    .select("session_date, title, start_time, end_time")
    .in("status", ["active", "draft"])
    .gte("session_date", new Date().toISOString().slice(0, 10))
    .order("session_date", { ascending: true })
    .limit(1)
    .single();

  // Send QR email
  if (nextSession) {
    await sendReminderEmail({
      participant: {
        full_name: participant.full_name,
        email: participant.email,
        qr_image_url: publicUrl,
      },
      session: nextSession,
    }).catch(() => {
      // non-fatal
    });
  }

  return NextResponse.json({ success: true, qr_image_url: publicUrl });
}
