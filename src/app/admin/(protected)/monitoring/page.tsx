"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  KeyRound,
  QrCode,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils/cn";
import { formatDateTimeSGT, formatTimeSGT } from "@/lib/utils/format";

// --------------- Types ---------------

type EventType = "registration" | "check_in" | "qr_request" | "qr_verified";

interface ActivityEvent {
  id: string;
  type: EventType;
  at: string;
  name: string;
  serial: string | null;
  channel: string | null;
  summary: string;
  detail: string | null;
  colour: string | null;
  operator: string | null;
}

interface MonitoringData {
  generated_at: string;
  window_hours: number;
  granularity: "hour" | "day";
  truncated: boolean;
  failures: string[];
  kpis: {
    registrations: number;
    check_ins: number;
    qr_requests: number;
    qr_retrievals: number;
  };
  totals: {
    participants: number;
    qr_delivered: number;
    attended: number;
    never_attended: number;
    channels: { email: number; whatsapp: number };
  };
  alerts: {
    wa_qr_pending: number;
    qr_missing: number;
    unsynced_check_ins: number;
    active_sessions: number;
  };
  funnel: { stage: string; count: number; pct: number }[];
  buckets: {
    key: string;
    label: string;
    registrations: number;
    check_ins: number;
    qr_retrievals: number;
  }[];
  check_in_methods: Record<string, number>;
  window_channels: { email: number; whatsapp: number };
  operators: { name: string; count: number; last_at: string }[];
  feed: ActivityEvent[];
}

// --------------- Constants ---------------

const WINDOWS = [
  { hours: 24, label: "Last 24 hours" },
  { hours: 168, label: "Last 7 days" },
  { hours: 720, label: "Last 30 days" },
];

const REFRESH_MS = 30_000;

const EVENT_FILTERS: { value: EventType | "all"; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "registration", label: "Registrations" },
  { value: "check_in", label: "Check-ins" },
  { value: "qr_request", label: "QR code requests" },
  { value: "qr_verified", label: "QR retrievals" },
];

const EVENT_ICONS: Record<EventType, typeof UserPlus> = {
  registration: UserPlus,
  check_in: ClipboardCheck,
  qr_request: KeyRound,
  qr_verified: QrCode,
};

const METHOD_LABELS: Record<string, string> = {
  qr_scan: "QR scan",
  manual: "Manual entry",
  walk_in: "Walk-in",
};

// --------------- Small building blocks ---------------

