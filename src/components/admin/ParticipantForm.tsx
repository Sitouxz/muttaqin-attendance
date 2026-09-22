"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Switch } from "@/components/ui/switch";
import { GENDERS, PARTICIPANT_CATEGORIES, type Gender, type ParticipantCategory } from "@/lib/validations/participant";
import { GENDER_LABELS, PARTICIPANT_CATEGORY_LABELS } from "@/lib/utils/constants";

interface ParticipantFormData {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  gender: Gender;
  postal_code: string;
  participant_category: ParticipantCategory;
  is_active: boolean;
}

// A validation failure comes back as a zod flatten(), not a string -- render
// the first field message rather than dropping an object into JSX.
function readError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const { fieldErrors, formErrors } = error as {
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
    };
    const first =
      Object.values(fieldErrors ?? {})
        .flat()
        .find(Boolean) ?? formErrors?.find(Boolean);
    if (first) return first;
  }
  return "An error occurred";
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px]";

interface ParticipantFormProps {
  initialData?: ParticipantFormData;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ParticipantForm({ initialData, onSuccess, onCancel }: ParticipantFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ParticipantFormData>({
    full_name: initialData?.full_name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    age: initialData?.age ?? 18,
    gender: initialData?.gender ?? "unspecified",
    postal_code: initialData?.postal_code ?? "",
    participant_category: initialData?.participant_category ?? "selain",
    is_active: initialData?.is_active ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url = `/api/admin/participants/${initialData?.id}`;
    const method = "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(readError(json.error));
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Full Name */}
      <div className="space-y-1">
        <Label htmlFor="full_name">
          <span className="font-bold text-[#173d35]">Full Name</span>
        </Label>
        <Input
          id="full_name"
          required
          value={form.full_name}
          onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
          placeholder="Enter full name..."
          className="min-h-[48px]"
        />
      </div>

      {/* Email */}
      <div className="space-y-1">
        <Label htmlFor="email">
          <span className="font-bold text-[#173d35]">Email</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="name@example.com"
          className="min-h-[48px]"
        />
        <p className="text-xs text-[#173d35]/50">
          Leave blank for participants who registered over WhatsApp.
        </p>
      </div>

      {/* Phone & Age */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="phone">
            <span className="font-bold text-[#173d35]">Phone</span>
          </Label>
          <Input
            id="phone"
            required
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="81234567"
            className="min-h-[48px]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="age">
            <span className="font-bold text-[#173d35]">Age</span>
          </Label>
          <Input
            id="age"
            type="number"
            required
            min={1}
            value={form.age}
            onChange={(e) => setForm((p) => ({ ...p, age: parseInt(e.target.value) }))}
            className="min-h-[48px]"
          />
        </div>
      </div>

      {/* Postal Code */}
      <div className="space-y-1">
        <Label htmlFor="postal_code">
          <span className="font-bold text-[#173d35]">Postal Code</span>
        </Label>
        <Input
          id="postal_code"
          required
          value={form.postal_code}
          onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
          placeholder="123456"
          className="min-h-[48px]"
        />
      </div>

      {/* Gender */}
      <div className="space-y-1">
        <Label htmlFor="gender">
          <span className="font-bold text-[#173d35]">Gender</span>
        </Label>
        <select
          id="gender"
          className={selectClass}
          value={form.gender}
          onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as Gender }))}
        >
          {GENDERS.map((g) => (
            <option key={g} value={g}>{GENDER_LABELS[g].en}</option>
          ))}
        </select>
      </div>

      {/* Participant Category */}
      <div className="space-y-1">
        <Label htmlFor="participant_category">
          <span className="font-bold text-[#173d35]">Participant Category</span>
        </Label>
        <select
          id="participant_category"
          className={selectClass}
          value={form.participant_category}
          onChange={(e) =>
            setForm((p) => ({ ...p, participant_category: e.target.value as ParticipantCategory }))
          }
        >
          {PARTICIPANT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{PARTICIPANT_CATEGORY_LABELS[c].en}</option>
          ))}
        </select>
      </div>

      {/* Status Swathes */}
      <div className="pt-2">
        <div className="flex items-center justify-between p-3 bg-[#f0f4f3] rounded-lg">
          <div>
            <p className="text-xs font-bold text-[#173d35]">Active Status</p>
          </div>
          <Switch
            checked={form.is_active}
            onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
          />
        </div>
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
          {loading ? <LoadingSpinner size="sm" className="text-white" /> : "Save"}
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
