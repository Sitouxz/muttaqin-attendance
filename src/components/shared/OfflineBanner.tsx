"use client";

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
      <WifiOff className="h-4 w-4" />
      <span>
        <span className="font-bold">Tiada sambungan internet</span>
        {" "}·{" "}
        <span>No internet connection — check-ins will be queued</span>
      </span>
    </div>
  );
}
