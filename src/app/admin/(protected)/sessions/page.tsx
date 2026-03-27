"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { SessionStatusBadge } from "@/components/admin/SessionStatusBadge";
import { SessionForm } from "@/components/admin/SessionForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, Pencil, Ban } from "lucide-react";
import Link from "next/link";
import { SESSION_STATUSES } from "@/lib/utils/constants";

interface SessionRow {
  id: string;
  session_date: string;
  title: string | null;
  status: string;
  session_programmes: Array<{
    programme_id: string;
    programmes: { name: string; colour: string } | null;
  }>;
  session_agenda: Array<{ id: string; title: string; sort_order: number }>;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState<SessionRow | null>(null);

  const pageSize = 20;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (statusFilter !== "all") params.set("status", statusFilter);

    const res = await fetch(`/api/admin/sessions?${params}`);
    if (res.ok) {
      const json = await res.json();
      setSessions(json.sessions ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleCancel(id: string) {
    if (!confirm("Batalkan sesi ini? / Cancel this session?")) return;
    await fetch(`/api/admin/sessions/${id}`, { method: "DELETE" });
    fetchSessions();
  }

  const columns: ColumnDef<SessionRow>[] = [
    {
      accessorKey: "session_date",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Tarikh</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Date</div>
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.session_date}</span>
      ),
    },
    {
      accessorKey: "title",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Tajuk</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Title</div>
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.title ?? <span className="text-[#173d35]/40 italic">Tanpa Tajuk</span>}</span>
      ),
    },
    {
      accessorKey: "status",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Status</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Status</div>
        </div>
      ),
      cell: ({ row }) => <SessionStatusBadge status={row.original.status} />,
    },
    {
      id: "programmes",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Program</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Programmes</div>
        </div>
      ),
      cell: ({ row }) => {
        const progs = row.original.session_programmes ?? [];
        return (
          <div className="flex flex-wrap gap-1">
            {progs.length === 0 && <span className="text-xs text-[#173d35]/40">—</span>}
            {progs.map((sp, i) => (
              sp.programmes ? (
                <span
                  key={i}
                  className="inline-block px-2 py-0.5 rounded-full text-xs text-white font-medium"
                  style={{ backgroundColor: sp.programmes.colour }}
                >
                  {sp.programmes.name}
                </span>
              ) : null
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Tindakan</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Actions</div>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link href={`/admin/sessions/${row.original.id}`}>
            <Button size="icon-sm" variant="ghost" title="View">
              <Eye className="size-4" />
            </Button>
          </Link>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => { setEditSession(row.original); setShowForm(true); }}
            title="Edit"
          >
            <Pencil className="size-4" />
          </Button>
          {row.original.status !== "cancelled" && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => handleCancel(row.original.id)}
              className="text-red-500 hover:text-red-700"
              title="Cancel"
            >
              <Ban className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: sessions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#173d35]">Sesi</h1>
          <p className="text-sm text-[#173d35]/60">Sessions</p>
        </div>
        <Button
          onClick={() => { setEditSession(null); setShowForm(true); }}
          className="bg-[#173d35] hover:bg-[#173d35]/90 text-white"
        >
          <Plus className="size-4" />
          <span className="font-bold">Sesi Baru</span>
          <span className="text-white/70">/ New Session</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#173d35]">Status:</span>
          <Select
            value={statusFilter}
            onValueChange={(val) => { setStatusFilter(val); setPage(1); }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua / All</SelectItem>
              {SESSION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                    <th
                      key={header.id}
                      className="px-4 py-2.5 text-left text-sm"
                    >
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
                    Tiada sesi / No sessions
                  </td>
                </tr>
              )}
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#f0f4f3] hover:bg-[#f0f4f3] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2.5 text-sm">
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
          <p className="text-sm text-[#173d35]/60">
            {total} sesi / sessions
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelum / Prev
            </Button>
            <span className="text-sm text-[#173d35]">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Seterus / Next
            </Button>
          </div>
        </div>
      )}

      {/* Session Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <span className="font-bold text-[#173d35]">
                {editSession ? "Kemaskini Sesi / Edit Session" : "Sesi Baru / New Session"}
              </span>
            </DialogTitle>
          </DialogHeader>
          <SessionForm
            initialData={editSession ? {
              id: editSession.id,
              session_date: editSession.session_date,
              title: editSession.title ?? "",
              programme_ids: editSession.session_programmes?.map((sp) => sp.programme_id) ?? [],
              agenda: (editSession.session_agenda ?? []).sort((a, b) => a.sort_order - b.sort_order),
            } : undefined}
            onSuccess={() => { setShowForm(false); fetchSessions(); }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
