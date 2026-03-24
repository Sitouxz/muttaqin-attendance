import { describe, it, expect } from "vitest";

describe("GET /api/admin/dashboard/stats", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await fetch("http://localhost:3000/api/admin/dashboard/stats");
    expect(res.status).toBe(401);
  });
});
