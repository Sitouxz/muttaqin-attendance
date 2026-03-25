"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatDateTimeSGT, formatDateSGT } from "@/lib/utils/format";
import { CHECK_IN_METHOD_LABELS, type CheckInMethod } from "@/lib/utils/constants";

interface Participant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  postal_code: string;
  is_active: boolean;
  email_consent: boolean;
  created_at: string;
  qr_image_url: string | null;
  qr_token: string;
}

interface AttendanceRecord {
  id: string;
  checked_in_at: string;
  check_in_method: string;
  notes: string | null;
  sessions: { id: string; session_date: string; title: string | null; status: string } | null;
  programmes: { id: string; name: string; colour: string } | null;
}

export default function ParticipantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/admin/participants/${id}`);
    if (res.ok) {
      const json = await res.json();
      setParticipant(json.participant);
      setAttendance(json.attendance ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleResendQr() {
    if (!confirm("Jana semula dan hantar QR baru? / Regenerate and send new QR?")) return;
    setResending(true);
    setResendMsg(null);
    const res = await fetch(`/api/admin/participants/${id}/resend-qr`, { method: "POST" });
    if (res.ok) {
      setResendMsg("QR berjaya dihantar semula / QR successfully resent");
      await fetchData();
    } else {
      setResendMsg("Ralat berlaku / An error occurred");
    }
    setResending(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="p-8 text-center text-[#173d35]/50">
        <p className="font-bold">Peserta tidak dijumpai / Participant not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link href="/admin/participants" className="inline-flex items-center gap-2 text-sm text-[#173d35]/60 hover:text-[#173d35] mb-6">
        <ArrowLeft className="size-4" />
        <span>Kembali / Back</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Participant Info */}
        <div className="lg:col-span-2 bg-white rounded-[1.5rem] shadow-ambient p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#173d35]">{participant.full_name}</h1>
              <p className="text-sm text-[#173d35]/60 mt-1">
                {participant.is_active ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700" title="Active">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600" title="Inactive">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />Tidak Aktif
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { my: "E-mel", en: "Email", value: participant.email },
              { my: "Telefon", en: "Phone", value: participant.phone },
              { my: "Umur", en: "Age", value: String(participant.age) },
              { my: "Poskod", en: "Postal Code", value: participant.postal_code },
              { my: "Persetujuan E-mel", en: "Email Consent", value: participant.email_consent ? "Ya / Yes" : "Tidak / No" },
              { my: "Tarikh Daftar", en: "Registered", value: formatDateSGT(participant.created_at) },
            ].map((field) => (
              <div key={field.my} className="bg-[#f0f4f3] rounded-lg p-3">
                <p className="text-xs font-bold text-[#173d35]/60 mb-1">{field.my} / {field.en}</p>
                <p className="text-sm font-medium text-[#173d35]">{field.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-6 flex flex-col items-center gap-4">
          <div>
            <p className="font-bold text-[#173d35] text-center">Kod QR</p>
            <p className="text-xs text-[#173d35]/60 text-center">QR Code</p>
          </div>

          {participant.qr_image_url ? (
            <img
              src={participant.qr_image_url}
              alt="QR Code"
              className="w-48 h-48 rounded-lg border border-[#f0f4f3]"
            />
          ) : (
            <div className="w-48 h-48 rounded-lg border-2 border-dashed border-[#173d35]/20 flex items-center justify-center">
              <p className="text-sm text-[#173d35]/40 text-center">Tiada QR / No QR</p>
            </div>
          )}

          {participant.qr_image_url && (
            <a
              href={participant.qr_image_url}
              download={`qr_${participant.full_name.replace(/\s+/g, "_")}.png`}
              className="inline-flex items-center gap-2 text-sm text-[#173d35] hover:underline"
            >
              <Download className="size-4" />
              <span>Muat Turun / Download</span>
            </a>
          )}

          <Button
            onClick={handleResendQr}
            disabled={resending}
            size="sm"
            variant="outline"
            className="w-full border-[#173d35] text-[#173d35]"
          >
            {resending ? <LoadingSpinner size="sm" /> : (
              <>
                <span className="font-bold">Jana Semula</span>
                <span className="text-[#173d35]/60">/ Resend QR</span>
              </>
            )}
          </Button>

          {resendMsg && (
            <p className={`text-xs text-center ${resendMsg.includes("Ralat") ? "text-red-600" : "text-emerald-600"}`}>
              {resendMsg}
            </p>
          )}
        </div>
      </div>

      {/* Attendance Timeline */}
      <div className="bg-white rounded-[1.5rem] shadow-ambient p-6 mt-6">
        <div className="mb-4">
          <h2 className="font-bold text-[#173d35]">Sejarah Kehadiran</h2>
          <p className="text-xs text-[#173d35]/60">Attendance History ({attendance.length} records)</p>
        </div>

        {attendance.length === 0 ? (
          <p className="text-sm text-[#173d35]/40 text-center py-8">
            Tiada rekod kehadiran / No attendance records
          </p>
        ) : (
          <div className="space-y-3">
            {attendance.map((rec) => {
              const method = rec.check_in_method as CheckInMethod;
              const methodLabel = CHECK_IN_METHOD_LABELS[method];
              return (
                <div
                  key={rec.id}
                  className="flex items-start gap-4 p-3 rounded-lg bg-[#f0f4f3]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-[#173d35]">
                        {rec.sessions?.session_date ?? "—"}
                      </span>
                      {rec.sessions?.title && (
                        <span className="text-xs text-[#173d35]/60">{rec.sessions.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#173d35]/60">
                        {formatDateTimeSGT(rec.checked_in_at)}
                      </span>
                      <span className="text-xs text-[#173d35]/40">•</span>
                      <span className="text-xs text-[#173d35]/60">
                        {methodLabel?.my ?? method}
                      </span>
                    </div>
                  </div>
                  {rec.programmes && (
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs text-white font-medium shrink-0"
                      style={{ backgroundColor: rec.programmes.colour }}
                    >
                      {rec.programmes.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
