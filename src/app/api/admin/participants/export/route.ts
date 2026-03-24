import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import * as XLSX from "xlsx";
import { formatDateSGT } from "@/lib/utils/format";
import { todaySGT } from "@/lib/utils/format";

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: participants, error } = await serviceClient
    .from("participants")
    .select("full_name, email, phone, age, postal_code, created_at, is_active")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (participants ?? []).map((p) => ({
    "Full Name": p.full_name,
    Email: p.email,
    Phone: p.phone,
    Age: p.age,
    "Postal Code": p.postal_code,
    "Registered Date": formatDateSGT(p.created_at),
    Active: p.is_active ? "Yes" : "No",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participants");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = todaySGT();

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=participants_${dateStr}.xlsx`,
    },
  });
}
