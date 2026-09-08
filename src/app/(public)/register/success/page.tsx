import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Download, MessageCircle } from "lucide-react";

interface SuccessPageProps {
  searchParams: Promise<{ name?: string; channel?: string; code?: string; card?: string }>;
}

// SE's WhatsApp sender, digits only (wa.me format).
const SE_WA = (process.env.NEXT_PUBLIC_SE_WHATSAPP_NUMBER ?? "6589913776").replace(/\D/g, "");

/**
 * The card URL arrives in the query string, so only accept one that actually
 * points at our own storage — a crafted `?card=` must not render as if it were
 * the participant's QR.
 */
function safeCardUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    if (url.protocol !== "https:") return null;
    if (url.hostname !== supabaseHost) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default async function RegisterSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const name = params.name
    ? (() => { try { return decodeURIComponent(params.name!); } catch { return params.name!; } })()
    : null;
  const isWhatsApp = params.channel === "whatsapp";
  const code = params.code ?? null;
  const cardUrl = safeCardUrl(params.card);
  // Supabase serves the object with Content-Disposition: attachment for this.
  const downloadUrl = cardUrl
    ? `${cardUrl}?download=${encodeURIComponent(`${code ?? "santunan-emas"}.png`)}`
    : null;

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

          {/* The card is ready the moment registration succeeds — show it here so
              nobody has to message the bot (or wait for email) to get their QR. */}
          {cardUrl && (
            <div className="w-full flex flex-col items-center gap-4">
              <div>
                <p className="text-[#173d35] font-semibold">Kod QR anda sudah sedia</p>
                <p className="text-[#173d35]/60 text-sm mt-0.5">Your QR code is ready</p>
              </div>

              <Image
                src={cardUrl}
                alt={`Kad QR Santunan Emas${code ? ` ${code}` : ""}`}
                width={320}
                height={420}
                unoptimized
                priority
                className="w-full max-w-[280px] h-auto rounded-[0.75rem] shadow-[0_8px_24px_rgba(11,28,48,0.12)]"
              />

              <a
                href={downloadUrl!}
                className="flex items-center justify-center gap-2 w-full min-h-[56px] rounded-[1rem] bg-gradient-to-br from-[#173d35] to-[#2f544c] text-white text-lg font-semibold shadow-[0_4px_16px_rgba(23,61,53,0.3)] transition-opacity hover:opacity-90 active:opacity-80"
              >
                <Download className="w-5 h-5" strokeWidth={2} />
                <span className="flex flex-col items-center leading-tight">
                  <span>Simpan Kod QR</span>
                  <span className="text-white/80 text-sm font-normal">Save QR code</span>
                </span>
              </a>
              <p className="text-[#173d35]/50 text-xs -mt-2">
                Tunjukkan kod ini semasa pendaftaran / Show this at registration
              </p>
            </div>
          )}

          {isWhatsApp ? (
            <>
              <div>
                <p className="text-[#173d35] font-semibold">
                  {cardUrl
                    ? "Mahu salinan di WhatsApp juga?"
                    : "Hantar mesej WhatsApp untuk terima kod QR anda"}
                </p>
                <p className="text-[#173d35]/60 text-sm mt-0.5">
                  {cardUrl
                    ? "Want a copy on WhatsApp too? Message us and we'll send it."
                    : "Message us on WhatsApp to receive your QR code"}
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

              {/* The card already owns the primary button when it is shown. */}
              {cardUrl ? (
                <Link href="/" className="text-[#173d35]/60 text-sm underline">
                  Kembali ke Laman Utama / Back to Home
                </Link>
              ) : (
                <Link
                  href="/"
                  className="flex items-center justify-center w-full min-h-[56px] rounded-[1rem] bg-gradient-to-br from-[#173d35] to-[#2f544c] text-white text-lg font-semibold shadow-[0_4px_16px_rgba(23,61,53,0.3)] transition-opacity hover:opacity-90 active:opacity-80"
                >
                  <span className="flex flex-col items-center leading-tight">
                    <span>Kembali ke Laman Utama</span>
                    <span className="text-white/80 text-sm font-normal">Back to Home</span>
                  </span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
