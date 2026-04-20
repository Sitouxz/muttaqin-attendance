"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { REGION_COLOURS } from "@/lib/utils/sg-regions";

const SingaporeLeafletMap = dynamic(
  () => import("@/components/admin/SingaporeLeafletMap").then((m) => m.SingaporeLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-[#e8f4f8] rounded-xl flex items-center justify-center">
        <span className="text-sm text-[#173d35]/50">Loading map...</span>
      </div>
    ),
  }
);
import type { SGRegion } from "@/lib/utils/sg-regions";

// --------------- Types ---------------

interface RegistrantsData {
  total: number;
  gender: Record<string, number>;
  category: Record<string, number>;
  registrationTrend: { date: string; count: number }[];
  regions: { name: SGRegion; count: number }[];
  unknownRegion: number;
  districts: { number: number; name: string; count: number }[];
  unknownDistrict: number;
}

// --------------- Constants ---------------

const GENDER_COLOURS: Record<string, string> = {
  male: "#3B82F6",
  female: "#EC4899",
  unspecified: "#9CA3AF",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  unspecified: "Unspecified",
};

const CATEGORY_LABELS: Record<string, string> = {
  warga_emas: "Senior Citizen",
  penjaga: "Caregiver",
  kedua_dua: "Both",
  selain: "Others",
};

const CATEGORY_COLOURS: Record<string, string> = {
  warga_emas: "#173d35",
  penjaga: "#735b29",
  kedua_dua: "#10B981",
  selain: "#9CA3AF",
};

const REGION_LABELS: Record<SGRegion, string> = {
  Central: "Central",
  East: "East",
  West: "West",
  North: "North",
  "North-East": "North-East",
};

// --------------- Custom Tooltip ---------------

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="bg-white border border-[#f0f4f3] rounded-lg px-3 py-2 shadow-lg text-sm">
      <span className="font-medium text-[#173d35]">{payload[0].name}</span>
      <span className="ml-2 text-[#173d35]/70">{payload[0].value}</span>
    </div>
  );
}

// SVG map removed — now using Leaflet with official URA GeoJSON (SingaporeLeafletMap)

// --------------- Main Component ---------------

export function RegistrantsDashboard() {
  const [data, setData] = useState<RegistrantsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationTab, setLocationTab] = useState<"region" | "district">("region");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/dashboard/registrants");
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-[#173d35]/50 text-sm">
        <div className="text-center">
          <p className="font-bold">No registration data</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const genderData = Object.entries(data.gender)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: GENDER_LABELS[key] ?? key,
      value,
      fill: GENDER_COLOURS[key] ?? "#9CA3AF",
    }));

  const categoryData = Object.entries(data.category)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: CATEGORY_LABELS[key] ?? key,
      value,
      fill: CATEGORY_COLOURS[key] ?? "#9CA3AF",
    }));

  return (
    <div className="space-y-6">
      {/* Row 1: Gender + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Donut */}
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
          <div className="mb-4">
            <h2 className="font-bold text-[#173d35]">Participant Gender</h2>
          </div>
          {genderData.length === 0 ? (
            <p className="text-sm text-[#173d35]/50 text-center py-8">No data</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {genderData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3">
                {Object.entries(data.gender).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: GENDER_COLOURS[key] }}
                    />
                    <div>
                      <p className="text-sm font-medium text-[#173d35] leading-tight">
                        {GENDER_LABELS[key]}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-[#173d35] ml-2">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Participant Category */}
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
          <div className="mb-4">
            <h2 className="font-bold text-[#173d35]">Participant Category</h2>
          </div>
          {categoryData.length === 0 ? (
            <p className="text-sm text-[#173d35]/50 text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#173d35" }}
                  width={100}
                />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Registration Trend */}
      <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
        <div className="mb-4">
          <h2 className="font-bold text-[#173d35]">30-Day Registration Trend</h2>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data.registrationTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="registrationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#173d35" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#173d35" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(val: string) => {
                const d = new Date(val);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
            />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(label) => {
                const d = new Date(String(label));
                return d.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
              }}
              formatter={(value) => [value, "Registrations"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#173d35"
              strokeWidth={2}
              fill="url(#registrationGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3: Location Distribution */}
      <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-[#173d35]">Location Distribution</h2>
            <p className="text-xs text-[#173d35]/60">by Postal Code</p>
          </div>
          <div className="flex rounded-lg border border-[#e5e7eb] overflow-hidden text-sm">
            <button
              onClick={() => setLocationTab("region")}
              className={`px-3 py-1.5 font-medium transition-colors ${
                locationTab === "region"
                  ? "bg-[#173d35] text-white"
                  : "text-[#173d35]/60 hover:bg-[#f0f4f3]"
              }`}
            >
              Region
            </button>
            <button
              onClick={() => setLocationTab("district")}
              className={`px-3 py-1.5 font-medium transition-colors ${
                locationTab === "district"
                  ? "bg-[#173d35] text-white"
                  : "text-[#173d35]/60 hover:bg-[#f0f4f3]"
              }`}
            >
              District
            </button>
          </div>
        </div>

        {locationTab === "region" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.regions} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(val: string) => REGION_LABELS[val as SGRegion] ?? val}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [value, "Participants"]}
                  labelFormatter={(label) => REGION_LABELS[label as SGRegion] ?? label}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                  {data.regions.map((r) => (
                    <Cell key={r.name} fill={REGION_COLOURS[r.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <SingaporeLeafletMap regions={data.regions} />
          </div>
        ) : (
          <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {data.districts.length === 0 ? (
              <p className="text-sm text-[#173d35]/50 text-center py-8">No data</p>
            ) : (
              data.districts.map((d) => {
                const pct = data.total > 0 ? (d.count / data.total) * 100 : 0;
                return (
                  <div key={d.number} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs font-mono font-bold text-[#173d35]/60 w-6 shrink-0 text-right">
                      {String(d.number).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#173d35] truncate">{d.name}</p>
                      <div className="mt-0.5 h-1.5 rounded-full bg-[#f0f4f3] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#173d35]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#173d35] shrink-0 w-8 text-right">
                      {d.count}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
