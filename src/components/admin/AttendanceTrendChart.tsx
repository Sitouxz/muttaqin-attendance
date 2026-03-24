"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface TrendDataPoint {
  date: string;
  [programmeName: string]: number | string;
}

interface ProgrammeInfo {
  name: string;
  colour: string;
}

export function AttendanceTrendChart() {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/dashboard/trend");
        if (res.ok) {
          const json = await res.json();
          setData(json.data ?? []);
          setProgrammes(json.programmes ?? []);
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

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#173d35]/50 text-sm">
        <div className="text-center">
          <p className="font-bold">Tiada data trend</p>
          <p>No trend data</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
            return d.toLocaleDateString("ms-MY", { day: "numeric", month: "short" });
          }}
        />
        <Legend />
        {programmes.map((prog) => (
          <Line
            key={prog.name}
            type="monotone"
            dataKey={prog.name}
            stroke={prog.colour}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
