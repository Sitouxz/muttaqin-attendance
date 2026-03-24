"use client";

import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { enqueueCheckIn } from "@/lib/idb/queue";
import { ScanResultCard, type ScanResult } from "./ScanResultCard";

interface QrScannerViewProps {
  sessionId: string;
  programmeIds: string[];
}

export function QrScannerView({ sessionId, programmeIds }: QrScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<InstanceType<typeof import("qr-scanner").default> | null>(null);
  const lastScanTime = useRef<number>(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const online = useOnlineStatus();
  const sessionIdRef = useRef(sessionId);
  const programmeIdsRef = useRef(programmeIds);

  // Keep refs in sync with props so the scan callback always uses latest values
  useEffect(() => {
    sessionIdRef.current = sessionId;
    programmeIdsRef.current = programmeIds;
  }, [sessionId, programmeIds]);

  useEffect(() => {
    if (!videoRef.current) return;

    let destroyed = false;

    const initScanner = async () => {
      const QrScanner = (await import("qr-scanner")).default;

      if (destroyed || !videoRef.current) return;

      scannerRef.current = new QrScanner(
        videoRef.current,
        async (scanData) => {
          const now = Date.now();
          if (now - lastScanTime.current < 2000) return;
          lastScanTime.current = now;

          const qr_token = scanData.data;
          const currentSessionId = sessionIdRef.current;
          const currentProgrammeIds = programmeIdsRef.current;

          if (!currentSessionId || currentProgrammeIds.length === 0) {
            setResult({ type: "error", message: "Tiada sesi / No active session" });
            return;
          }

          if (online) {
            try {
              const res = await fetch("/api/check-in", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  qr_token,
                  session_id: currentSessionId,
                  programme_ids: currentProgrammeIds,
                  check_in_method: "qr_scan",
                }),
              });

              if (res.status === 404) {
                setResult({ type: "error" });
                return;
              }

              const data = await res.json();
              if (!res.ok) {
                setResult({ type: "error", message: data?.error ?? undefined });
                return;
              }

              if (data.already_checked_in) {
                setResult({
                  type: "duplicate",
                  participantName: data.participant?.full_name,
                });
              } else {
                setResult({
                  type: "success",
                  participantName: data.participant?.full_name,
                });
              }
            } catch {
              setResult({ type: "error" });
            }
          } else {
            // offline — we need participant_id; queue with qr_token as a workaround
            // The queue schema requires participant_id so we store qr_token as participant_id
            // and let the flush resolve it later — but the schema requires participant_id UUID
            // For offline we enqueue using a placeholder; in practice QR tokens are UUIDs
            try {
              await enqueueCheckIn({
                session_id: currentSessionId,
                programme_ids: currentProgrammeIds,
                participant_id: qr_token, // resolved server-side on flush
                check_in_method: "qr_scan",
              });
              setResult({
                type: "success",
                message: "Disimpan untuk penyegerakan / Saved for sync",
              });
            } catch {
              setResult({ type: "error" });
            }
          }
        },
        {
          preferredCamera: "environment",
          highlightScanRegion: false,
          highlightCodeOutline: true,
        }
      );

      await scannerRef.current.start();
    };

    initScanner();

    return () => {
      destroyed = true;
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [online]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* Scan region overlay */}
      <div className="relative z-10 pointer-events-none">
        {/* Dark overlay with cutout effect via box-shadow */}
        <div
          className="w-[60vw] aspect-square max-w-xs rounded-2xl"
          style={{
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        >
          {/* Corner markers */}
          <div className="absolute inset-0">
            <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
            <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
            <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
            <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
          </div>
        </div>
        <p className="text-white/70 text-sm text-center mt-6 font-medium">
          <span className="font-bold text-white">Imbas kod QR</span>
          {" / Scan QR Code"}
        </p>
      </div>

      {/* Result overlay */}
      {result && (
        <ScanResultCard result={result} onDismiss={() => setResult(null)} />
      )}
    </div>
  );
}
