import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { escapeFilterValue, getActingAdmin } from "@/lib/auth/admin";

export async function GET(req: NextRequest) {
  // Participant lookup is a staff tool: it returns personal data and must not
  // be reachable without a session.
  const admin = await getActingAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ participants: [] });

  const term = escapeFilterValue(`%${q}%`);

  // qr_token is deliberately not selected: it is the check-in credential, and
  // the caller checks people in by participant id.
  const { data, error } = await serviceClient
    .from("participants")
    .select("id, full_name, phone, serial_code")
    .eq("is_active", true)
    .or(`full_name.ilike.${term},phone.ilike.${term},serial_code.ilike.${term}`)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ participants: data });
}
