"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Star } from "lucide-react";

interface Programme {
  id: string;
  name: string;
  description: string | null;
  colour: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

interface ProgrammeFormData {
  id?: string;
  name: string;
  description: string;
  colour: string;
  is_default: boolean;
  sort_order: number;
}

const defaultForm: ProgrammeFormData = {
  name: "",
  description: "",
  colour: "#173d35",
  is_default: false,
  sort_order: 0,
};

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProgrammeFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProgrammes = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/programmes");
    if (res.ok) {
      const json = await res.json();
      setProgrammes(json.programmes ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProgrammes();
  }, [fetchProgrammes]);

  function openCreate() {
    setForm(defaultForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(prog: Programme) {
    setForm({
      id: prog.id,
      name: prog.name,
      description: prog.description ?? "",
      colour: prog.colour,
      is_default: prog.is_default,
      sort_order: prog.sort_order,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleToggleActive(prog: Programme) {
    await fetch(`/api/admin/programmes/${prog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !prog.is_active }),
    });
    fetchProgrammes();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const url = form.id ? `/api/admin/programmes/${form.id}` : "/api/admin/programmes";
    const method = form.id ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setFormError(json.error ?? "Ralat berlaku / An error occurred");
      setSaving(false);
      return;
    }

    setShowForm(false);
    fetchProgrammes();
    setSaving(false);
  }

  const columns: ColumnDef<Programme>[] = [
    {
      id: "colour",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Warna</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Colour</div>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md border border-white shadow-sm"
            style={{ backgroundColor: row.original.colour }}
          />
          <span className="text-xs text-[#173d35]/60 font-mono">{row.original.colour}</span>
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Nama</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Name</div>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{row.original.name}</span>
          {row.original.is_default && (
            <Star className="size-3 text-[#735b29] fill-[#735b29]" />
          )}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Penerangan</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Description</div>
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-[#173d35]/70">{row.original.description ?? "—"}</span>
      ),
    },
    {
      accessorKey: "sort_order",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Susunan</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Sort Order</div>
        </div>
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.sort_order}</span>,
    },
    {
      id: "active",
      header: () => (
        <div>
          <div className="font-bold text-[#173d35]">Aktif</div>
          <div className="text-xs text-[#173d35]/60 font-normal">Active</div>
        </div>
      ),
      cell: ({ row }) => (
        <Switch
          checked={row.original.is_active}
          onCheckedChange={() => handleToggleActive(row.original)}
        />
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
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => openEdit(row.original)}
        >
          <Pencil className="size-4" />
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: programmes,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#173d35]">Program</h1>
          <p className="text-sm text-[#173d35]/60">Programmes</p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#173d35] hover:bg-[#173d35]/90 text-white"
        >
          <Plus className="size-4" />
          <span className="font-bold">Program Baru</span>
          <span className="text-white/70">/ New Programme</span>
        </Button>
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
                    Tiada program / No programmes
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

      {/* Programme Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <span className="font-bold text-[#173d35]">
                {form.id ? "Kemaskini Program / Edit Programme" : "Program Baru / New Programme"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="prog_name">
                <span className="font-bold text-[#173d35]">Nama</span>
                <span className="block text-xs text-[#173d35]/60">Name</span>
              </Label>
              <Input
                id="prog_name"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="min-h-[48px]"
                placeholder="e.g. Pengajian, Zikir..."
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="prog_desc">
                <span className="font-bold text-[#173d35]">Penerangan</span>
                <span className="block text-xs text-[#173d35]/60">Description</span>
              </Label>
              <Input
                id="prog_desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="min-h-[48px]"
              />
            </div>

            {/* Colour */}
            <div className="space-y-1">
              <Label htmlFor="prog_colour">
                <span className="font-bold text-[#173d35]">Warna</span>
                <span className="block text-xs text-[#173d35]/60">Colour (hex)</span>
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.colour}
                  onChange={(e) => setForm((p) => ({ ...p, colour: e.target.value }))}
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer p-1"
                />
                <Input
                  id="prog_colour"
                  value={form.colour}
                  onChange={(e) => setForm((p) => ({ ...p, colour: e.target.value }))}
                  className="min-h-[48px] font-mono"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#173d35"
                />
                <div
                  className="w-12 h-12 rounded-lg border border-gray-200 shrink-0"
                  style={{ backgroundColor: form.colour }}
                />
              </div>
            </div>

            {/* Sort order */}
            <div className="space-y-1">
              <Label htmlFor="prog_sort">
                <span className="font-bold text-[#173d35]">Susunan</span>
                <span className="block text-xs text-[#173d35]/60">Sort Order</span>
              </Label>
              <Input
                id="prog_sort"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value, 10) || 0 }))}
                className="min-h-[48px]"
              />
            </div>

            {/* Is default */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))}
                className="rounded"
              />
              <div>
                <span className="text-sm font-bold text-[#173d35]">Program Lalai</span>
                <span className="block text-xs text-[#173d35]/60">Default Programme</span>
              </div>
            </label>

            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#173d35] hover:bg-[#173d35]/90 text-white"
              >
                {saving ? <LoadingSpinner size="sm" className="text-white" /> : (form.id ? "Kemaskini / Update" : "Simpan / Save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Batal / Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
