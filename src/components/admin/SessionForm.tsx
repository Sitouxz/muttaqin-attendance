"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface Programme {
  id: string;
  name: string;
  colour: string;
}

interface SessionFormData {
  id?: string;
  session_date: string;
  title: string;
  start_time: string;
  end_time: string;
  notes: string;
  programme_ids: string[];
  status?: string;
}

interface SessionFormProps {
  initialData?: Partial<SessionFormData>;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SessionForm({ initialData, onSuccess, onCancel }: SessionFormProps) {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgs, setLoadingProgs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<SessionFormData>({
    session_date: initialData?.session_date ?? "",
    title: initialData?.title ?? "",
    start_time: initialData?.start_time ?? "",
    end_time: initialData?.end_time ?? "",
    notes: initialData?.notes ?? "",
    programme_ids: initialData?.programme_ids ?? [],
  });

  useEffect(() => {
    async function fetchProgrammes() {
      const res = await fetch("/api/admin/programmes");
      if (res.ok) {
        const json = await res.json();
        setProgrammes((json.programmes ?? []).filter((p: Programme & { is_active: boolean }) => p.is_active));
      }
      setLoadingProgs(false);
    }
    fetchProgrammes();
  }, []);

  function toggleProgramme(id: string) {
    setForm((prev) => ({
      ...prev,
      programme_ids: prev.programme_ids.includes(id)
        ? prev.programme_ids.filter((pid) => pid !== id)
        : [...prev.programme_ids, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url = initialData?.id
      ? `/api/admin/sessions/${initialData.id}`
      : "/api/admin/sessions";
    const method = initialData?.id ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Ralat berlaku / An error occurred");
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date */}
      <div className="space-y-1">
        <Label htmlFor="session_date">
          <span className="font-bold text-[#173d35]">Tarikh Sesi</span>
          <span className="block text-xs text-[#173d35]/60">Session Date</span>
        </Label>
        <Input
          id="session_date"
          type="date"
          required
          value={form.session_date}
          onChange={(e) => setForm((p) => ({ ...p, session_date: e.target.value }))}
          className="min-h-[48px]"
        />
      </div>

      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="title">
          <span className="font-bold text-[#173d35]">Tajuk</span>
          <span className="block text-xs text-[#173d35]/60">Title (optional)</span>
        </Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          className="min-h-[48px]"
          placeholder="Sesi Jumaat..."
        />
      </div>

      {/* Time range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="start_time">
            <span className="font-bold text-[#173d35]">Masa Mula</span>
            <span className="block text-xs text-[#173d35]/60">Start Time</span>
          </Label>
          <Input
            id="start_time"
            type="time"
            value={form.start_time}
            onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
            className="min-h-[48px]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="end_time">
            <span className="font-bold text-[#173d35]">Masa Tamat</span>
            <span className="block text-xs text-[#173d35]/60">End Time</span>
          </Label>
          <Input
            id="end_time"
            type="time"
            value={form.end_time}
            onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
            className="min-h-[48px]"
          />
        </div>
      </div>

      {/* Programmes */}
      <div className="space-y-2">
        <Label>
          <span className="font-bold text-[#173d35]">Program</span>
          <span className="block text-xs text-[#173d35]/60">Programmes</span>
        </Label>
        {loadingProgs ? (
          <LoadingSpinner size="sm" />
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {programmes.map((prog) => (
              <label key={prog.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.programme_ids.includes(prog.id)}
                  onChange={() => toggleProgramme(prog.id)}
                  className="rounded"
                />
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: prog.colour }}
                />
                <span className="text-sm text-[#173d35]">{prog.name}</span>
              </label>
            ))}
            {programmes.length === 0 && (
              <p className="text-sm text-[#173d35]/50">Tiada program / No programmes</p>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label htmlFor="notes">
          <span className="font-bold text-[#173d35]">Nota</span>
          <span className="block text-xs text-[#173d35]/60">Notes (optional)</span>
        </Label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          className="w-full min-h-[80px] px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#173d35]/20"
          placeholder="Nota tambahan..."
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#173d35] hover:bg-[#173d35]/90 text-white"
        >
          {loading ? <LoadingSpinner size="sm" className="text-white" /> : (
            initialData?.id ? "Kemaskini / Update" : "Simpan / Save"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Batal / Cancel
        </Button>
      </div>
    </form>
  );
}
