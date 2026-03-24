"use client";

import { useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatDateTimeSGT } from "@/lib/utils/format";
import { CHECK_IN_METHOD_LABELS, type CheckInMethod } from "@/lib/utils/constants";

interface AttendanceRow {
  id: string;
  checked_in_at: string;
  check_in_method: string;
  participants: { full_name: string; email: string } | null;
  programmes: { name: string; colour: string } | null;
}

interface AttendanceListTableProps {
  sessionId: string;
}

export function AttendanceListTable({ sessionId }: AttendanceListTableProps) {
  const [data, setData] = useState<AttendanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const params = new URLSearchParams({
        session_id: sessionId,
        page: String(page),
        page_size: String(pageSize),
      });
      const res = await fetch(`/api/admin/attendance?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.attendance ?? []);
        setTotal(json.total ?? 0);
      }
      setLoading(false);
    }
    fetchData();
  }, [sessionId, page]);

  const columns: ColumnDef<AttendanceRow>[] = [
    {
      id: "name",
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
        const method = row.original.check_in_method as CheckInMethod;
        const label = CHECK_IN_METHOD_LABELS[method];
        return (
          <span className="text-sm">
            {label ? label.my : method}
          </span>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
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
                Tiada kehadiran / No attendance records
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[#173d35]/60">{total} rekod / records</p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-sm px-3 py-1 border rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-sm">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-sm px-3 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
