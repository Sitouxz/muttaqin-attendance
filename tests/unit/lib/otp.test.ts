import { describe, it, expect } from "vitest";
import { generateOtp, hashOtp, verifyOtp } from "@/lib/utils/otp";

describe("generateOtp", () => {
  it("returns a 6-digit string", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("generates different OTPs on successive calls (statistical)", () => {
    const otps = new Set(Array.from({ length: 20 }, () => generateOtp()));
    expect(otps.size).toBeGreaterThan(1);
  });
});

describe("hashOtp / verifyOtp", () => {
  it("produces a 64-char hex hash", async () => {
    const hash = await hashOtp("123456");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("same OTP always produces the same hash", async () => {
    const h1 = await hashOtp("654321");
    const h2 = await hashOtp("654321");
    expect(h1).toEqual(h2);
  });

  it("different OTPs produce different hashes", async () => {
    const h1 = await hashOtp("111111");
    const h2 = await hashOtp("222222");
    expect(h1).not.toEqual(h2);
  });

  it("verifyOtp returns true for matching OTP", async () => {
    const otp = "987654";
    const hash = await hashOtp(otp);
    expect(await verifyOtp(otp, hash)).toBe(true);
  });

  it("verifyOtp returns false for wrong OTP", async () => {
    const hash = await hashOtp("111111");
    expect(await verifyOtp("222222", hash)).toBe(false);
  });
});
