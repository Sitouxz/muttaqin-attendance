"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ScanResultCard, type ScanResult } from "./ScanResultCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const WalkInSchema = z.object({
  full_name: z.string().min(2, "Nama diperlukan / Name required"),
  phone: z.string().min(8, "Nombor telefon tidak sah / Invalid phone number"),
  age: z.string().min(1, "Umur diperlukan / Age required"),
  postal_code: z.string().min(5, "Poskod tidak sah / Invalid postal code"),
  email: z.string().email("E-mel tidak sah / Invalid email").optional().or(z.literal("")),
});

type WalkInFormData = z.infer<typeof WalkInSchema>;

interface WalkInFormProps {
  sessionId: string;
  programmeIds: string[];
  onSuccess: () => void;
}

export function WalkInForm({ sessionId, programmeIds, onSuccess }: WalkInFormProps) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WalkInFormData>({
    resolver: zodResolver(WalkInSchema),
  });

  const onSubmit = async (data: WalkInFormData) => {
    setSubmitting(true);
    try {
      // Step 1: Register participant
      const regRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: data.full_name,
          phone: data.phone,
          age: Number(data.age),
          postal_code: data.postal_code,
          email: data.email || "",
        }),
      });

      if (!regRes.ok) {
        const err = await regRes.json();
        setResult({ type: "error", message: err?.error ?? "Pendaftaran gagal / Registration failed" });
        return;
      }

      const { participant } = await regRes.json();

      // Step 2: Check in
      const checkRes = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: participant.id,
          session_id: sessionId,
          programme_ids: programmeIds,
          check_in_method: "walk_in",
        }),
      });

      if (!checkRes.ok) {
        const err = await checkRes.json();
        setResult({ type: "error", message: err?.error ?? "Daftar masuk gagal / Check-in failed" });
        return;
      }

      const checkData = await checkRes.json();
      setResult({
        type: "success",
        participantName: checkData.participant?.full_name ?? data.full_name,
      });
      reset();
    } catch {
      setResult({ type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setResult(null);
    if (result?.type === "success") {
      onSuccess();
    }
  };

  return (
    <div className="relative">
      {result && <ScanResultCard result={result} onDismiss={handleDismiss} />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
        <div className="space-y-1">
          <Label htmlFor="full_name">
            <span className="font-bold">Nama Penuh</span>{" "}
            <span className="text-muted-foreground font-normal text-xs">/ Full Name</span>
          </Label>
          <Input id="full_name" {...register("full_name")} placeholder="Ahmad bin Ali" />
          {errors.full_name && (
            <p className="text-destructive text-xs">{errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="phone">
            <span className="font-bold">Nombor Telefon</span>{" "}
            <span className="text-muted-foreground font-normal text-xs">/ Phone Number</span>
          </Label>
          <Input id="phone" {...register("phone")} placeholder="0123456789" type="tel" />
          {errors.phone && (
            <p className="text-destructive text-xs">{errors.phone.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="age">
              <span className="font-bold">Umur</span>{" "}
              <span className="text-muted-foreground font-normal text-xs">/ Age</span>
            </Label>
            <Input id="age" {...register("age")} placeholder="25" type="number" min="1" max="120" />
            {errors.age && (
              <p className="text-destructive text-xs">{errors.age.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="postal_code">
              <span className="font-bold">Poskod</span>{" "}
              <span className="text-muted-foreground font-normal text-xs">/ Postal Code</span>
            </Label>
            <Input id="postal_code" {...register("postal_code")} placeholder="50000" />
            {errors.postal_code && (
              <p className="text-destructive text-xs">{errors.postal_code.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">
            <span className="font-bold">E-mel</span>{" "}
            <span className="text-muted-foreground font-normal text-xs">/ Email (optional)</span>
          </Label>
          <Input id="email" {...register("email")} placeholder="ahmad@contoh.com" type="email" />
          {errors.email && (
            <p className="text-destructive text-xs">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#173d35] hover:bg-[#173d35]/90 text-white"
        >
          {submitting ? (
            "Mendaftar... / Registering..."
          ) : (
            <>
              <span className="font-bold">Daftar &amp; Masuk</span>
              <span className="font-normal ml-1">/ Register &amp; Check In</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
