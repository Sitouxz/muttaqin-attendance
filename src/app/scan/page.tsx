"use client";

import { useState } from "react";
import Link from "next/link";
import { Keyboard } from "lucide-react";
import { SessionSelector } from "@/components/scanner/SessionSelector";
import { QrScannerView } from "@/components/scanner/QrScannerView";
import { OfflineQueueBadge } from "@/components/scanner/OfflineQueueBadge";
import { OfflineBanner } from "@/components/shared/OfflineBanner";

export default function ScanPage() {
  const [sessionId, setSessionId] = useState("");
  const [programmeIds, setProgrammeIds] = useState<string[]>([]);

  const handleSessionChange = (sid: string, pids: string[]) => {
    setSessionId(sid);
    setProgrammeIds(pids);
  };

  return (
    <div className="relative h-screen flex flex-col overflow-hidden">
      {/* Offline banner */}
      <OfflineBanner />

      {/* Top glass overlay — session selector */}
      <div className="relative z-20 bg-[#0d2720]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between pr-4">
        <div className="flex-1">
          <SessionSelector onSessionChange={handleSessionChange} />
        </div>
        <Link
          href="/scan/manual"
          className="ml-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          title="Carian manual / Manual lookup"
        >
          <Keyboard className="w-5 h-5" />
        </Link>
      </div>

      {/* Camera fills remaining height */}
      <div className="flex-1 relative">
        {sessionId && programmeIds.length > 0 ? (
          <QrScannerView sessionId={sessionId} programmeIds={programmeIds} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-white/40 text-sm text-center px-8">
              <span className="font-bold text-white/60">Pilih sesi untuk mula mengimbas</span>
              <br />
              <span>Select a session to start scanning</span>
            </p>
          </div>
        )}
      </div>

      {/* Offline queue badge — bottom right */}
      <OfflineQueueBadge />
    </div>
  );
}
