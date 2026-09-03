import { describe, it, expect } from "vitest";
import { RegisterSchema } from "@/lib/validations/participant";

describe("RegisterSchema", () => {
  const valid = {
    full_name: "Ali bin Ahmad",
    reg_channel: "email",
    email: "ali@example.com",
    phone: "91234567",
    age: 55,
    gender: "male",
    postal_code: "123456",
    participant_category: "warga_emas",
  };

  it("accepts a valid registration", () => {
    expect(RegisterSchema.safeParse(valid).success).toBe(true);
  });

  const withoutEmail = () => {
    const copy: Record<string, unknown> = { ...valid };
    delete copy.email;
    return copy;
  };

  it("accepts a WhatsApp registration with no email", () => {
    expect(
      RegisterSchema.safeParse({ ...withoutEmail(), reg_channel: "whatsapp" }).success,
    ).toBe(true);
  });

  it("rejects an email registration with no email", () => {
    expect(RegisterSchema.safeParse(withoutEmail()).success).toBe(false);
  });

  it("rejects age below 1", () => {
    const r = RegisterSchema.safeParse({ ...valid, age: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects age above 120", () => {
    const r = RegisterSchema.safeParse({ ...valid, age: 121 });
    expect(r.success).toBe(false);
  });

  it("rejects non-SG phone starting with 6 (landline)", () => {
    const r = RegisterSchema.safeParse({ ...valid, phone: "61234567" });
    expect(r.success).toBe(false);
  });

  it("rejects phone starting with 7", () => {
    const r = RegisterSchema.safeParse({ ...valid, phone: "71234567" });
    expect(r.success).toBe(false);
  });

  it("accepts phone starting with 8", () => {
    expect(RegisterSchema.safeParse({ ...valid, phone: "81234567" }).success).toBe(true);
  });

  it("accepts phone starting with 9", () => {
    expect(RegisterSchema.safeParse({ ...valid, phone: "91234567" }).success).toBe(true);
  });

  it("rejects 5-digit postal code", () => {
    const r = RegisterSchema.safeParse({ ...valid, postal_code: "12345" });
    expect(r.success).toBe(false);
  });

  it("rejects 7-digit postal code", () => {
    const r = RegisterSchema.safeParse({ ...valid, postal_code: "1234567" });
    expect(r.success).toBe(false);
  });

  it("rejects non-numeric postal code", () => {
    const r = RegisterSchema.safeParse({ ...valid, postal_code: "12345A" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = RegisterSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("rejects full_name shorter than 2 chars", () => {
    const r = RegisterSchema.safeParse({ ...valid, full_name: "A" });
    expect(r.success).toBe(false);
  });
});
