"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Eye, Download, Search } from "lucide-react";

interface ParticipantRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  postal_code: string;
  is_active: boolean;
  created_at: string;
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exporting, setExporting] = useState(false);

  const pageSize = 20;

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (debouncedSearch) params.set("q", debouncedSearch);

    const res = await fetch(`/api/admin/participants?${params}`);
    if (res.ok) {
      const json = await res.json();
      setParticipants(json.participants ?? []);
      setTotal(json.total ?? 0);
    }
    setLoading(false);
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  async function handleExport() {
    setExporting(true);
    const res = await fetch("/api/admin/participants/export");
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `participants_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  }

  const columns: ColumnDef<ParticipantRow>[] = [
    {
      accessorKey: "full_name",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Nama Penuh</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Full Name</div>
        </div>
      ),
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.full_name}</span>,
    },
    {
      accessorKey: "email",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">E-mel</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Email</div>
        </div>
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.email}</span>,
    },
    {
      accessorKey: "phone",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Telefon</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Phone</div>
        </div>
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.phone}</span>,
    },
    {
      accessorKey: "age",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Umur</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Age</div>
        </div>
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.age}</span>,
    },
    {
      accessorKey: "is_active",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Status</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Status</div>
        </div>
      ),
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap ${
            row.original.is_active ? "bg-emerald-500" : "bg-red-400"
          }`}
          title={row.original.is_active ? "Active" : "Inactive"}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
          {row.original.is_active ? "Aktif" : "Tidak Aktif"}
        </span>
      ),
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
        <Link href={`/admin/participants/${row.original.id}`}>
          <Button size="icon-sm" variant="ghost" title="View">
            <Eye className="size-4" />
          </Button>
        </Link>
      ),
    },
  ];

  const table = useReactTable({
    data: participants,
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
          <h1 className="text-2xl font-bold text-[#173d35]">Peserta</h1>
          <p className="text-sm text-[#173d35]/60">Participants</p>
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

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#173d35]/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, e-mel, telefon... / Search..."
          className="pl-9 min-h-[44px]"
        />
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
                    <th key={header.id} className="px-4 py-2.5 text-left text-sm">
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
                    Tiada peserta / No participants
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
          <p className="text-sm text-[#173d35]/60">{total} peserta / participants</p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelum / Prev
            </Button>
            <span className="text-sm text-[#173d35]">{page} / {totalPages}</span>
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
    </div>
  );
}
