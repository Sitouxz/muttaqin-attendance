"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { WalkInForm } from "@/components/scanner/WalkInForm";
import { ScanResultCard, type ScanResult } from "@/components/scanner/ScanResultCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface Participant {
  id: string;
  full_name: string;
  phone: string;
  qr_token: string;
}

export default function ManualPage() {
  const [query, setQuery] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [confirmParticipant, setConfirmParticipant] = useState<Participant | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Retrieve session/programme from localStorage
  const sessionId = typeof window !== "undefined" ? localStorage.getItem("se_session_id") ?? "" : "";
  const programmeId = typeof window !== "undefined" ? localStorage.getItem("se_programme_id") ?? "" : "";
  const programmeIds = programmeId ? [programmeId] : [];

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setParticipants([]);
      return;
    }
    setLoading(true);
    fetch(`/api/check-in/lookup?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then(({ participants: data }: { participants: Participant[] }) => {
        setParticipants(data ?? []);
      })
      .catch(() => setParticipants([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const handleCheckIn = async (participant: Participant) => {
    if (!sessionId || programmeIds.length === 0) {
      setResult({ type: "error", message: "Tiada sesi aktif / No active session" });
      return;
    }

    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: participant.id,
          session_id: sessionId,
          programme_ids: programmeIds,
          check_in_method: "manual",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ type: "error", message: data?.error ?? undefined });
        return;
      }

      if (data.already_checked_in) {
        setResult({ type: "duplicate", participantName: data.participant?.full_name });
      } else {
        setResult({ type: "success", participantName: data.participant?.full_name });
      }
    } catch {
      setResult({ type: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0d2720] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe-top pt-4 pb-3 border-b border-white/10">
        <Link
          href="/scan"
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="font-bold text-base leading-tight">Carian Manual</p>
          <p className="text-white/60 text-xs">Manual Lookup</p>
        </div>
      </div>

      {/* Search input */}
      <div className="px-4 py-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nama atau nombor telefon... / Name or phone..."
          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
          autoFocus
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {loading && (
          <p className="text-white/50 text-sm text-center py-4">
            Mencari... / Searching...
          </p>
        )}

        {!loading && debouncedQuery.length >= 2 && participants.length === 0 && (
          <p className="text-white/50 text-sm text-center py-4">
            Tiada hasil / No results found
          </p>
        )}

        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3"
          >
            <div>
              <p className="font-semibold text-sm">{p.full_name}</p>
              <p className="text-white/60 text-xs">{p.phone}</p>
            </div>
            <Button
              size="sm"
              onClick={() => setConfirmParticipant(p)}
              className="bg-[#173d35] hover:bg-[#173d35]/80 text-white text-xs"
            >
              <span className="font-bold">Daftar Masuk</span>
              <span className="font-normal ml-1 hidden sm:inline">/ Check In</span>
            </Button>
          </div>
        ))}
      </div>

      {/* Walk-in register button */}
      <div className="px-4 pb-safe-bottom pb-6 border-t border-white/10 pt-4">
        <Sheet open={walkInOpen} onOpenChange={setWalkInOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              <span className="font-bold">Daftar Masuk Baharu</span>
              <span className="font-normal ml-1">/ Register New Walk-in</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader className="pb-2">
              <SheetTitle>
                <span className="font-bold">Pendaftaran Baharu</span>
                <span className="font-normal text-muted-foreground ml-2 text-base">
                  / New Registration
                </span>
              </SheetTitle>
            </SheetHeader>
            <WalkInForm
              sessionId={sessionId}
              programmeIds={programmeIds}
              onSuccess={() => setWalkInOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Confirm check-in dialog */}
      <Dialog
        open={!!confirmParticipant}
        onOpenChange={(open) => { if (!open) setConfirmParticipant(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <span className="font-bold">Sahkan Daftar Masuk</span>
              <span className="font-normal text-muted-foreground ml-2 text-base">
                / Confirm Check In
              </span>
            </DialogTitle>
          </DialogHeader>
          {confirmParticipant && (
            <div className="py-2 space-y-1">
              <p className="font-semibold text-lg">{confirmParticipant.full_name}</p>
              <p className="text-muted-foreground text-sm">{confirmParticipant.phone}</p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">
                Batal / Cancel
              </Button>
            </DialogClose>
            <Button
              className="bg-[#173d35] hover:bg-[#173d35]/90 text-white"
              onClick={async () => {
                if (confirmParticipant) {
                  setConfirmParticipant(null);
                  await handleCheckIn(confirmParticipant);
                }
              }}
            >
              <span className="font-bold">Daftar Masuk</span>
              <span className="font-normal ml-1">/ Check In</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result overlay */}
      {result && (
        <ScanResultCard result={result} onDismiss={() => setResult(null)} />
      )}
    </div>
  );
}
