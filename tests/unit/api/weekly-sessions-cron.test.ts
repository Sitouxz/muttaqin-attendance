import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const PROGRAMMES = [
  { id: "p-kuliah", name: "Kuliah 300 Hadith Bimbingan" },
  { id: "p-senaman", name: "Active Ageing Activity" },
];

interface Db {
  programmes: Array<{ id: string; name: string }>;
  existingProgrammeIds: string[];
  closedIds: string[];
  insertedSessions: Array<Record<string, unknown>>;
  insertedLinks: Array<Record<string, unknown>>;
}

let db: Db;

/** Chainable stub: every filter returns the chain; awaiting it (or .single()) yields `result()`. */
function chain(result: () => unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "lt", "in", "update", "delete"]) c[m] = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve(result()));
  c.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve);
  return c;
}

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    from: vi.fn((table: string) => {
      if (table === "programmes") {
        return chain(() => ({ data: db.programmes, error: null }));
      }
      if (table === "session_programmes") {
        return {
          insert: vi.fn((row: Record<string, unknown>) => {
            db.insertedLinks.push(row);
            return Promise.resolve({ error: null });
          }),
        };
      }
      // sessions: update (close last week), select (existing), insert (create)
      const c = chain(() => ({ data: [], error: null }));
      c.update = vi.fn(() =>
        chain(() => ({ data: db.closedIds.map((id) => ({ id })), error: null }))
      );
      c.select = vi.fn(() =>
        chain(() => ({
          data: [{ session_programmes: db.existingProgrammeIds.map((programme_id) => ({ programme_id })) }],
          error: null,
        }))
      );
      c.insert = vi.fn((row: Record<string, unknown>) => {
        db.insertedSessions.push(row);
        return chain(() => ({ data: { id: `s-${db.insertedSessions.length}` }, error: null }));
      });
      return c;
    }),
  },
}));

function req(auth?: string) {
  return new NextRequest("http://localhost/api/cron/weekly-sessions", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("GET /api/cron/weekly-sessions", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    // Monday 2 Nov 2026, 00:05 SGT
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T16:05:00Z"));
    db = {
      programmes: PROGRAMMES,
      existingProgrammeIds: [],
      closedIds: ["old-kuliah", "old-activity"],
      insertedSessions: [],
      insertedLinks: [],
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("rejects calls without the cron secret", async () => {
    const { GET } = await import("@/app/api/cron/weekly-sessions/route");
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect(db.insertedSessions).toHaveLength(0);
  });

  it("closes last week and opens Wednesday's kuliah and Sesi 1 activity", async () => {
    const { GET } = await import("@/app/api/cron/weekly-sessions/route");
    const res = await GET(req("Bearer test-secret"));
    expect(res.status).toBe(200);

    expect(await res.json()).toEqual({
      wednesday: "2026-11-04",
      completed: 2,
      created: ["Sesi 1: Kuliah 300 Hadith Bimbingan", "Sesi 1: Senaman Bersama HPB"],
      skipped: [],
    });
    expect(db.insertedSessions).toEqual([
      expect.objectContaining({ session_date: "2026-11-04", status: "active", start_time: "09:00" }),
      expect.objectContaining({ session_date: "2026-11-04", status: "active", start_time: "11:00" }),
    ]);
    expect(db.insertedLinks).toEqual([
      { session_id: "s-1", programme_id: "p-kuliah" },
      { session_id: "s-2", programme_id: "p-senaman" },
    ]);
  });

  it("leaves a programme alone when staff already scheduled it that Wednesday", async () => {
    db.existingProgrammeIds = ["p-kuliah"];
    const { GET } = await import("@/app/api/cron/weekly-sessions/route");
    const body = await (await GET(req("Bearer test-secret"))).json();

    expect(body.skipped).toEqual(["Sesi 1: Kuliah 300 Hadith Bimbingan"]);
    expect(body.created).toEqual(["Sesi 1: Senaman Bersama HPB"]);
  });

  it("refuses to run when a rotation programme has been renamed", async () => {
    db.programmes = [PROGRAMMES[0]];
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("@/app/api/cron/weekly-sessions/route");
    const res = await GET(req("Bearer test-secret"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "PROGRAMMES_NOT_FOUND",
      missing: ["Active Ageing Activity"],
    });
    expect(db.insertedSessions).toHaveLength(0);
  });
});
