import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockAuthUser, ADMIN_ROW } from "../../helpers/admin-auth";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

/**
 * Chainable Supabase query stub. `from()` is dispatched per table so a test can
 * hand each source its own rows.
 */
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "gte", "lte", "in", "is", "or", "not", "order", "limit", "range", "single"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

/**
 * The route reads `admins` twice: `.single()` for the auth guard (one row) and
 * a plain select for operator names (a list). One stub, both shapes.
 */
function makeAdminsChain(rows: unknown[] = [{ id: "admin-1", full_name: "Ustaz Rahman" }]) {
  const chain = makeChain({ data: rows, error: null }) as unknown as {
    single: ReturnType<typeof vi.fn>;
  };
  chain.single = vi.fn().mockReturnValue(makeChain({ data: ADMIN_ROW, error: null }));
  return chain;
}

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    from: vi.fn().mockImplementation(() => makeChain({ count: 0, data: [], error: null })),
  },
}));

async function authenticate() {
  await mockAuthUser({ id: "user-1", email: "admin@santunanemas.sg" });
  // getActingAdmin() also needs an active admins row behind that auth user.
  const { serviceClient } = await import("@/lib/supabase/service");
  vi.mocked(serviceClient.from).mockImplementation(((table: string) =>
    table === "admins"
      ? makeAdminsChain()
      : makeChain({ count: 0, data: [], error: null })) as unknown as typeof serviceClient.from);
}

function req(url = "http://localhost/api/admin/monitoring") {
  return new NextRequest(url);
}

