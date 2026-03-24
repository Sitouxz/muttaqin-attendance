"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("E-mel atau kata laluan salah / Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f3]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-8">
          {/* Logo / Name */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#173d35] mb-4">
              <span className="text-white text-2xl font-bold">SE</span>
            </div>
            <h1 className="text-2xl font-bold text-[#173d35]">Santunan Emas</h1>
            <p className="text-sm text-[#173d35]/70 mt-1">Muttaqin Attendance</p>
          </div>

          <div className="mb-6 text-center">
            <p className="font-bold text-[#173d35]">Log Masuk Admin</p>
            <p className="text-sm text-[#173d35]/70">Admin Login</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                <span className="block font-bold text-[#173d35]">E-mel</span>
                <span className="block text-xs text-[#173d35]/70">Email</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="min-h-[56px]"
                placeholder="admin@santunanemas.sg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                <span className="block font-bold text-[#173d35]">Kata Laluan</span>
                <span className="block text-xs text-[#173d35]/70">Password</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="min-h-[56px]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full min-h-[56px] bg-[#173d35] hover:bg-[#173d35]/90 text-white"
            >
              {loading ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : (
                <>
                  <span className="font-bold">Log Masuk</span>
                  <span className="text-white/80 ml-1">/ Sign In</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
