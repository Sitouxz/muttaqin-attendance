"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { SessionStatusBadge } from "@/components/admin/SessionStatusBadge";
import { AttendanceListTable } from "@/components/admin/AttendanceListTable";

interface SessionDetail {
  id: string;
  session_date: string;
  title: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  session_programmes: Array<{
    programme_id: string;
    programmes: { id: string; name: string; colour: string } | null;
  }>;
  session_agenda: Array<{ id: string; title: string; sort_order: number }>;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/admin/sessions/${id}`);
    if (res.ok) {
      const json = await res.json();
      setSession(json.session);
      setAttendanceCount(json.attendance_count ?? 0);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  async function toggleStatus() {
    if (!session) return;
    setToggling(true);
    const newStatus = session.status === "active" ? "draft" : "active";
    await fetch(`/api/admin/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchSession();
    setToggling(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-[#173d35]/50">
        <p className="font-bold">Sesi tidak dijumpai / Session not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Back */}
      <Link href="/admin/sessions" className="inline-flex items-center gap-2 text-sm text-[#173d35]/60 hover:text-[#173d35] mb-6">
        <ArrowLeft className="size-4" />
        <span>Kembali / Back</span>
      </Link>

      {/* Session Info Card */}
      <div className="bg-white rounded-[1.5rem] shadow-ambient p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#173d35]">
              {session.title ?? "Tanpa Tajuk / Untitled"}
            </h1>
            <p className="text-sm text-[#173d35]/60 mt-1">{session.session_date}</p>
          </div>
          <div className="flex items-center gap-3">
            <SessionStatusBadge status={session.status} />
            {session.status !== "cancelled" && session.status !== "completed" && (
              <Button
                onClick={toggleStatus}
                disabled={toggling}
                size="sm"
                variant="outline"
                className="border-[#173d35] text-[#173d35]"
              >
                {toggling ? <LoadingSpinner size="sm" /> : (
                  session.status === "active" ? "Set Draf / Set Draft" : "Set Aktif / Set Active"
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs font-bold text-[#173d35]/60 uppercase tracking-wide mb-1">Masa Mula / Start</p>
            <p className="text-sm font-medium text-[#173d35]">{session.start_time ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-[#173d35]/60 uppercase tracking-wide mb-1">Masa Tamat / End</p>
            <p className="text-sm font-medium text-[#173d35]">{session.end_time ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-[#173d35]/60 uppercase tracking-wide mb-1">Kehadiran / Attendance</p>
            <p className="text-2xl font-bold text-[#173d35]">{attendanceCount}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-[#173d35]/60 uppercase tracking-wide mb-1">Program</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {session.session_programmes?.map((sp, i) =>
                sp.programmes ? (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 rounded-full text-xs text-white font-medium"
                    style={{ backgroundColor: sp.programmes.colour }}
                  >
                    {sp.programmes.name}
                  </span>
                ) : null
              )}
              {(!session.session_programmes || session.session_programmes.length === 0) && (
                <span className="text-sm text-[#173d35]/40">—</span>
              )}
            </div>
          </div>
        </div>

        {session.notes && (
          <div className="bg-[#f0f4f3] rounded-lg p-3 mt-2">
            <p className="text-xs font-bold text-[#173d35]/60 mb-1">Nota / Notes</p>
            <p className="text-sm text-[#173d35]">{session.notes}</p>
          </div>
        )}
      </div>

      {/* Agenda */}
      {session.session_agenda?.length > 0 && (
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-6 mb-6">
          <div className="mb-4">
            <h2 className="font-bold text-[#173d35]">Aturcara</h2>
            <p className="text-xs text-[#173d35]/60">Agenda</p>
          </div>
          <ol className="space-y-2">
            {session.session_agenda.map((item, i) => (
              <li key={item.id} className="flex items-start gap-3 text-sm text-[#173d35]">
                <span className="font-bold text-[#173d35]/40 w-5 shrink-0 text-right">{i + 1}.</span>
                <span>{item.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Attendance List */}
      <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
        <div className="mb-4">
          <h2 className="font-bold text-[#173d35]">Senarai Kehadiran</h2>
          <p className="text-xs text-[#173d35]/60">Attendance List</p>
        </div>
        <AttendanceListTable sessionId={id} />
      </div>
    </div>
  );
}