function MetricCard({
  title,
  value,
  sub,
  icon: Icon,
  colour,
}: {
  title: string;
  value: number | string;
  sub?: string;
  icon: typeof UserPlus;
  colour: string;
}) {
  return (
    <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[#173d35]/60">{title}</p>
          <p className="text-3xl font-bold text-[#173d35] mt-1">{value}</p>
          {sub && <p className="text-xs text-[#173d35]/50 mt-1">{sub}</p>}
        </div>
        <span
          className="size-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${colour}1a`, color: colour }}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function Alert({ count, label, tone }: { count: number; label: string; tone: string }) {
  if (count === 0) return null;
  return (
    <div
      className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium"
      style={{ backgroundColor: `${tone}1a`, color: tone }}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span>
        {count} {label}
      </span>
    </div>
  );
}

// --------------- Page ---------------

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hours, setHours] = useState(24);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [search, setSearch] = useState("");
  const hoursRef = useRef(hours);
  hoursRef.current = hours;

  const load = useCallback(async (opts?: { background?: boolean }) => {
    if (opts?.background) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/admin/monitoring?hours=${hoursRef.current}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
      setError(null);
    } catch {
      setError("Could not load monitoring data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, hours]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => load({ background: true }), REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const feed = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.feed.filter((event) => {
      if (typeFilter !== "all" && event.type !== typeFilter) return false;
      if (!q) return true;
      return (
        event.name.toLowerCase().includes(q) ||
        (event.serial ?? "").toLowerCase().includes(q) ||
        event.summary.toLowerCase().includes(q) ||
        (event.detail ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, typeFilter, search]);

  const windowLabel =
    WINDOWS.find((w) => w.hours === hours)?.label.toLowerCase() ?? "window";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#173d35]">User Activity Monitoring</h1>
          <p className="text-sm text-[#173d35]/60 mt-1">
            Every registration, QR retrieval and check-in as it happens.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-white p-1 shadow-ambient">
            {WINDOWS.map((w) => (
              <button
                key={w.hours}
                onClick={() => setHours(w.hours)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  hours === w.hours
                    ? "bg-[#173d35] text-white"
                    : "text-[#173d35]/70 hover:bg-[#f0f4f3]"
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors shadow-ambient",
              autoRefresh ? "bg-[#173d35] text-white" : "bg-white text-[#173d35]/70"
            )}
            aria-pressed={autoRefresh}
          >
            <Activity className="size-4" />
            {autoRefresh ? "Live" : "Paused"}
          </button>
          <button
            onClick={() => load({ background: true })}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-white text-[#173d35]/70 text-sm font-medium shadow-ambient hover:text-[#173d35] transition-colors"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : error && !data ? (
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-10 text-center">
          <p className="font-bold text-[#173d35]">{error}</p>
          <button
            onClick={() => load()}
            className="mt-3 text-sm font-medium text-[#735b29] hover:underline"
          >
            Try again
          </button>
        </div>
      ) : data ? (
        <>
          {/* A partial read would otherwise look like a quiet day. */}
          {data.failures?.length > 0 && (
            <div className="bg-[#DC2626]/10 text-[#B91C1C] rounded-[1.5rem] p-4 mb-6">
              <p className="text-sm font-bold">
                Some figures below could not be read and may be understated.
              </p>
              <ul className="text-xs mt-1 list-disc list-inside">
                {data.failures.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Alerts */}
          <div className="flex flex-wrap items-center gap-2 mb-6 empty:mb-0">
            <Alert
              count={data.alerts.wa_qr_pending}
              label="WhatsApp registrants still waiting for their QR card"
              tone="#D97706"
            />
            <Alert
              count={data.alerts.qr_missing}
              label="participants with no QR generated"
              tone="#DC2626"
            />
            <Alert
              count={data.alerts.unsynced_check_ins}
              label="check-ins awaiting offline sync"
              tone="#2563EB"
            />
            {data.alerts.active_sessions === 0 && (
              <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium bg-[#6B7280]/10 text-[#4B5563]">
                <AlertTriangle className="size-4 shrink-0" />
                <span>No active session — QR scans have nothing to check into</span>
              </div>
            )}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Registrations"
              value={data.kpis.registrations}
              sub={`${data.window_channels.whatsapp} WhatsApp · ${data.window_channels.email} email`}
              icon={UserPlus}
              colour="#3B82F6"
            />
            <MetricCard
              title="Check-ins"
              value={data.kpis.check_ins}
              sub={Object.entries(data.check_in_methods)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => `${v} ${METHOD_LABELS[k] ?? k}`)
                .join(" · ")}
              icon={ClipboardCheck}
              colour="#10B981"
            />
            <MetricCard
              title="QR retrieval codes sent"
              value={data.kpis.qr_requests}
              sub={`${data.kpis.qr_retrievals} completed`}
              icon={KeyRound}
              colour="#735b29"
            />
            <MetricCard
              title="Never checked in"
              value={data.totals.never_attended}
              sub={`of ${data.totals.participants} registered participants`}
              icon={QrCode}
              colour="#EF4444"
            />
          </div>

          {/* Activity over time + funnel */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <div className="xl:col-span-2 bg-white rounded-[1.5rem] shadow-ambient p-6">
              <h2 className="font-bold text-[#173d35] mb-4">
                Activity {data.granularity === "hour" ? "per hour" : "per day"}
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.buckets} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="monRegistrations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="monCheckIns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="monRetrievals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#735b29" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#735b29" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="registrations"
                    name="Registrations"
                    stroke="#3B82F6"
                    fill="url(#monRegistrations)"
                  />
                  <Area
                    type="monotone"
                    dataKey="check_ins"
                    name="Check-ins"
                    stroke="#10B981"
                    fill="url(#monCheckIns)"
                  />
                  <Area
                    type="monotone"
                    dataKey="qr_retrievals"
                    name="QR retrievals"
                    stroke="#735b29"
                    fill="url(#monRetrievals)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
              <h2 className="font-bold text-[#173d35] mb-1">Participant journey</h2>
              <p className="text-xs text-[#173d35]/50 mb-4">All time, not just this window</p>
              <div className="space-y-4">
                {data.funnel.map((step) => (
                  <div key={step.stage}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm text-[#173d35]">{step.stage}</span>
                      <span className="text-sm font-bold text-[#173d35]">
                        {step.count}
                        <span className="text-[#173d35]/50 font-normal ml-1">{step.pct}%</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f0f4f3] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#173d35]"
                        style={{ width: `${step.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-[#f0f4f3] space-y-2">
                <h3 className="text-sm font-bold text-[#173d35]">Check-ins by operator</h3>
                {data.operators.length === 0 ? (
                  <p className="text-sm text-[#173d35]/50">No check-ins in this window</p>
                ) : (
                  data.operators.map((op) => (
                    <div key={op.name} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-[#173d35] truncate">{op.name}</p>
                        <p className="text-xs text-[#173d35]/50">
                          last {formatTimeSGT(op.last_at)}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[#173d35] shrink-0">{op.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-white rounded-[1.5rem] shadow-ambient p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-[#173d35]">Activity feed</h2>
                <p className="text-xs text-[#173d35]/50">
                  Newest first · {feed.length} of {data.feed.length} events in the {windowLabel}
                  {data.truncated && " (capped)"}
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#173d35]/40" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, serial or action"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {EVENT_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTypeFilter(filter.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    typeFilter === filter.value
                      ? "bg-[#173d35] text-white"
                      : "bg-[#f0f4f3] text-[#173d35]/70 hover:text-[#173d35]"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {feed.length === 0 ? (
              <p className="text-sm text-[#173d35]/50 text-center py-10">
                No activity matches these filters.
              </p>
            ) : (
              <ul className="divide-y divide-[#f0f4f3]">
                {feed.map((event) => {
                  const Icon = EVENT_ICONS[event.type];
                  const colour = event.colour ?? "#173d35";
                  return (
                    <li key={event.id} className="flex items-start gap-3 py-3">
                      <span
                        className="size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: `${colour}1a`, color: colour }}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        {/* The timestamp shares the name's line when there is
                            room and wraps underneath it on narrow screens. */}
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <p className="text-sm font-medium text-[#173d35] truncate">
                            {event.name}
                            {event.serial && (
                              <span className="ml-2 text-xs font-normal text-[#173d35]/50">
                                {event.serial}
                              </span>
                            )}
                          </p>
                          <span className="text-xs text-[#173d35]/50 shrink-0">
                            {formatDateTimeSGT(event.at)}
                          </span>
                        </div>
                        <p className="text-sm text-[#173d35]/70">{event.summary}</p>
                        {event.detail && (
                          <p className="text-xs text-[#173d35]/50 mt-0.5">{event.detail}</p>
                        )}
                        {event.operator && (
                          <p className="text-xs text-[#173d35]/50 mt-0.5">by {event.operator}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="text-xs text-[#173d35]/40 mt-4">
            Last updated {formatDateTimeSGT(data.generated_at)} (SGT)
            {autoRefresh && ` · refreshing every ${REFRESH_MS / 1000}s`}
            {error && ` · ${error}`}
          </p>
        </>
      ) : null}
    </div>
  );
}
