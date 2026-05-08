import Link from "next/link";
import Image from "next/image";
import { formatDateSGT } from "@/lib/utils/format";

interface Programme {
  id: string;
  name: string;
  colour: string;
  is_default: boolean;
}

interface SessionProgramme {
  programme_id: string;
  programmes: Programme | null;
}

interface ActiveSession {
  id: string;
  title: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  session_programmes: SessionProgramme[];
}

async function getActiveSessions(): Promise<ActiveSession[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const res = await fetch(`${baseUrl}/api/sessions/active`, {
      cache: "no-store",
    });

    if (!res.ok) return [];
    const json = await res.json();
    return (json.sessions ?? (json.session ? [json.session] : [])) as ActiveSession[];
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const sessions = await getActiveSessions();

  return (
    <div className="flex flex-col min-h-screen font-sans">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Santunan Emas logo"
            width={1920}
            height={1080}
            priority
            className="mb-5 h-[86px] w-[280px] object-cover sm:h-[104px] sm:w-[340px] md:h-[116px] md:w-[380px]"
          />
          <h1
            className="sr-only"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Santunan Emas
          </h1>
          <p className="text-xl font-semibold text-[#173d35] mb-1">
            Sistem Kehadiran Peserta
          </p>
          <p className="text-base text-[#173d35]/60">
            Participant Attendance System
          </p>
        </div>

        {/* Session Status Cards */}
        <div className="w-full max-w-md mb-10 space-y-3">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-[1.5rem] shadow-[0_20px_40px_rgba(11,28,48,0.06)] bg-white/80 backdrop-blur-sm p-6"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(23,61,53,0.08) 0%, rgba(115,91,41,0.06) 100%)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />
                    Sesi Aktif / Active Session
                  </span>
                </div>
                <p className="text-lg font-bold text-[#173d35] mb-1">
                  {session.title ?? "Sesi Hari Ini / Today's Session"}
                </p>
                <p className="text-sm text-[#173d35]/70 mb-4">
                  {formatDateSGT(session.session_date)}
                </p>
                {session.session_programmes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {session.session_programmes.map((sp) =>
                      sp.programmes ? (
                        <span
                          key={sp.programme_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: sp.programmes.colour }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block"
                          />
                          {sp.programmes.name}
                        </span>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] bg-[#f0f4f3] p-5">
              <p className="text-[#173d35]/50 font-semibold text-base">
                Tiada sesi aktif hari ini
              </p>
              <p className="text-[#173d35]/40 text-sm mt-0.5">
                No active session today
              </p>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Link
            href="/register"
            className="flex items-center justify-center min-h-[56px] rounded-[1rem] bg-gradient-to-br from-[#173d35] to-[#2f544c] text-white text-lg font-semibold shadow-[0_4px_16px_rgba(23,61,53,0.3)] transition-opacity hover:opacity-90 active:opacity-80"
          >
            <span className="flex flex-col items-center leading-tight">
              <span>Daftar Sekarang</span>
              <span className="text-white/80 text-sm font-normal">Register Now</span>
            </span>
          </Link>

          <Link
            href="/retrieve-qr"
            className="flex items-center justify-center min-h-[56px] rounded-[1rem] bg-[#f0f4f3] text-[#173d35] text-lg font-semibold ring-2 ring-[#173d35]/20 transition-colors hover:bg-[#e6eeec] active:bg-[#d9e8e4]"
          >
            <span className="flex flex-col items-center leading-tight">
              <span>Dapatkan QR Saya</span>
              <span className="text-[#173d35]/60 text-sm font-normal">Get My QR</span>
            </span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-[#173d35]/40">
        Santunan Emas &copy; 2026
      </footer>
    </div>
  );
}
