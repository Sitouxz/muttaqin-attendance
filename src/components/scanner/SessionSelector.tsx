"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Programme {
  id: string;
  name: string;
  colour: string;
  is_default: boolean;
}

interface SessionProgramme {
  programme_id: string;
  programmes: Programme;
}

interface Session {
  id: string;
  session_date: string;
  title: string | null;
  session_programmes: SessionProgramme[];
}

interface SessionSelectorProps {
  onSessionChange: (sessionId: string, programmeIds: string[]) => void;
}

export function SessionSelector({ onSessionChange }: SessionSelectorProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState<string[]>([]);

  const fetchSession = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const r = await fetch("/api/sessions/active");
      const { session: s }: { session: Session | null } = await r.json();
      setSession(s);
      if (s) {
        const programmes = s.session_programmes.map((sp) => sp.programmes);
        const defaultProg = programmes.find((p) => p.is_default);
        const storedSessionId = localStorage.getItem("se_session_id");
        const storedProgrammeId = localStorage.getItem("se_programme_id");

        let initialIds: string[];
        if (storedSessionId === s.id && storedProgrammeId) {
          initialIds = [storedProgrammeId];
        } else if (defaultProg) {
          initialIds = [defaultProg.id];
        } else if (programmes.length > 0) {
          initialIds = [programmes[0].id];
        } else {
          initialIds = [];
        }

        setSelectedProgrammeIds(initialIds);
        localStorage.setItem("se_session_id", s.id);
        if (initialIds[0]) localStorage.setItem("se_programme_id", initialIds[0]);
        onSessionChange(s.id, initialIds);
      } else {
        onSessionChange("", []);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const toggleProgramme = (progId: string) => {
    const next = [progId];
    setSelectedProgrammeIds(next);
    localStorage.setItem("se_programme_id", progId);
    if (session) {
      localStorage.setItem("se_session_id", session.id);
      onSessionChange(session.id, next);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-2 text-white/60 text-sm animate-pulse">
        Memuatkan sesi... / Loading session...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="px-4 py-2 bg-amber-500/90 text-white text-sm font-medium rounded-b-lg flex items-center justify-between gap-2">
        <span>
          <span className="font-bold">Tiada sesi aktif</span>{" "}
          <span className="font-normal">/ No active session</span>
        </span>
        <button
          onClick={() => fetchSession(true)}
          disabled={refreshing}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
        </button>
      </div>
    );
  }

  const programmes = session.session_programmes.map((sp) => sp.programmes);

  return (
    <div className="px-4 py-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
      <p className="text-white/80 text-xs font-medium flex-1">
        {new Date(session.session_date).toLocaleDateString("ms-MY", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        {session.title ? ` — ${session.title}` : ""}
      </p>
      <button
        onClick={() => fetchSession(true)}
        disabled={refreshing}
        className="p-1 rounded hover:bg-white/20 transition-colors text-white/60 hover:text-white shrink-0"
        title="Refresh session"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
      </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {programmes.map((prog) => {
          const isSelected = selectedProgrammeIds.includes(prog.id);
          return (
            <button
              key={prog.id}
              onClick={() => toggleProgramme(prog.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                isSelected
                  ? "bg-[#173d35] text-white"
                  : "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              {prog.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
