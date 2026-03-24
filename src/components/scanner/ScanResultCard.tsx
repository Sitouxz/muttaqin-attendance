"use client";

import { useEffect } from "react";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

export interface ScanResult {
  type: "success" | "duplicate" | "error";
  participantName?: string;
  message?: string;
}

interface ScanResultCardProps {
  result: ScanResult;
  onDismiss: () => void;
}

export function ScanResultCard({ result, onDismiss }: ScanResultCardProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [result, onDismiss]);

  const config = {
    success: {
      bg: "bg-green-500/90",
      icon: <CheckCircle className="w-16 h-16 text-white" />,
      titleMy: "Berjaya Daftar Masuk",
      titleEn: "Checked In Successfully",
    },
    duplicate: {
      bg: "bg-amber-500/90",
      icon: <AlertCircle className="w-16 h-16 text-white" />,
      titleMy: "Sudah Mendaftar Masuk",
      titleEn: "Already Checked In",
    },
    error: {
      bg: "bg-red-500/90",
      icon: <XCircle className="w-16 h-16 text-white" />,
      titleMy: "Kod QR tidak dikenali",
      titleEn: "QR Code Not Recognised",
    },
  }[result.type];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 ${config.bg} cursor-pointer`}
      onClick={onDismiss}
    >
      {config.icon}
      <div className="text-center px-6">
        <p className="text-white font-bold text-3xl leading-tight">{config.titleMy}</p>
        <p className="text-white/80 text-lg mt-1">{config.titleEn}</p>
        {result.type === "success" && result.participantName && (
          <p className="text-white text-2xl font-semibold mt-4">{result.participantName}</p>
        )}
        {result.message && (
          <p className="text-white/70 text-sm mt-2">{result.message}</p>
        )}
      </div>
      <p className="text-white/50 text-xs mt-4">Ketik untuk tutup / Tap to dismiss</p>
    </div>
  );
}
