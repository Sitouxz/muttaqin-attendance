import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { planWednesdaySessions, weekOfSGT } from "@/lib/sessions/weekly";

/**
 * Runs every Monday 00:05 SGT (vercel.json). Closes off last week's sessions
 * that were left active and opens this week's Wednesday sessions, so the home
 * page and scanner always offer that week's kuliah and Active Ageing activity.
 * Safe to re-run: a programme already scheduled for that Wednesday, in any
 * status (including one staff cancelled), is left alone.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { monday, wednesday } = weekOfSGT(new Date());
  const planned = planWednesdaySessions(wednesday);

  const names = [...new Set(planned.map((p) => p.programmeName))];
  const { data: programmes, error: programmesError } = await serviceClient
    .from("programmes")
    .select("id, name")
    .in("name", names);
  if (programmesError) {
    return NextResponse.json({ error: programmesError.message }, { status: 500 });
  }

  const programmeIdByName = new Map((programmes ?? []).map((p) => [p.name, p.id]));
  const missing = names.filter((n) => !programmeIdByName.has(n));
  if (missing.length > 0) {
    console.error("[cron/weekly-sessions] programmes not found:", missing);
    return NextResponse.json({ error: "PROGRAMMES_NOT_FOUND", missing }, { status: 500 });
  }

  const { data: closed, error: closeError } = await serviceClient
    .from("sessions")
    .update({ status: "completed" })
    .eq("status", "active")
    .lt("session_date", monday)
    .select("id");
  if (closeError) {
    return NextResponse.json({ error: closeError.message }, { status: 500 });
  }

  const { data: existing, error: existingError } = await serviceClient
    .from("sessions")
    .select("session_programmes(programme_id)")
    .eq("session_date", wednesday);
  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  const scheduled = new Set(
    (existing ?? []).flatMap((s) => s.session_programmes.map((sp) => sp.programme_id))
  );

  const created: string[] = [];
  const skipped: string[] = [];

  for (const plan of planned) {
    const programmeId = programmeIdByName.get(plan.programmeName)!;
    if (scheduled.has(programmeId)) {
      skipped.push(plan.title);
      continue;
    }

    const { data: session, error: insertError } = await serviceClient
      .from("sessions")
      .insert({
        session_date: plan.session_date,
        title: plan.title,
        status: "active",
        start_time: plan.start_time,
        end_time: plan.end_time,
      })
      .select("id")
      .single();
    if (insertError || !session) {
      return NextResponse.json(
        { error: insertError?.message ?? "SESSION_INSERT_FAILED", created },
        { status: 500 }
      );
    }

    const { error: linkError } = await serviceClient
      .from("session_programmes")
      .insert({ session_id: session.id, programme_id: programmeId });
    if (linkError) {
      // A session with no programme would show in the scanner with nothing to check in to.
      await serviceClient.from("sessions").delete().eq("id", session.id);
      return NextResponse.json({ error: linkError.message, created }, { status: 500 });
    }

    created.push(plan.title);
  }

  return NextResponse.json({
    wednesday,
    completed: closed?.length ?? 0,
    created,
    skipped,
  });
}
