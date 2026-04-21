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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState<string[]>([]);

  const fetchSessions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const r = await fetch("/api/sessions/active");
      const json: { sessions?: Session[]; session?: Session | null } = await r.json();
      const list = json.sessions ?? (json.session ? [json.session] : []);
      setSessions(list);

      if (list.length === 0) {
        setSelectedSessionId("");
        onSessionChange("", []);
        return;
      }

      const storedSessionId = localStorage.getItem("se_session_id");
      const storedProgrammeId = localStorage.getItem("se_programme_id");
      const pickedSession =
        list.find((s) => s.id === storedSessionId) ?? list[0];
      setSelectedSessionId(pickedSession.id);

      const programmes = pickedSession.session_programmes.map((sp) => sp.programmes);
      const defaultProg = programmes.find((p) => p.is_default);
      let initialIds: string[];
      if (
        storedSessionId === pickedSession.id &&
        storedProgrammeId &&
        programmes.some((p) => p.id === storedProgrammeId)
      ) {
        initialIds = [storedProgrammeId];
      } else if (defaultProg) {
        initialIds = [defaultProg.id];
      } else if (programmes.length > 0) {
        initialIds = [programmes[0].id];
      } else {
        initialIds = [];
      }

      setSelectedProgrammeIds(initialIds);
      localStorage.setItem("se_session_id", pickedSession.id);
      if (initialIds[0]) localStorage.setItem("se_programme_id", initialIds[0]);
      onSessionChange(pickedSession.id, initialIds);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  function selectSession(sid: string) {
    const s = sessions.find((x) => x.id === sid);
    if (!s) return;
    setSelectedSessionId(sid);
    const programmes = s.session_programmes.map((sp) => sp.programmes);
    const defaultProg = programmes.find((p) => p.is_default);
    const next = defaultProg
      ? [defaultProg.id]
      : programmes.length > 0
      ? [programmes[0].id]
      : [];
    setSelectedProgrammeIds(next);
    localStorage.setItem("se_session_id", sid);
    if (next[0]) localStorage.setItem("se_programme_id", next[0]);
    onSessionChange(sid, next);
  }

  const toggleProgramme = (progId: string) => {
    const next = [progId];
    setSelectedProgrammeIds(next);
    localStorage.setItem("se_programme_id", progId);
    if (selectedSessionId) {
      localStorage.setItem("se_session_id", selectedSessionId);
      onSessionChange(selectedSessionId, next);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-2 text-white/60 text-sm animate-pulse">
        Memuatkan sesi... / Loading session...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="px-4 py-2 bg-amber-500/90 text-white text-sm font-medium rounded-b-lg flex items-center justify-between gap-2">
        <span>
          <span className="font-bold">Tiada sesi aktif</span>{" "}
          <span className="font-normal">/ No active session</span>
        </span>
        <button
          onClick={() => fetchSessions(true)}
          disabled={refreshing}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
        </button>
      </div>
    );
  }

  const currentSession = sessions.find((s) => s.id === selectedSessionId) ?? sessions[0];
  const programmes = currentSession.session_programmes.map((sp) => sp.programmes);

  return (
    <div className="px-4 py-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        {sessions.length > 1 ? (
          <select
            value={selectedSessionId}
            onChange={(e) => selectSession(e.target.value)}
            className="flex-1 bg-transparent text-white/90 text-xs font-medium border border-white/20 rounded px-2 py-1 focus:outline-none focus:border-white/40"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#0d2720] text-white">
                {new Date(s.session_date).toLocaleDateString("ms-MY", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                {s.title ? ` — ${s.title}` : ""}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-white/80 text-xs font-medium flex-1">
            {new Date(currentSession.session_date).toLocaleDateString("ms-MY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {currentSession.title ? ` — ${currentSession.title}` : ""}
          </p>
        )}
        <button
          onClick={() => fetchSessions(true)}
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
