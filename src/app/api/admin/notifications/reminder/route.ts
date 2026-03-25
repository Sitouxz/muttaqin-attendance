import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { sendReminderEmail } from "@/lib/email/send-reminder";
import { addDays } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { SGT_TIMEZONE } from "@/lib/utils/constants";

export async function POST(request: NextRequest) {
  // Auth: allow either admin session OR Authorization: Bearer CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  let authorized = false;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    authorized = true;
  } else {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) authorized = true;
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find next session within 7 days
  const nowSGT = toZonedTime(new Date(), SGT_TIMEZONE);
  const todayStr = formatInTimeZone(nowSGT, SGT_TIMEZONE, "yyyy-MM-dd");
  const sevenDaysLaterStr = formatInTimeZone(
    addDays(nowSGT, 7),
    SGT_TIMEZONE,
    "yyyy-MM-dd"
  );

  const { data: upcomingSession } = await serviceClient
    .from("sessions")
    .select("id, session_date, title, start_time, end_time")
    .in("status", ["active", "draft"])
    .gte("session_date", todayStr)
    .lte("session_date", sevenDaysLaterStr)
    .order("session_date", { ascending: true })
    .limit(1)
    .single();

  if (!upcomingSession) {
    return NextResponse.json({ sent: 0, errors: [], message: "No upcoming session found" });
  }

  // Fetch opted-in active participants
  const { data: participants } = await serviceClient
    .from("participants")
    .select("full_name, email, qr_image_url")
    .eq("is_active", true)
    .eq("email_consent", true);

  const errors: string[] = [];
  let sent = 0;

  for (const participant of participants ?? []) {
    try {
      await sendReminderEmail({
        participant: {
          full_name: participant.full_name,
          email: participant.email,
          qr_image_url: participant.qr_image_url,
        },
        session: upcomingSession,
      });
      sent++;
    } catch (err) {
      errors.push(
        `${participant.email}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return NextResponse.json({ sent, errors });
}
