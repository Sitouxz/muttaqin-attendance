"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RegisterSchema, type RegisterInput, PARTICIPANT_CATEGORIES } from "@/lib/validations/participant";
import { BilingualLabel } from "@/components/shared/BilingualLabel";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils/cn";

const inputClass =
  "w-full min-h-[56px] text-[18px] px-4 py-3 rounded-[0.75rem] bg-[#f0f4f3] text-[#173d35] placeholder:text-[#173d35]/40 focus:outline-none focus:ring-2 focus:ring-[#173d35]/30 transition";

const errorClass = "text-red-600 text-sm mt-1";

export function RegistrationForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      participant_category: undefined,
      email_consent: false,
    },
  });

  async function onSubmit(data: RegisterInput) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status === 409) {
        setServerError("EMAIL_EXISTS");
        return;
      }

      if (res.status === 201) {
        router.push("/register/success?name=" + encodeURIComponent(data.full_name));
        return;
      }

      const json = await res.json().catch(() => ({}));
      setServerError(json?.error ?? "UNKNOWN_ERROR");
    } catch {
      setServerError("NETWORK_ERROR");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {/* Full Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="full_name">
          <BilingualLabel my="Nama Penuh" en="Full Name" />
        </label>
        <input
          id="full_name"
          type="text"
          autoComplete="name"
          className={cn(inputClass, errors.full_name && "ring-2 ring-red-400")}
          {...register("full_name")}
        />
        {errors.full_name && (
          <p className={errorClass}>{errors.full_name.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email">
          <BilingualLabel my="Emel" en="Email" />
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={cn(inputClass, errors.email && "ring-2 ring-red-400")}
          {...register("email")}
        />
        {errors.email && (
          <p className={errorClass}>{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone">
          <BilingualLabel my="Nombor Telefon" en="Phone Number" />
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[18px] text-[#173d35]/60 font-medium min-h-[56px] flex items-center px-3 rounded-[0.75rem] bg-[#e6eeec]">
            +65
          </span>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="9XXXXXXX"
            className={cn(inputClass, "flex-1", errors.phone && "ring-2 ring-red-400")}
            {...register("phone")}
          />
        </div>
        {errors.phone && (
          <p className={errorClass}>{errors.phone.message}</p>
        )}
      </div>

      {/* Age */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="age">
          <BilingualLabel my="Umur" en="Age" />
        </label>
        <input
          id="age"
          type="number"
          min={1}
          max={120}
          className={cn(inputClass, errors.age && "ring-2 ring-red-400")}
          {...register("age", { valueAsNumber: true })}
        />
        {errors.age && (
          <p className={errorClass}>{errors.age.message}</p>
        )}
      </div>

      {/* Postal Code */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="postal_code">
          <BilingualLabel my="Kod Pos" en="Postal Code" />
        </label>
        <input
          id="postal_code"
          type="text"
          maxLength={6}
          autoComplete="postal-code"
          className={cn(inputClass, errors.postal_code && "ring-2 ring-red-400")}
          {...register("postal_code")}
        />
        {errors.postal_code && (
          <p className={errorClass}>{errors.postal_code.message}</p>
        )}
      </div>

      {/* Participant Category */}
      <div className="flex flex-col gap-3">
        <label>
          <BilingualLabel my="Kategori Peserta" en="Participant Category" />
        </label>
        <div className="flex flex-col gap-2">
          {(
            [
              { value: "warga_emas", my: "Warga Emas", en: "Senior Citizen" },
              { value: "penjaga", my: "Penjaga", en: "Caregiver" },
              { value: "kedua_dua", my: "Kedua-dua (Warga Emas & Penjaga)", en: "Both (Senior Citizen & Caregiver)" },
              { value: "selain", my: "Selain yang di atas", en: "Other" },
            ] as const
          ).map(({ value, my, en }) => (
            <label
              key={value}
              className={cn(
                "flex items-center gap-3 min-h-[56px] px-4 rounded-[0.75rem] bg-[#f0f4f3] cursor-pointer transition",
                errors.participant_category && "ring-2 ring-red-400"
              )}
            >
              <input
                type="radio"
                value={value}
                className="h-5 w-5 accent-[#173d35] cursor-pointer"
                {...register("participant_category")}
              />
              <BilingualLabel my={my} en={en} size="sm" />
            </label>
          ))}
        </div>
        {errors.participant_category && (
          <p className={errorClass}>{errors.participant_category.message}</p>
        )}
      </div>

      {/* Email Consent */}
      <div className="flex items-start gap-3 rounded-[0.75rem] bg-[#f0f4f3] p-4">
        <input
          id="email_consent"
          type="checkbox"
          className="mt-1 h-5 w-5 accent-[#173d35] cursor-pointer"
          {...register("email_consent")}
        />
        <label htmlFor="email_consent" className="cursor-pointer">
          <BilingualLabel
            my="Persetujuan Emel"
            en="I consent to receive updates and communications via email"
            size="sm"
          />
        </label>
      </div>

      {/* Server Error */}
      {serverError && (
        <div
          role="alert"
          className="rounded-[0.75rem] bg-red-50 p-4 text-red-700"
        >
          {serverError === "EMAIL_EXISTS" ? (
            <>
              <p className="font-semibold">E-mel sudah didaftarkan</p>
              <p className="text-sm opacity-80">Email already registered</p>
            </>
          ) : (
            <>
              <p className="font-semibold">Ralat berlaku. Sila cuba semula.</p>
              <p className="text-sm opacity-80">An error occurred. Please try again.</p>
            </>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex items-center justify-center gap-3 min-h-[56px] rounded-[1rem] bg-gradient-to-br from-[#173d35] to-[#2f544c] text-white text-lg font-semibold shadow-[0_4px_16px_rgba(23,61,53,0.3)] transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <LoadingSpinner size="sm" className="text-white" />
            <span>Mendaftar... / Registering...</span>
          </>
        ) : (
          <span className="flex flex-col items-center leading-tight">
            <span>Daftar Sekarang</span>
            <span className="text-white/80 text-sm font-normal">Register Now</span>
          </span>
        )}
      </button>
    </form>
  );
}
