"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Switch } from "@/components/ui/switch";
import { PARTICIPANT_CATEGORY_LABELS } from "@/lib/utils/constants";
import { PARTICIPANT_CATEGORIES, type ParticipantCategory } from "@/lib/validations/participant";

type Gender = "male" | "female" | "unspecified";

interface ParticipantFormData {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  gender: Gender;
  participant_category: ParticipantCategory;
  postal_code: string;
  is_active: boolean;
}

/** Read-only context shown above the fields so staff can reach the card here. */
interface ParticipantFormContext {
  serial_code?: string;
  reg_channel?: "email" | "whatsapp";
  qr_card_url?: string | null;
  qr_image_url?: string | null;
}

interface ParticipantFormProps {
  initialData?: ParticipantFormData & ParticipantFormContext;
  onSuccess: () => void;
  onCancel: () => void;
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px]";

export function ParticipantForm({ initialData, onSuccess, onCancel }: ParticipantFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWhatsApp = initialData?.reg_channel === "whatsapp";
  const cardUrl = initialData?.qr_card_url ?? initialData?.qr_image_url ?? null;

  const [form, setForm] = useState<ParticipantFormData>({
    full_name: initialData?.full_name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    age: initialData?.age ?? 18,
    gender: initialData?.gender ?? "unspecified",
    participant_category: initialData?.participant_category ?? "selain",
    postal_code: initialData?.postal_code ?? "",
    is_active: initialData?.is_active ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/admin/participants/${initialData?.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      // An empty email clears the column rather than failing validation — a
      // WhatsApp-route registrant never had one to begin with.
      body: JSON.stringify({ ...form, email: form.email.trim() || null }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(
        typeof json.error === "string"
          ? json.error
          : "Please check the highlighted values and try again",
      );
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Code + QR — read-only, so staff can hand the card out from here */}
      {(initialData?.serial_code || cardUrl) && (
        <div className="flex items-center gap-4 p-3 bg-[#f0f4f3] rounded-lg">
          {cardUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardUrl}
              alt="QR card"
              className="w-20 shrink-0 rounded border border-white bg-white"
            />
          ) : (
            <div className="w-20 h-20 shrink-0 rounded border-2 border-dashed border-[#173d35]/20 flex items-center justify-center">
              <span className="text-[10px] text-[#173d35]/40">No QR</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#173d35]/60">Code</p>
            <p className="font-mono text-sm tracking-wider text-[#173d35]">
              {initialData?.serial_code ?? "—"}
            </p>
            <p className="text-xs text-[#173d35]/60 mt-1">
              Registered via {isWhatsApp ? "WhatsApp" : "Email"}
            </p>
            {cardUrl && (
              <a
                href={cardUrl}
                download={`${initialData?.serial_code ?? "qr"}.png`}
                className="text-xs text-[#173d35] underline underline-offset-2"
              >
                Download QR
              </a>
            )}
          </div>
        </div>
      )}

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

      {/* Email — optional: WhatsApp-route registrants have none */}
      <div className="space-y-1">
        <Label htmlFor="email">
          <span className="font-bold text-[#173d35]">Email</span>
          <span className="ml-1 text-xs font-normal text-[#173d35]/50">(optional)</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder={isWhatsApp ? "No email — registered via WhatsApp" : "nama@emel.com"}
          className="min-h-[48px]"
        />
      </div>

      {/* Phone & Age */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="phone">
            <span className="font-bold text-[#173d35]">
              {isWhatsApp ? "Phone (WhatsApp)" : "Phone"}
            </span>
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
          <option value="unspecified">Unspecified</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
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
            setForm((p) => ({
              ...p,
              participant_category: e.target.value as ParticipantCategory,
            }))
          }
        >
          {PARTICIPANT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {PARTICIPANT_CATEGORY_LABELS[c]}
            </option>
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
