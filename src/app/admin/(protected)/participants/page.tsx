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
import { Eye, Download, Search, Pencil, Trash2, XCircle, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { ParticipantForm } from "@/components/admin/ParticipantForm";

interface ParticipantRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  gender: "male" | "female" | "unspecified";
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
  const [rowSelection, setRowSelection] = useState({});

  // Edit/Action state
  const [editingParticipant, setEditingParticipant] = useState<ParticipantRow | null>(null);
  const [acting, setActing] = useState(false);

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

  async function handleDeleteParticipant(id: string) {
    if (!confirm("Are you sure you want to delete this participant?")) return;
    
    setActing(true);
    const res = await fetch(`/api/admin/participants/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchParticipants();
    }
    setActing(false);
  }

  async function handleBulkAction(action: "delete" | "deactivate" | "activate") {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;

    let confirmMsg = "";
    if (action === "delete") confirmMsg = `Delete ${selectedIds.length} participants?`;
    else if (action === "deactivate") confirmMsg = `Deactivate ${selectedIds.length} participants?`;
    else confirmMsg = `Activate ${selectedIds.length} participants?`;

    if (!confirm(confirmMsg)) return;

    setActing(true);
    const res = await fetch("/api/admin/participants/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, action }),
    });

    if (res.ok) {
      setRowSelection({});
      fetchParticipants();
    }
    setActing(false);
  }

  const columns: ColumnDef<ParticipantRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="border-[#173d35]/20"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="border-[#173d35]/20"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "full_name",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Full Name</div>
        </div>
      ),
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.full_name}</span>,
    },
    {
      accessorKey: "email",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Email</div>
        </div>
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.email}</span>,
    },
    {
      accessorKey: "phone",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Phone</div>
        </div>
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.phone}</span>,
    },
    {
      accessorKey: "age",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Age</div>
        </div>
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.age}</span>,
    },
    {
      accessorKey: "gender",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Gender</div>
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-sm capitalize">{row.original.gender}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Status</div>
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
          {row.original.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Actions</div>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link href={`/admin/participants/${row.original.id}`}>
            <Button size="icon-sm" variant="ghost" title="View details">
              <Eye className="size-4" />
            </Button>
          </Link>
          <Button 
            size="icon-sm" 
            variant="ghost" 
            title="Edit"
            onClick={() => setEditingParticipant(row.original)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button 
            size="icon-sm" 
            variant="ghost" 
            title="Delete"
            className="hover:text-red-500"
            onClick={() => handleDeleteParticipant(row.original.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: participants,
    columns,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);
  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="p-8 pb-32">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
        <div>
          <h1 className="text-2xl font-bold text-[#173d35]">Participants</h1>
          <p className="text-sm text-[#173d35]/60">Total: {total}</p>
        </div>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="outline"
          className="border-[#173d35] text-[#173d35]"
        >
          {exporting ? <LoadingSpinner size="sm" /> : <Download className="size-4" />}
          <span className="font-bold">Export</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#173d35]/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone..."
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
                    No participants
                  </td>
                </tr>
              )}
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[#f0f4f3] transition-colors ${row.getIsSelected() ? "bg-[#f0f4f3]" : "hover:bg-[#f0f4f3]/50"}`}
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
          <p className="text-sm text-[#173d35]/60">{total} participants</p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <span className="text-sm text-[#173d35]">{page} / {totalPages}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#173d35] text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-300 z-50">
          <div className="flex flex-col">
            <span className="text-sm font-bold">{selectedCount} selected</span>
          </div>
          
          <div className="h-6 w-px bg-white/20" />
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              className="bg-red-500 hover:bg-red-600 text-white gap-2"
              onClick={() => handleBulkAction("delete")}
              disabled={acting}
            >
              <Trash2 className="size-4" />
              <span>Delete</span>
            </Button>
            <Button 
              size="sm" 
              className="bg-white/10 hover:bg-white/20 text-white gap-2"
              onClick={() => handleBulkAction("deactivate")}
              disabled={acting}
            >
              <XCircle className="size-4" />
              <span>Deactivate</span>
            </Button>
            <Button 
              size="sm" 
              className="bg-white/10 hover:bg-white/20 text-white gap-2"
              onClick={() => handleBulkAction("activate")}
              disabled={acting}
            >
              <CheckCircle className="size-4" />
              <span>Activate</span>
            </Button>
          </div>
          
          <div className="h-6 w-px bg-white/20" />
          
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-white hover:bg-white/10"
            onClick={() => setRowSelection({})}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Participant</DialogTitle>
            <DialogDescription>
              Update participant's personal information.
            </DialogDescription>
          </DialogHeader>
          {editingParticipant && (
            <ParticipantForm 
              initialData={editingParticipant}
              onSuccess={() => {
                setEditingParticipant(null);
                fetchParticipants();
              }}
              onCancel={() => setEditingParticipant(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
