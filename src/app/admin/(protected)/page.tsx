import { Users, Calendar, ClipboardCheck, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { StatsCard } from "@/components/admin/StatsCard";
import { AttendanceTrendChart } from "@/components/admin/AttendanceTrendChart";
import { todaySGT } from "@/lib/utils/format";

export const revalidate = 30;
import { SGT_TIMEZONE } from "@/lib/utils/constants";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfMonth } from "date-fns";
import { formatDateTimeSGT } from "@/lib/utils/format";

export default async function AdminDashboardPage() {
  // Fetch stats
  const nowSGT = toZonedTime(new Date(), SGT_TIMEZONE);
  const firstOfMonth = startOfMonth(nowSGT);
  const firstOfMonthStr = `${firstOfMonth.getFullYear()}-${String(firstOfMonth.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = todaySGT();
  const todayStart = fromZonedTime(`${todayStr}T00:00:00`, SGT_TIMEZONE);

  const [
    { count: totalParticipants },
    { count: sessionsThisMonth },
    { count: attendanceToday },
    { data: attendanceRows },
    { data: recentCheckins },
  ] = await Promise.all([
    serviceClient
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    serviceClient
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("session_date", firstOfMonthStr),
    serviceClient
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .gte("checked_in_at", todayStart.toISOString()),
    serviceClient.from("attendance").select("programme_id, programmes(name)"),
    serviceClient
      .from("attendance")
      .select(
        "id, checked_in_at, participants(full_name), programmes(name, colour)"
      )
      .order("checked_in_at", { ascending: false })
      .limit(10),
  ]);

  // Top programme — resolved from joined data, no extra query
  const programmeCounts: Record<string, { count: number; name: string }> = {};
  for (const row of attendanceRows ?? []) {
    const prog = !Array.isArray(row.programmes) ? row.programmes : null;
    if (!prog) continue;
    const entry = programmeCounts[row.programme_id];
    if (entry) {
      entry.count++;
    } else {
      programmeCounts[row.programme_id] = { count: 1, name: prog.name };
    }
  }
  const topProgrammeName = Object.values(programmeCounts).sort(
    (a, b) => b.count - a.count
  )[0]?.name ?? "—";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#173d35]">Papan Pemuka</h1>
        <p className="text-sm text-[#173d35]/60">Dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title={{ my: "Jumlah Peserta", en: "Total Participants" }}
          value={totalParticipants ?? 0}
          icon={Users}
          colour="#173d35"
        />
        <StatsCard
          title={{ my: "Sesi Bulan Ini", en: "Sessions This Month" }}
          value={sessionsThisMonth ?? 0}
          icon={Calendar}
          colour="#735b29"
        />
        <StatsCard
          title={{ my: "Kehadiran Hari Ini", en: "Attendance Today" }}
          value={attendanceToday ?? 0}
          icon={ClipboardCheck}
          colour="#10B981"
        />
        <StatsCard
          title={{ my: "Program Terpopular", en: "Most Popular Programme" }}
          value={topProgrammeName}
          icon={BookOpen}
          colour="#3B82F6"
        />
      </div>

      {/* Chart + Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="xl:col-span-2 bg-white rounded-[1.5rem] shadow-ambient p-6">
          <div className="mb-4">
            <h2 className="font-bold text-[#173d35]">Trend Kehadiran 30 Hari</h2>
            <p className="text-xs text-[#173d35]/60">30-Day Attendance Trend</p>
          </div>
          <AttendanceTrendChart />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
          <div className="mb-4">
            <h2 className="font-bold text-[#173d35]">Aktiviti Terkini</h2>
            <p className="text-xs text-[#173d35]/60">Recent Activity</p>
          </div>
          <div className="space-y-3">
            {(recentCheckins ?? []).length === 0 && (
              <p className="text-sm text-[#173d35]/50 text-center py-4">Tiada aktiviti / No activity</p>
            )}
            {(recentCheckins ?? []).map((row) => {
              const participant = !Array.isArray(row.participants) ? row.participants : null;
              const programme = !Array.isArray(row.programmes) ? row.programmes : null;
              return (
                <div key={row.id} className="flex items-start gap-3 py-2 border-b border-[#f0f4f3] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#173d35] truncate">
                      {participant?.full_name ?? "—"}
                    </p>
                    <p className="text-xs text-[#173d35]/60">
                      {formatDateTimeSGT(row.checked_in_at)}
                    </p>
                  </div>
                  {programme && (
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white shrink-0"
                      style={{ backgroundColor: programme.colour }}
                    >
                      {programme.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
