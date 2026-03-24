"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Download } from "lucide-react";
import { BilingualLabel } from "@/components/shared/BilingualLabel";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils/cn";

type Step = "email" | "otp" | "success";

interface ErrorState {
  code: string;
  my: string;
  en: string;
}

const inputClass =
  "w-full min-h-[56px] text-[18px] px-4 py-3 rounded-[0.75rem] bg-[#f0f4f3] text-[#173d35] placeholder:text-[#173d35]/40 focus:outline-none focus:ring-2 focus:ring-[#173d35]/30 transition";

function getOtpError(code: string): ErrorState {
  switch (code) {
    case "INVALID_OTP":
      return {
        code,
        my: "Kod pengesahan tidak sah",
        en: "Invalid verification code",
      };
    case "OTP_EXPIRED":
      return {
        code,
        my: "Kod pengesahan telah tamat tempoh",
        en: "Verification code has expired",
      };
    case "OTP_NOT_FOUND":
      return {
        code,
        my: "Tiada kod pengesahan aktif",
        en: "No active verification code found",
      };
    default:
      return {
        code,
        my: "Ralat berlaku. Sila cuba semula.",
        en: "An error occurred. Please try again.",
      };
  }
}

function getEmailError(code: string): ErrorState {
  switch (code) {
    case "EMAIL_NOT_FOUND":
      return {
        code,
        my: "E-mel tidak dijumpai dalam sistem",
        en: "Email not found in our system",
      };
    default:
      return {
        code,
        my: "Ralat berlaku. Sila cuba semula.",
        en: "An error occurred. Please try again.",
      };
  }
}

export default function RetrieveQrPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/retrieve-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        setStep("otp");
      } else {
        setError(getEmailError(json?.error ?? "UNKNOWN"));
      }
    } catch {
      setError(getEmailError("NETWORK_ERROR"));
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/retrieve-qr/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        setQrImageUrl(json.qr_image_url);
        setStep("success");
      } else {
        setError(getOtpError(json?.error ?? "UNKNOWN"));
      }
    } catch {
      setError(getOtpError("NETWORK_ERROR"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#f0f4f3] text-[#173d35] hover:bg-[#e6eeec] transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#173d35]">Dapatkan QR Saya</h1>
            <p className="text-sm text-[#173d35]/60">Get My QR Code</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {(["email", "otp", "success"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                  step === s
                    ? "bg-[#173d35] text-white"
                    : ["email", "otp", "success"].indexOf(step) > i
                    ? "bg-[#10B981] text-white"
                    : "bg-[#f0f4f3] text-[#173d35]/40"
                )}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 w-8 transition-colors",
                    ["email", "otp", "success"].indexOf(step) > i
                      ? "bg-[#10B981]"
                      : "bg-[#f0f4f3]"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-[1.5rem] shadow-[0_20px_40px_rgba(11,28,48,0.06)] bg-white p-6">
          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} noValidate className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-bold text-[#173d35] mb-1">
                  Masukkan E-mel Anda
                </h2>
                <p className="text-sm text-[#173d35]/60">Enter your registered email address</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="retrieve-email">
                  <BilingualLabel my="Emel" en="Email" />
                </label>
                <input
                  id="retrieve-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="nama@emel.com"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-[0.75rem] bg-red-50 p-4 text-red-700">
                  <p className="font-semibold">{error.my}</p>
                  <p className="text-sm opacity-80">{error.en}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="flex items-center justify-center gap-3 min-h-[56px] rounded-[1rem] bg-gradient-to-br from-[#173d35] to-[#2f544c] text-white text-lg font-semibold shadow-[0_4px_16px_rgba(23,61,53,0.3)] transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="text-white" />
                    <span>Menghantar... / Sending...</span>
                  </>
                ) : (
                  <span className="flex flex-col items-center leading-tight">
                    <span>Hantar Kod OTP</span>
                    <span className="text-white/80 text-sm font-normal">Send OTP Code</span>
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} noValidate className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-bold text-[#173d35] mb-1">
                  Masukkan Kod Pengesahan
                </h2>
                <p className="text-sm text-[#173d35]/60">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-semibold text-[#173d35]">{email}</span>
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="otp-input">
                  <BilingualLabel my="Kod Pengesahan" en="Verification Code" />
                </label>
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className={cn(inputClass, "tracking-[0.5em] text-center")}
                  placeholder="000000"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-[0.75rem] bg-red-50 p-4 text-red-700">
                  <p className="font-semibold">{error.my}</p>
                  <p className="text-sm opacity-80">{error.en}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex items-center justify-center gap-3 min-h-[56px] rounded-[1rem] bg-gradient-to-br from-[#173d35] to-[#2f544c] text-white text-lg font-semibold shadow-[0_4px_16px_rgba(23,61,53,0.3)] transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="text-white" />
                    <span>Mengesahkan... / Verifying...</span>
                  </>
                ) : (
                  <span className="flex flex-col items-center leading-tight">
                    <span>Sahkan Kod</span>
                    <span className="text-white/80 text-sm font-normal">Verify Code</span>
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
                className="text-sm text-[#173d35]/60 underline underline-offset-2 hover:text-[#173d35] transition-colors"
              >
                Tukar e-mel / Change email
              </button>
            </form>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div>
                <h2 className="text-lg font-bold text-[#173d35] mb-1">
                  QR Kod Anda / Your QR Code
                </h2>
                <p className="text-sm text-[#173d35]/60">
                  Tunjukkan kod ini kepada pengurus / Show this code to the organiser
                </p>
              </div>

              {qrImageUrl ? (
                <>
                  <div className="rounded-[1rem] overflow-hidden shadow-[0_8px_24px_rgba(23,61,53,0.12)] bg-white p-4">
                    <Image
                      src={qrImageUrl}
                      alt="QR Code"
                      width={280}
                      height={280}
                      className="w-full max-w-[280px]"
                      unoptimized
                    />
                  </div>

                  <a
                    href={qrImageUrl}
                    download="santunan-emas-qr.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 min-h-[56px] w-full rounded-[1rem] bg-gradient-to-br from-[#173d35] to-[#2f544c] text-white text-lg font-semibold shadow-[0_4px_16px_rgba(23,61,53,0.3)] transition-opacity hover:opacity-90 active:opacity-80"
                  >
                    <Download className="w-5 h-5" />
                    <span className="flex flex-col items-start leading-tight">
                      <span>Muat Turun QR</span>
                      <span className="text-white/80 text-sm font-normal">Download QR</span>
                    </span>
                  </a>
                </>
              ) : (
                <div className="rounded-[0.75rem] bg-[#f0f4f3] p-6 w-full">
                  <p className="text-[#173d35]/60 text-sm">
                    QR kod tidak dijumpai. Sila hubungi pengurus.
                  </p>
                  <p className="text-[#173d35]/40 text-xs mt-1">
                    QR code not found. Please contact the organiser.
                  </p>
                </div>
              )}

              <Link
                href="/"
                className="text-sm text-[#173d35]/60 underline underline-offset-2 hover:text-[#173d35] transition-colors"
              >
                Kembali ke Laman Utama / Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