describe("GET /api/admin/monitoring", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    await mockAuthUser(null);

    const { GET } = await import("@/app/api/admin/monitoring/route");
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("returns 401 for an auth user with no active admins row", async () => {
    await mockAuthUser({ id: "user-1" });
    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation((() =>
      makeChain({ data: null, error: null })) as unknown as typeof serviceClient.from);

    const { GET } = await import("@/app/api/admin/monitoring/route");
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("returns the expected shape when authenticated", async () => {
    await authenticate();
    const { GET } = await import("@/app/api/admin/monitoring/route");
    const res = await GET(req());
    expect(res.status).toBe(200);

    const body = await res.json();
    for (const key of [
      "generated_at",
      "window_hours",
      "granularity",
      "kpis",
      "totals",
      "alerts",
      "funnel",
      "buckets",
      "check_in_methods",
      "operators",
      "feed",
      "failures",
    ]) {
      expect(body).toHaveProperty(key);
    }
    expect(body.failures).toEqual([]);
    expect(body.window_hours).toBe(24);
    expect(body.granularity).toBe("hour");
    expect(body.buckets).toHaveLength(24);
  });

  it("clamps an unsupported window back to 24 hours", async () => {
    await authenticate();
    const { GET } = await import("@/app/api/admin/monitoring/route");
    const res = await GET(req("http://localhost/api/admin/monitoring?hours=99999"));
    const body = await res.json();
    expect(body.window_hours).toBe(24);
    expect(body.buckets).toHaveLength(24);
  });

  it("switches to daily buckets for the 7-day window", async () => {
    await authenticate();
    const { GET } = await import("@/app/api/admin/monitoring/route");
    const res = await GET(req("http://localhost/api/admin/monitoring?hours=168"));
    const body = await res.json();
    expect(body.window_hours).toBe(168);
    expect(body.granularity).toBe("day");
    expect(body.buckets).toHaveLength(7);
  });

  it("merges registrations, check-ins and QR retrievals into one feed, newest first", async () => {
    await authenticate();

    const registration = {
      id: "p1",
      full_name: "Siti Aminah",
      serial_code: "SE0001",
      reg_channel: "whatsapp",
      created_at: "2026-09-15T01:00:00.000Z",
      wa_qr_pending: true,
      qr_card_url: null,
      qr_image_url: null,
    };
    const checkIn = {
      id: "a1",
      checked_in_at: "2026-09-15T03:00:00.000Z",
      check_in_method: "qr_scan",
      is_synced: true,
      checked_in_by: "admin-1",
      participants: { full_name: "Siti Aminah", serial_code: "SE0001", reg_channel: "whatsapp" },
      programmes: { name: "Kuliah", colour: "#3B82F6" },
      sessions: { session_date: "2026-09-15", title: "Kuliah Subuh" },
    };
    const otp = {
      id: "o1",
      email: "siti@example.com",
      created_at: "2026-09-15T02:00:00.000Z",
      used_at: "2026-09-15T02:05:00.000Z",
    };

    const { serviceClient } = await import("@/lib/supabase/service");
    let participantCalls = 0;
    let attendanceCalls = 0;
    vi.mocked(serviceClient.from).mockImplementation(((table: string) => {
      if (table === "participants") {
        participantCalls++;
        // 1st call: the window registrations. Later calls are head counts, plus
        // the OTP email lookup that runs after the parallel batch.
        if (participantCalls === 1) return makeChain({ data: [registration], error: null });
        return makeChain({
          count: 1,
          data: [{ email: "siti@example.com", full_name: "Siti Aminah", serial_code: "SE0001" }],
          error: null,
        });
      }
      if (table === "attendance") {
        attendanceCalls++;
        if (attendanceCalls === 1) return makeChain({ data: [checkIn], error: null });
        return makeChain({ count: 1, data: [{ participant_id: "p1" }], error: null });
      }
      if (table === "otp_requests") return makeChain({ data: [otp], error: null });
      if (table === "admins") return makeAdminsChain();
      return makeChain({ count: 0, data: [], error: null });
    }) as unknown as typeof serviceClient.from);

    const { GET } = await import("@/app/api/admin/monitoring/route");
    const res = await GET(req());
    const body = await res.json();

    // One registration + one check-in + one OTP request + its verification.
    expect(body.feed).toHaveLength(4);
    expect(body.feed.map((e: { type: string }) => e.type)).toEqual([
      "check_in",
      "qr_verified",
      "qr_request",
      "registration",
    ]);

    const checkInEvent = body.feed[0];
    expect(checkInEvent.summary).toBe("Checked in — Kuliah");
    expect(checkInEvent.detail).toContain("Kuliah Subuh");
    expect(checkInEvent.detail).toContain("QR scan");
    expect(checkInEvent.operator).toBe("Ustaz Rahman");

    const registrationEvent = body.feed[3];
    expect(registrationEvent.summary).toBe("Registered via WhatsApp");
    expect(registrationEvent.detail).toContain("waiting");

    expect(body.kpis).toMatchObject({
      registrations: 1,
      check_ins: 1,
      qr_requests: 1,
      qr_retrievals: 1,
    });
    expect(body.check_in_methods.qr_scan).toBe(1);
    expect(body.operators[0]).toMatchObject({ name: "Ustaz Rahman", count: 1 });
    expect(body.window_channels).toMatchObject({ whatsapp: 1, email: 0 });
  });

  it("reports a failed query instead of passing off the gap as a zero", async () => {
    await authenticate();

    const { serviceClient } = await import("@/lib/supabase/service");
    vi.mocked(serviceClient.from).mockImplementation(((table: string) => {
      if (table === "admins") return makeAdminsChain();
      if (table === "participants") {
        return makeChain({
          count: null,
          data: null,
          error: { message: "statement timeout" },
        });
      }
      return makeChain({ count: 0, data: [], error: null });
    }) as unknown as typeof serviceClient.from);

    const { GET } = await import("@/app/api/admin/monitoring/route");
    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.failures.join(" ")).toContain("statement timeout");
    expect(body.failures.length).toBeGreaterThan(1);
  });

  it("labels check-ins with no operator as unattributed", async () => {
    await authenticate();

    const { serviceClient } = await import("@/lib/supabase/service");
    let attendanceCalls = 0;
    vi.mocked(serviceClient.from).mockImplementation(((table: string) => {
      if (table === "admins") return makeAdminsChain();
      if (table === "attendance") {
        attendanceCalls++;
        if (attendanceCalls === 1) {
          return makeChain({
            data: [
              {
                id: "a1",
                checked_in_at: "2026-09-15T03:00:00.000Z",
                check_in_method: "walk_in",
                is_synced: false,
                checked_in_by: null,
                participants: null,
                programmes: null,
                sessions: null,
              },
            ],
            error: null,
          });
        }
        return makeChain({ count: 0, data: [], error: null });
      }
      return makeChain({ count: 0, data: [], error: null });
    }) as unknown as typeof serviceClient.from);

    const { GET } = await import("@/app/api/admin/monitoring/route");
    const res = await GET(req());
    const body = await res.json();

    expect(body.operators[0].name).toBe("Unattributed (scanner)");
    expect(body.feed[0].name).toBe("Unknown participant");
    expect(body.feed[0].detail).toContain("awaiting offline sync");
    expect(body.feed[0].operator).toBeNull();
  });
});
