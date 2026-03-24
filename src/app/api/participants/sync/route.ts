import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const page = Number(req.nextUrl.searchParams.get("page") ?? 0);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 500);

  const { data, error } = await supabase
    .from("participants")
    .select("id, full_name, phone, qr_token")
    .eq("is_active", true)
    .range(page * limit, (page + 1) * limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ participants: data });
}
