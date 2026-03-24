"use client";

import { useEffect, useState } from "react";
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
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/sessions/active")
      .then((r) => r.json())
      .then(({ session: s }: { session: Session | null }) => {
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
        }
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="px-4 py-2 bg-amber-500/90 text-white text-sm font-medium rounded-b-lg">
        <span className="font-bold">Tiada sesi aktif</span>{" "}
        <span className="font-normal">/ No active session</span>
      </div>
    );
  }

  const programmes = session.session_programmes.map((sp) => sp.programmes);

  return (
    <div className="px-4 py-2 flex flex-col gap-1.5">
      <p className="text-white/80 text-xs font-medium">
        {new Date(session.session_date).toLocaleDateString("ms-MY", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        {session.title ? ` — ${session.title}` : ""}
      </p>
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
