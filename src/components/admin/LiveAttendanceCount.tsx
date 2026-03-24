"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface LiveAttendanceCountProps {
  sessionId: string;
  initialCount: number;
}

export function LiveAttendanceCount({
  sessionId,
  initialCount,
}: LiveAttendanceCountProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`attendance-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          setCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return (
    <span className="tabular-nums font-bold text-[#173d35]">{count}</span>
  );
}
