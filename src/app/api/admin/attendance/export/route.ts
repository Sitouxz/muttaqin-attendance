import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import * as XLSX from "xlsx";
import { formatDateTimeSGT } from "@/lib/utils/format";
import { todaySGT } from "@/lib/utils/format";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const programmeId = searchParams.get("programme_id");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const method = searchParams.get("method");

  let query = serviceClient
    .from("attendance")
    .select(
      `
      checked_in_at,
      check_in_method,
      participants(serial_code, full_name, email),
      programmes(name),
      sessions(session_date)
      `
    )
    .order("checked_in_at", { ascending: false });

  if (sessionId) query = query.eq("session_id", sessionId);
  if (programmeId) query = query.eq("programme_id", programmeId);
  if (method) query = query.eq("check_in_method", method);
  if (dateFrom) query = query.gte("checked_in_at", `${dateFrom}T00:00:00+08:00`);
  if (dateTo) query = query.lte("checked_in_at", `${dateTo}T23:59:59+08:00`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((row) => {
    const participant = !Array.isArray(row.participants) ? row.participants : null;
    const programme = !Array.isArray(row.programmes) ? row.programmes : null;
    const session = !Array.isArray(row.sessions) ? row.sessions : null;
    return {
      Code: participant?.serial_code ?? "",
      "Participant Name": participant?.full_name ?? "",
      Email: participant?.email ?? "",
      Programme: programme?.name ?? "",
      "Session Date": session?.session_date ?? "",
      "Checked In At": formatDateTimeSGT(row.checked_in_at),
      Method: row.check_in_method,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStr = todaySGT();

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=attendance_${dateStr}.xlsx`,
    },
  });
}
