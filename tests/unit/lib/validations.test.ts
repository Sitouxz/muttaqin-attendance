import { describe, it, expect } from "vitest";
import {
  ParticipantUpdateSchema,
  RegisterSchema,
  SgMobileSchema,
} from "@/lib/validations/participant";

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

describe("SgMobileSchema", () => {
  it.each([
    ["91234567", "91234567"],
    ["+65 9123 4567", "91234567"],
    ["6591234567", "91234567"],
    ["8123-4567", "81234567"],
  ])("normalises %s to the stored 8 digits", (input, expected) => {
    expect(SgMobileSchema.parse(input)).toBe(expected);
  });

  it.each(["61234567", "12345678", "9123456", "912345678", "abcdefgh"])(
    "rejects %s",
    (input) => {
      expect(SgMobileSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("ParticipantUpdateSchema", () => {
  it("accepts a name-only edit", () => {
    const r = ParticipantUpdateSchema.safeParse({ full_name: "Nur Aisyah" });
    expect(r.success).toBe(true);
  });

  // The client-reported bug: an empty email blocked saving an unrelated edit.
  it("accepts an empty email alongside a name change", () => {
    const r = ParticipantUpdateSchema.safeParse({ full_name: "Nur Aisyah", email: "" });
    expect(r.success).toBe(true);
  });

  it("accepts a null email", () => {
    const r = ParticipantUpdateSchema.safeParse({ email: null });
    expect(r.success).toBe(true);
  });

  it("still rejects a malformed email", () => {
    const r = ParticipantUpdateSchema.safeParse({ email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("accepts gender and participant_category, which used to be dropped", () => {
    const r = ParticipantUpdateSchema.safeParse({
      gender: "female",
      participant_category: "warga_emas",
    });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ gender: "female", participant_category: "warga_emas" });
  });

  it("rejects an unknown gender", () => {
    expect(ParticipantUpdateSchema.safeParse({ gender: "other" }).success).toBe(false);
  });
});
