"use client";

import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { getPendingCount, getPendingQueue, markSynced } from "@/lib/idb/queue";

async function flushQueue() {
  const pending = await getPendingQueue();
  for (const item of pending) {
    try {
      await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: item.participant_id,
          session_id: item.session_id,
          programme_ids: item.programme_ids,
          check_in_method: item.check_in_method,
        }),
      });
      await markSynced(item.localId!);
    } catch {
      // silently continue — will retry next flush
    }
  }
}

export function OfflineQueueBadge() {
  const [count, setCount] = useState(0);
  const online = useOnlineStatus();
  const wasPreviouslyOffline = useRef(false);

  const refreshCount = async () => {
    const c = await getPendingCount();
    setCount(c);
  };

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (online && wasPreviouslyOffline.current) {
      flushQueue().then(refreshCount);
    }
    wasPreviouslyOffline.current = !online;
  }, [online]);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-40">
      <div className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
        <span>{count} beratur / queued</span>
      </div>
    </div>
  );
}
