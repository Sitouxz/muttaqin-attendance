import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { escapeFilterValue, getActingAdmin } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  const admin = await getActingAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("page_size") ?? "20", 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = serviceClient
    .from("participants")
    .select(
      "id, full_name, email, phone, age, gender, participant_category, postal_code, is_active, created_at, qr_image_url, qr_card_url, serial_code, reg_channel, wa_qr_pending",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    // Quoted: an unquoted term containing , . ( ) would be parsed as filter
    // syntax and could widen the query.
    const term = escapeFilterValue(`%${q}%`);
    query = query.or(
      `full_name.ilike.${term},phone.ilike.${term},email.ilike.${term},serial_code.ilike.${term}`
    );
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ participants: data ?? [], total: count ?? 0 });
}
