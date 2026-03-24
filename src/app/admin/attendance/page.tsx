"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Download } from "lucide-react";
import { formatDateTimeSGT } from "@/lib/utils/format";
import { CHECK_IN_METHOD_LABELS, CHECK_IN_METHODS, type CheckInMethod } from "@/lib/utils/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AttendanceRow {
  id: string;
  checked_in_at: string;
  check_in_method: string;
  participants: { full_name: string; email: string } | null;
  programmes: { name: string; colour: string } | null;
  sessions: { session_date: string } | null;
}

interface SessionOption {
  id: string;
  session_date: string;
  title: string | null;
}

interface ProgrammeOption {
  id: string;
  name: string;
  colour: string;
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);

  // Filters
  const [sessionId, setSessionId] = useState("all");
  const [programmeId, setProgrammeId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [method, setMethod] = useState("all");

  const pageSize = 20;

  useEffect(() => {
    async function loadOptions() {
      const [sessRes, progRes] = await Promise.all([
        fetch("/api/admin/sessions?page_size=100"),
        fetch("/api/admin/programmes"),
      ]);
      if (sessRes.ok) {
        const j = await sessRes.json();
        setSessions(j.sessions ?? []);
      }
      if (progRes.ok) {
        const j = await progRes.json();
        setProgrammes(j.programmes ?? []);
      }
    }
    loadOptions();
  }, []);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (sessionId !== "all") params.set("session_id", sessionId);
    if (programmeId !== "all") params.set("programme_id", programmeId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (method !== "all") params.set("method", method);

    const res = await fetch(`/api/admin/attendance?${params}`);
    if (res.ok) {
      const json = await res.json();
      setAttendance(json.attendance ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, sessionId, programmeId, dateFrom, dateTo, method]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  async function handleExport() {
    setExporting(true);
    const params = new URLSearchParams();
    if (sessionId !== "all") params.set("session_id", sessionId);
    if (programmeId !== "all") params.set("programme_id", programmeId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (method !== "all") params.set("method", method);

    const res = await fetch(`/api/admin/attendance/export?${params}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  }

  const columns: ColumnDef<AttendanceRow>[] = [
    {
      id: "participant",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Peserta</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Participant</div>
        </div>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.participants?.full_name ?? "—"}</p>
          <p className="text-xs text-[#173d35]/60">{row.original.participants?.email ?? ""}</p>
        </div>
      ),
    },
    {
      id: "programme",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Program</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Programme</div>
        </div>
      ),
      cell: ({ row }) =>
        row.original.programmes ? (
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs text-white font-medium"
            style={{ backgroundColor: row.original.programmes.colour }}
          >
            {row.original.programmes.name}
          </span>
        ) : (
          <span className="text-[#173d35]/40 text-xs">—</span>
        ),
    },
    {
      id: "session_date",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Tarikh Sesi</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Session Date</div>
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.sessions?.session_date ?? "—"}</span>
      ),
    },
    {
      accessorKey: "checked_in_at",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Masa Daftar</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Checked In</div>
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{formatDateTimeSGT(row.original.checked_in_at)}</span>
      ),
    },
    {
      accessorKey: "check_in_method",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Kaedah</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Method</div>
        </div>
      ),
      cell: ({ row }) => {
        const m = row.original.check_in_method as CheckInMethod;
        const lbl = CHECK_IN_METHOD_LABELS[m];
        return <span className="text-sm">{lbl?.my ?? m}</span>;
      },
    },
  ];

  const table = useReactTable({
    data: attendance,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#173d35]">Kehadiran</h1>
          <p className="text-sm text-[#173d35]/60">Attendance</p>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="outline"
          className="border-[#173d35] text-[#173d35]"
        >
          {exporting ? <LoadingSpinner size="sm" /> : <Download className="size-4" />}
          <span className="font-bold">Eksport / Export</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[1.5rem] shadow-ambient p-4 mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Session filter */}
          <div>
            <label className="block text-xs font-bold text-[#173d35] mb-1">Sesi / Session</label>
            <Select value={sessionId} onValueChange={(v) => { setSessionId(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua / All</SelectItem>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.session_date} {s.title ? `— ${s.title}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Programme filter */}
          <div>
            <label className="block text-xs font-bold text-[#173d35] mb-1">Program / Programme</label>
            <Select value={programmeId} onValueChange={(v) => { setProgrammeId(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua / All</SelectItem>
                {programmes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs font-bold text-[#173d35] mb-1">Dari / From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="h-9"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs font-bold text-[#173d35] mb-1">Hingga / To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="h-9"
            />
          </div>

          {/* Method filter */}
          <div>
            <label className="block text-xs font-bold text-[#173d35] mb-1">Kaedah / Method</label>
            <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua / All</SelectItem>
                {CHECK_IN_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {CHECK_IN_METHOD_LABELS[m].my}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[1.5rem] shadow-ambient overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-[#f0f4f3]">
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 text-left text-sm">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-[#173d35]/40">
                    Tiada rekod / No records
                  </td>
                </tr>
              )}
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#f0f4f3] hover:bg-[#f0f4f3] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[#173d35]/60">{total} rekod / records</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Sebelum / Prev
            </Button>
            <span className="text-sm text-[#173d35]">{page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Seterus / Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
