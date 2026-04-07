"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Trash2, Send, Star } from "lucide-react";
// createClient still used for invite + deactivate actions

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Programme {
  id: string;
  name: string;
  is_default: boolean;
}

export default function SettingsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [defaultProgId, setDefaultProgId] = useState<string>("");
  const [savingDefault, setSavingDefault] = useState(false);
  const [defaultMsg, setDefaultMsg] = useState<string | null>(null);

  const fromEmail = process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL ?? "info@santunanemas.sg";

  useEffect(() => {
    async function loadAdmins() {
      const res = await fetch("/api/admin/admins");
      if (res.ok) {
        const json = await res.json();
        setAdmins(json.admins ?? []);
      }
      setLoadingAdmins(false);
    }

    async function loadProgrammes() {
      const res = await fetch("/api/admin/programmes");
      if (res.ok) {
        const json = await res.json();
        const progs: Programme[] = json.programmes ?? [];
        setProgrammes(progs);
        const def = progs.find((p) => p.is_default);
        if (def) setDefaultProgId(def.id);
      }
    }

    loadAdmins();
    loadProgrammes();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);

    const supabase = createClient();
    const { error } = await (supabase.auth.admin as unknown as {
      inviteUserByEmail: (email: string) => Promise<{ error: { message: string } | null }>;
    }).inviteUserByEmail(inviteEmail);

    if (error) {
      setInviteMsg(`Ralat: ${error.message}`);
    } else {
      setInviteMsg(`Jemputan dihantar ke ${inviteEmail} / Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
    }
    setInviting(false);
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Nyahaktifkan admin ini? / Deactivate this admin?")) return;
    const supabase = createClient();
    await supabase.from("admins").update({ is_active: false }).eq("id", id);
    setAdmins((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSendTestEmail() {
    setSendingTest(true);
    setTestEmailStatus(null);
    const res = await fetch("/api/admin/notifications/reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });
    if (res.ok) {
      const json = await res.json();
      setTestEmailStatus(`Berjaya / Success — Dihantar: ${json.sent ?? 0}, Ralat: ${json.errors?.length ?? 0}`);
    } else {
      setTestEmailStatus("Gagal / Failed");
    }
    setSendingTest(false);
  }

  async function handleSaveDefault() {
    if (!defaultProgId) return;
    setSavingDefault(true);
    setDefaultMsg(null);
    const res = await fetch(`/api/admin/programmes/${defaultProgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: true }),
    });
    if (res.ok) {
      setDefaultMsg("Program lalai disimpan / Default programme saved");
    } else {
      setDefaultMsg("Ralat / Error");
    }
    setSavingDefault(false);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#173d35]">Tetapan</h1>
        <p className="text-sm text-[#173d35]/60">Settings</p>
      </div>

      <Tabs defaultValue="admins" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="admins">
            <span className="font-bold">Admin</span>
          </TabsTrigger>
          <TabsTrigger value="email">
            <span className="font-bold">E-mel</span>
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <span className="font-bold">Keutamaan</span>
          </TabsTrigger>
        </TabsList>

        {/* Admin Users Tab */}
        <TabsContent value="admins">
          <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
            <div className="mb-4">
              <h2 className="font-bold text-[#173d35]">Pengguna Admin</h2>
              <p className="text-xs text-[#173d35]/60">Admin Users</p>
            </div>

            {/* Invite form */}
            <form onSubmit={handleInvite} className="flex gap-3 mb-6">
              <div className="flex-1">
                <Label htmlFor="invite_email" className="sr-only">Email</Label>
                <Input
                  id="invite_email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="min-h-[44px]"
                />
              </div>
              <Button
                type="submit"
                disabled={inviting}
                className="bg-[#173d35] hover:bg-[#173d35]/90 text-white"
              >
                {inviting ? <LoadingSpinner size="sm" className="text-white" /> : <UserPlus className="size-4" />}
                <span className="font-bold">Jemput</span>
                <span className="text-white/70">/ Invite</span>
              </Button>
            </form>

            {inviteMsg && (
              <p className={`text-sm mb-4 ${inviteMsg.includes("Ralat") ? "text-red-600" : "text-emerald-600"}`}>
                {inviteMsg}
              </p>
            )}

            {/* Admin list */}
            {loadingAdmins ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-2">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-3 bg-[#f0f4f3] rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm text-[#173d35]">{admin.full_name}</p>
                      <p className="text-xs text-[#173d35]/60">{admin.email}</p>
                      <span className="inline-block text-xs bg-[#173d35]/10 text-[#173d35] px-2 py-0.5 rounded-full mt-1">
                        {admin.role}
                      </span>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleDeactivate(admin.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                {admins.length === 0 && (
                  <p className="text-sm text-[#173d35]/40 text-center py-4">Tiada admin / No admins</p>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Email Config Tab */}
        <TabsContent value="email">
          <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
            <div className="mb-4">
              <h2 className="font-bold text-[#173d35]">Konfigurasi E-mel</h2>
              <p className="text-xs text-[#173d35]/60">Email Configuration</p>
            </div>

            <div className="bg-[#f0f4f3] rounded-lg p-4 mb-6">
              <p className="text-xs font-bold text-[#173d35]/60 mb-1">Alamat Pengirim / From Address</p>
              <p className="font-mono text-sm text-[#173d35]">{fromEmail}</p>
            </div>

            <div>
              <p className="text-sm font-bold text-[#173d35] mb-1">Hantar E-mel Ujian</p>
              <p className="text-xs text-[#173d35]/60 mb-3">Send Test Email — triggers the reminder email to all opted-in participants</p>
              <Button
                onClick={handleSendTestEmail}
                disabled={sendingTest}
                variant="outline"
                className="border-[#173d35] text-[#173d35]"
              >
                {sendingTest ? <LoadingSpinner size="sm" /> : <Send className="size-4" />}
                <span className="font-bold">Hantar Ujian</span>
                <span className="text-[#173d35]/60">/ Send Test</span>
              </Button>
              {testEmailStatus && (
                <p className="text-sm mt-2 text-emerald-600">{testEmailStatus}</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
            <div className="mb-4">
              <h2 className="font-bold text-[#173d35]">Keutamaan Sistem</h2>
              <p className="text-xs text-[#173d35]/60">System Preferences</p>
            </div>

            <div className="max-w-sm">
              <Label htmlFor="default_prog" className="mb-2 block">
                <span className="font-bold text-[#173d35]">Program Lalai</span>
                <span className="block text-xs text-[#173d35]/60">Default Programme</span>
              </Label>
              <div className="flex gap-3">
                <select
                  id="default_prog"
                  value={defaultProgId}
                  onChange={(e) => setDefaultProgId(e.target.value)}
                  className="flex-1 h-11 rounded-lg border border-gray-200 px-3 text-sm text-[#173d35] focus:outline-none focus:ring-2 focus:ring-[#173d35]/20"
                >
                  <option value="">— Pilih / Select —</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.is_default ? "★" : ""}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleSaveDefault}
                  disabled={savingDefault || !defaultProgId}
                  className="bg-[#173d35] hover:bg-[#173d35]/90 text-white"
                >
                  {savingDefault ? <LoadingSpinner size="sm" className="text-white" /> : <Star className="size-4" />}
                  <span>Simpan / Save</span>
                </Button>
              </div>
              {defaultMsg && (
                <p className={`text-sm mt-2 ${defaultMsg.includes("Ralat") ? "text-red-600" : "text-emerald-600"}`}>
                  {defaultMsg}
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
