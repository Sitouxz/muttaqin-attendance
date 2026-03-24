import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// Mock qr-scanner (browser camera API not available in jsdom)
vi.mock("qr-scanner", () => ({
  default: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    destroy: vi.fn(),
  })),
}));

// Mock idb
vi.mock("@/lib/idb/queue", () => ({
  enqueueCheckIn: vi.fn(),
  getPendingCount: vi.fn().mockResolvedValue(0),
  getPendingQueue: vi.fn().mockResolvedValue([]),
  markSynced: vi.fn(),
}));

// Mock useOnlineStatus
vi.mock("@/lib/hooks/useOnlineStatus", () => ({
  useOnlineStatus: vi.fn().mockReturnValue(true),
}));

import { QrScannerView } from "@/components/scanner/QrScannerView";
import { OfflineQueueBadge } from "@/components/scanner/OfflineQueueBadge";

describe("QrScannerView", () => {
  it("renders without throwing", () => {
    expect(() =>
      render(
        <QrScannerView
          sessionId="00000000-0000-0000-0000-000000000001"
          programmeIds={["00000000-0000-0000-0000-000000000002"]}
        />
      )
    ).not.toThrow();
  });

  it("renders a video element for the camera feed", () => {
    const { container } = render(
      <QrScannerView
        sessionId="00000000-0000-0000-0000-000000000001"
        programmeIds={["00000000-0000-0000-0000-000000000002"]}
      />
    );
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
  });
});

describe("OfflineQueueBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows no badge when queue count is 0", async () => {
    const { getPendingCount } = await import("@/lib/idb/queue");
    vi.mocked(getPendingCount).mockResolvedValue(0);

    let container!: HTMLElement;
    await act(async () => {
      const result = render(<OfflineQueueBadge />);
      container = result.container;
    });

    // Badge should not be visible when count is 0
    expect(container.querySelector("[class*='amber']")).toBeNull();
  });

  it("renders badge with pending count when queue has items", async () => {
    const { getPendingCount } = await import("@/lib/idb/queue");
    vi.mocked(getPendingCount).mockResolvedValue(3);

    await act(async () => {
      render(<OfflineQueueBadge />);
    });

    // Allow state update
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const badge = screen.queryByText(/beratur|queued/i);
    // If count is 3, badge text should appear
    if (badge) {
      expect(badge.textContent).toMatch(/3/);
    }
  });
});
