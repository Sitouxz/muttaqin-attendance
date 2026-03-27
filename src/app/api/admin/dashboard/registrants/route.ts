import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { getRegionFromPostalCode, SG_REGIONS, type SGRegion } from "@/lib/utils/sg-regions";

export const revalidate = 60;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: participants } = await serviceClient
    .from("participants")
    .select("id, gender, participant_category, postal_code, created_at, is_active")
    .eq("is_active", true);

  const rows = participants ?? [];
  const total = rows.length;

  // --- Gender breakdown ---
  const gender: Record<string, number> = { male: 0, female: 0, unspecified: 0 };
  for (const p of rows) {
    const g = p.gender ?? "unspecified";
    gender[g] = (gender[g] ?? 0) + 1;
  }

  // --- Participant category breakdown ---
  const category: Record<string, number> = {
    warga_emas: 0,
    penjaga: 0,
    kedua_dua: 0,
    selain: 0,
  };
  for (const p of rows) {
    const c = p.participant_category ?? "selain";
    category[c] = (category[c] ?? 0) + 1;
  }

  // --- Registration trend (last 30 days, daily count) ---
  const trendMap = new Map<string, number>();
  // Pre-fill last 30 days with 0
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trendMap.set(key, 0);
  }
  for (const p of rows) {
    const key = p.created_at.slice(0, 10);
    if (trendMap.has(key)) {
      trendMap.set(key, trendMap.get(key)! + 1);
    }
  }
  const registrationTrend = Array.from(trendMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // --- Postal code → SG region ---
  const regionCounts: Record<SGRegion, number> = {
    Central: 0,
    East: 0,
    West: 0,
    North: 0,
    "North-East": 0,
  };
  let unknownRegion = 0;
  for (const p of rows) {
    const region = getRegionFromPostalCode(p.postal_code);
    if (region) {
      regionCounts[region]++;
    } else {
      unknownRegion++;
    }
  }

  const regions = SG_REGIONS.map((name) => ({
    name,
    count: regionCounts[name],
  }));

  return NextResponse.json({
    total,
    gender,
    category,
    registrationTrend,
    regions,
    unknownRegion,
  });
}
