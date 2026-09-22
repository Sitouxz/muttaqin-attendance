import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import * as XLSX from "xlsx";
import { formatDateSGT } from "@/lib/utils/format";
import { todaySGT } from "@/lib/utils/format";
import { GENDER_LABELS, PARTICIPANT_CATEGORY_LABELS } from "@/lib/utils/constants";
import type { Gender, ParticipantCategory } from "@/lib/validations/participant";
import { getRegionFromPostalCode } from "@/lib/utils/sg-regions";

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: participants, error } = await serviceClient
    .from("participants")
    .select(
      "serial_code, full_name, email, phone, age, gender, postal_code, participant_category, reg_channel, created_at, is_active",
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (participants ?? []).map((p) => ({
    Code: p.serial_code,
    "Full Name": p.full_name,
    Email: p.email ?? "",
    Phone: p.phone,
    Channel: p.reg_channel,
    Age: p.age,
    Gender: GENDER_LABELS[p.gender as Gender]?.en ?? "Unspecified",
    "Participant Category":
      PARTICIPANT_CATEGORY_LABELS[p.participant_category as ParticipantCategory]?.en ?? "",
    "Postal Code": p.postal_code,
    Region: getRegionFromPostalCode(p.postal_code) ?? "",
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
