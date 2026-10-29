import { describe, expect, it } from "vitest";
import {
  planWednesdaySessions,
  sortSessionsMainFirst,
  weekOfMonth,
  weekOfSGT,
} from "@/lib/sessions/weekly";

describe("weekOfSGT", () => {
  it("resolves the cron's Monday 00:05 SGT run (Sunday 16:05 UTC) to that week", () => {
    expect(weekOfSGT(new Date("2026-11-01T16:05:00Z"))).toEqual({
      monday: "2026-11-02",
      wednesday: "2026-11-04",
    });
  });

  it("keeps Sunday in the week that started the Monday before", () => {
    expect(weekOfSGT(new Date("2026-11-08T15:59:00Z")).wednesday).toBe("2026-11-04");
  });

  it("crosses month boundaries", () => {
    expect(weekOfSGT(new Date("2026-12-28T02:00:00Z"))).toEqual({
      monday: "2026-12-28",
      wednesday: "2026-12-30",
    });
  });
});

describe("weekOfMonth", () => {
  it.each([
    ["2026-10-07", 1],
    ["2026-10-14", 2],
    ["2026-10-21", 3],
    ["2026-10-28", 4],
    ["2026-09-30", 5],
  ])("%s is week %i", (date, week) => {
    expect(weekOfMonth(date)).toBe(week);
  });
});

describe("planWednesdaySessions", () => {
  it("restarts at Sesi 1 with Senaman Bersama HPB on 4 Nov 2026", () => {
    expect(planWednesdaySessions("2026-11-04")).toEqual([
      {
        session_date: "2026-11-04",
        title: "Sesi 1: Kuliah 300 Hadith Bimbingan",
        programmeName: "Kuliah 300 Hadith Bimbingan",
        start_time: "09:00",
        end_time: "10:30",
      },
      {
        session_date: "2026-11-04",
        title: "Sesi 1: Senaman Bersama HPB",
        programmeName: "Active Ageing Activity",
        start_time: "11:00",
        end_time: "12:00",
      },
    ]);
  });

  it("matches the titles and programmes staff used in October", () => {
    const second = (date: string) => planWednesdaySessions(date)[1];
    expect(second("2026-10-14")).toMatchObject({
      title: "Sesi 2: Sesi kraf tangan oleh Methodist Welfare Services",
      programmeName: "Creativity & Craft",
    });
    expect(second("2026-10-21")).toMatchObject({
      title: "Sesi 3: Sesi Minda Aktif bersama Allkin",
      programmeName: "Brain Fitness",
    });
    expect(second("2026-10-28")).toMatchObject({
      title: "Sesi 4: Jom Bersukan! bersama Sunlove",
      programmeName: "Active Sports",
    });
  });

  it("plans only the kuliah on a 5th Wednesday", () => {
    expect(planWednesdaySessions("2026-12-30")).toEqual([
      expect.objectContaining({
        title: "Kuliah 300 Hadith Bimbingan",
        programmeName: "Kuliah 300 Hadith Bimbingan",
      }),
    ]);
  });
});

describe("sortSessionsMainFirst", () => {
  const session = (id: string, isDefault: boolean, start: string | null, date = "2026-11-04") => ({
    id,
    session_date: date,
    start_time: start,
    session_programmes: [{ programmes: { is_default: isDefault } }],
  });

  it("puts the kuliah ahead of an activity created after it", () => {
    const sorted = sortSessionsMainFirst([
      session("activity", false, "11:00:00"),
      session("kuliah", true, "09:00:00"),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["kuliah", "activity"]);
  });

  it("leads with the latest date, even over an older kuliah", () => {
    const sorted = sortSessionsMainFirst([
      session("old-kuliah", true, "09:00:00", "2026-10-28"),
      session("new-activity", false, "11:00:00"),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["new-activity", "old-kuliah"]);
  });
});
