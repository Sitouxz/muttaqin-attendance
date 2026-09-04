import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";

interface SuccessPageProps {
  searchParams: Promise<{ name?: string; channel?: string; code?: string }>;
}

// SE's WhatsApp sender, digits only (wa.me format).
const SE_WA = (process.env.NEXT_PUBLIC_SE_WHATSAPP_NUMBER ?? "6589913776").replace(/\D/g, "");

export default async function RegisterSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const name = params.name
    ? (() => { try { return decodeURIComponent(params.name!); } catch { return params.name!; } })()
    : null;
  const isWhatsApp = params.channel === "whatsapp";
  const code = params.code ?? null;

  const waText = encodeURIComponent(
    `Salam, saya ingin terima kod QR pendaftaran saya${code ? ` (${code})` : ""}.`,
  );
  const waLink = `https://wa.me/${SE_WA}?text=${waText}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="rounded-[1.5rem] shadow-[0_20px_40px_rgba(11,28,48,0.06)] bg-white p-8 flex flex-col items-center gap-6">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#f0faf6]">
            <CheckCircle2 className="w-12 h-12 text-[#10B981]" strokeWidth={1.5} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[#173d35] mb-1">Pendaftaran Berjaya!</h1>
            <p className="text-[#173d35]/60 text-base">Registration Successful!</p>
          </div>

          {name && (
            <div className="rounded-[0.75rem] bg-[#f0f4f3] px-5 py-3 w-full">
              <p className="text-[#173d35]/60 text-sm">Selamat datang / Welcome</p>
              <p className="text-[#173d35] font-semibold text-lg">{name}</p>
            </div>
          )}

          {code && (
            <div className="rounded-[0.75rem] bg-[#f0f4f3] px-5 py-3 w-full">
              <p className="text-[#173d35]/60 text-sm">Kod Pendaftaran / Registration Code</p>
              <p className="text-[#173d35] font-bold text-2xl tracking-[0.2em]">{code}</p>
            </div>
          )}

          {isWhatsApp ? (
            <>
              <div>
                <p className="text-[#173d35] font-semibold">
                  Hantar mesej WhatsApp untuk terima kod QR anda
                </p>
                <p className="text-[#173d35]/60 text-sm mt-0.5">
                  Message us on WhatsApp to receive your QR code
                </p>
              </div>

              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full min-h-[56px] rounded-[1rem] bg-[#25D366] text-white text-lg font-semibold shadow-[0_4px_16px_rgba(37,211,102,0.35)] transition-opacity hover:opacity-90 active:opacity-80"
              >
                <MessageCircle className="w-6 h-6" strokeWidth={2} />
                <span className="flex flex-col items-center leading-tight">
                  <span>Buka WhatsApp</span>
                  <span className="text-white/85 text-sm font-normal">Open WhatsApp</span>
                </span>
              </a>
              <p className="text-[#173d35]/50 text-xs">
                +65 {SE_WA.replace(/^65/, "").replace(/(\d{4})(\d{4})/, "$1 $2")}
              </p>

              <Link href="/" className="text-[#173d35]/60 text-sm underline">
                Kembali ke Laman Utama / Back to Home
              </Link>
            </>
          ) : (
            <>
              <div>
                <p className="text-[#173d35] font-semibold">Sila semak e-mel anda</p>
                <p className="text-[#173d35]/60 text-sm mt-0.5">
                  Please check your email for your QR code
                </p>
              </div>

              <Link
                href="/"
                className="flex items-center justify-center w-full min-h-[56px] rounded-[1rem] bg-gradient-to-br from-[#173d35] to-[#2f544c] text-white text-lg font-semibold shadow-[0_4px_16px_rgba(23,61,53,0.3)] transition-opacity hover:opacity-90 active:opacity-80"
              >
                <span className="flex flex-col items-center leading-tight">
                  <span>Kembali ke Laman Utama</span>
                  <span className="text-white/80 text-sm font-normal">Back to Home</span>
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
