import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import MonitoringPage from "@/app/admin/(protected)/monitoring/page";

const payload = {
  generated_at: "2026-09-15T04:00:00.000Z",
  window_hours: 24,
  granularity: "hour",
  truncated: false,
  failures: [],
  kpis: { registrations: 12, check_ins: 34, qr_requests: 5, qr_retrievals: 4 },
  totals: {
    participants: 200,
    qr_delivered: 180,
    attended: 120,
    never_attended: 80,
    channels: { email: 150, whatsapp: 50 },
  },
  alerts: { wa_qr_pending: 3, qr_missing: 0, unsynced_check_ins: 0, active_sessions: 1 },
  funnel: [
    { stage: "Registered", count: 200, pct: 100 },
    { stage: "QR issued", count: 180, pct: 90 },
    { stage: "Checked in at least once", count: 120, pct: 60 },
  ],
  buckets: [
    { key: "2026-09-15 11", label: "11:00", registrations: 2, check_ins: 4, qr_retrievals: 1 },
    { key: "2026-09-15 12", label: "12:00", registrations: 3, check_ins: 6, qr_retrievals: 0 },
  ],
  check_in_methods: { qr_scan: 30, manual: 3, walk_in: 1 },
  window_channels: { email: 8, whatsapp: 4 },
  operators: [{ name: "Ustaz Rahman", count: 34, last_at: "2026-09-15T03:55:00.000Z" }],
  feed: [
    {
      id: "check_in:a1",
      type: "check_in",
      at: "2026-09-15T03:55:00.000Z",
      name: "Siti Aminah",
      serial: "SE0001",
      channel: "whatsapp",
      summary: "Checked in — Kuliah",
      detail: "Kuliah Subuh · QR scan",
      colour: "#3B82F6",
      operator: "Ustaz Rahman",
    },
    {
      id: "registration:p2",
      type: "registration",
      at: "2026-09-15T02:10:00.000Z",
      name: "Ahmad Bin Ali",
      serial: "SE0002",
      channel: "email",
      summary: "Registered via email",
      detail: "QR card generated",
      colour: "#3B82F6",
      operator: null,
    },
  ],
};

/**
 * A metric card renders its value in the <p> right after its title. The same
 * words can also appear in the chart legend, so match on the card's own shape.
 */
function metricValue(title: string): string | undefined {
  for (const label of screen.getAllByText(title)) {
    const value = label.nextElementSibling;
    if (value?.className.includes("text-3xl")) return value.textContent ?? undefined;
  }
  return undefined;
}

describe("MonitoringPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => payload })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the KPI row, alerts and merged activity feed", async () => {
    render(<MonitoringPage />);

    expect(await screen.findByText("Siti Aminah")).toBeInTheDocument();
    expect(screen.getByText("Ahmad Bin Ali")).toBeInTheDocument();
    expect(screen.getByText("Checked in — Kuliah")).toBeInTheDocument();
    expect(screen.getByText("by Ustaz Rahman")).toBeInTheDocument();

    // KPIs — read each card's value off the label it sits under, since the
    // same number can legitimately appear elsewhere on the page.
    expect(metricValue("Registrations")).toBe("12");
    expect(metricValue("Check-ins")).toBe("34");
    expect(metricValue("QR retrieval codes sent")).toBe("5");
    expect(metricValue("Never checked in")).toBe("80");

    // Pending-QR alert surfaces for the launch-day operator
    expect(
      screen.getByText(/3 WhatsApp registrants still waiting/)
    ).toBeInTheDocument();
  });

  it("filters the feed by event type", async () => {
    render(<MonitoringPage />);

    expect(await screen.findByText("Siti Aminah")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Registrations" }));
    });

    expect(screen.queryByText("Siti Aminah")).not.toBeInTheDocument();
    expect(screen.getByText("Ahmad Bin Ali")).toBeInTheDocument();
  });

  it("filters the feed by search term", async () => {
    render(<MonitoringPage />);

    expect(await screen.findByText("Siti Aminah")).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText("Search name, serial or action"),
        { target: { value: "SE0002" } }
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Siti Aminah")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Ahmad Bin Ali")).toBeInTheDocument();
  });

  it("requests a different window when the range is changed", async () => {
    render(<MonitoringPage />);

    expect(await screen.findByText("Siti Aminah")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/monitoring?hours=168",
        expect.anything()
      );
    });
  });

  it("warns when the API reports a partial read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...payload, failures: ["check-ins: statement timeout"] }),
      })
    );

    render(<MonitoringPage />);

    expect(
      await screen.findByText(/could not be read and may be understated/)
    ).toBeInTheDocument();
    expect(screen.getByText("check-ins: statement timeout")).toBeInTheDocument();
  });

  it("shows an error state when the API fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    render(<MonitoringPage />);

    expect(
      await screen.findByText("Could not load monitoring data.")
    ).toBeInTheDocument();
  });
});
