import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ participants: [] });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, full_name, phone, qr_token")
    .eq("is_active", true)
    .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ participants: data });
}
