"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface Programme {
  id: string;
  name: string;
  colour: string;
}

interface AgendaItem {
  _key: string;
  title: string;
}

interface SessionFormData {
  id?: string;
  session_date: string;
  title: string;
  start_time: string;
  end_time: string;
  notes: string;
  programme_ids: string[];
  agenda: AgendaItem[];
  status?: string;
  activate_immediately: boolean;
}

interface SessionFormProps {
  initialData?: Partial<Omit<SessionFormData, "agenda">> & {
    agenda?: Array<{ id: string; title: string; sort_order: number }>;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

function SortableAgendaItem({
  item,
  onChange,
  onRemove,
}: {
  item: AgendaItem;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item._key });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
        className="cursor-grab text-[#173d35]/30 hover:text-[#173d35]/60 shrink-0"
      >
        <GripVertical className="size-4" />
      </button>
      <Input
        value={item.title}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Activity title"
        className="flex-1 min-h-[40px] text-sm"
      />
      <button
        type="button"
        aria-label="Remove item"
        onClick={onRemove}
        className="text-[#173d35]/30 hover:text-red-400 shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function SessionForm({ initialData, onSuccess, onCancel }: SessionFormProps) {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgs, setLoadingProgs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const [form, setForm] = useState<SessionFormData>({
    session_date: initialData?.session_date ?? "",
    title: initialData?.title ?? "",
    start_time: initialData?.start_time ?? "",
    end_time: initialData?.end_time ?? "",
    notes: initialData?.notes ?? "",
    programme_ids: initialData?.programme_ids ?? [],
    agenda: (initialData?.agenda ?? []).map((item) => ({
      _key: item.id,
      title: item.title,
    })),
    activate_immediately: false,
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

  function addAgendaItem() {
    setForm((prev) => ({
      ...prev,
      agenda: [...prev.agenda, { _key: crypto.randomUUID(), title: "" }],
    }));
  }

  function updateAgendaItem(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      agenda: prev.agenda.map((item) =>
        item._key === key ? { ...item, title: value } : item
      ),
    }));
  }

  function removeAgendaItem(key: string) {
    setForm((prev) => ({
      ...prev,
      agenda: prev.agenda.filter((item) => item._key !== key),
    }));
  }

  function handleAgendaDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setForm((prev) => {
        const oldIndex = prev.agenda.findIndex((i) => i._key === active.id);
        const newIndex = prev.agenda.findIndex((i) => i._key === over.id);
        return { ...prev, agenda: arrayMove(prev.agenda, oldIndex, newIndex) };
      });
    }
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
      body: JSON.stringify({
        ...form,
        agenda: form.agenda.map(({ title }) => ({ title })),
        status: form.activate_immediately ? "active" : "draft",
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "An error occurred");
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
          <span className="font-bold text-[#173d35]">Session Date</span>
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
          <span className="font-bold text-[#173d35]">Title (optional)</span>
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
            <span className="font-bold text-[#173d35]">Start Time</span>
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
            <span className="font-bold text-[#173d35]">End Time</span>
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
          <span className="font-bold text-[#173d35]">Programmes</span>
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
              <p className="text-sm text-[#173d35]/50">No programmes</p>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label htmlFor="notes">
          <span className="font-bold text-[#173d35]">Notes (optional)</span>
        </Label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          className="w-full min-h-[80px] px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#173d35]/20"
          placeholder="Nota tambahan..."
        />
      </div>

      {/* Agenda */}
      <div className="space-y-2">
        <Label>
          <span className="font-bold text-[#173d35]">Agenda / Rundown (optional)</span>
        </Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAgendaDragEnd}>
          <SortableContext items={form.agenda.map((i) => i._key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {form.agenda.map((item) => (
                <SortableAgendaItem
                  key={item._key}
                  item={item}
                  onChange={(value) => updateAgendaItem(item._key, value)}
                  onRemove={() => removeAgendaItem(item._key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button
          type="button"
          onClick={addAgendaItem}
          className="flex items-center gap-1.5 text-sm text-[#173d35]/60 hover:text-[#173d35] transition-colors"
        >
          <Plus className="size-3.5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Activate immediately — only show for new sessions */}
      {!initialData?.id && (
        <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-[#10B981]/30 bg-[#10B981]/5 px-3 py-2.5">
          <input
            type="checkbox"
            checked={form.activate_immediately}
            onChange={(e) => setForm((p) => ({ ...p, activate_immediately: e.target.checked }))}
            className="rounded"
          />
          <div>
            <span className="text-sm font-bold text-[#173d35]">Activate immediately</span>
            <span className="block text-xs text-[#173d35]/60">Session will appear on the home page and scanner</span>
          </div>
        </label>
      )}

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
            initialData?.id ? "Update" : "Save"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
