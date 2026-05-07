import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const participant = {
    id: "new-participant-id",
    full_name: "Duplicate Email Registrant",
    email: "duplicate@example.com",
    phone: "91234567",
    age: 61,
    gender: "male",
    postal_code: "560100",
    participant_category: "warga_emas",
    qr_token: "11111111-1111-4111-8111-111111111111",
    qr_image_url: null,
  };

  const chains: Array<{
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  }> = [];

  function createParticipantsChain() {
    const state = { operation: "duplicate-check" };
    const chain = {
      insert: vi.fn(() => {
        state.operation = "insert";
        return chain;
      }),
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      single: vi.fn(() => {
        if (state.operation === "insert") {
          return Promise.resolve({ data: participant, error: null });
        }

        return Promise.resolve({ data: { id: "existing-participant-id" }, error: null });
      }),
      update: vi.fn(() => {
        state.operation = "update";
        return chain;
      }),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
    };

    chains.push(chain);
    return chain;
  }

  const from = vi.fn((table: string) => {
    if (table !== "participants") {
      throw new Error(`Unexpected table: ${table}`);
    }

    return createParticipantsChain();
  });

  return {
    chains,
    from,
    participant,
    storageFrom: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.test/qr.png" } })),
    })),
    generateQrToken: vi.fn(() => "11111111-1111-4111-8111-111111111111"),
    generateQrPng: vi.fn().mockResolvedValue(Buffer.from("png")),
    sendQrEmail: vi.fn().mockResolvedValue({ id: "email-id" }),
  };
});

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: {
    from: mocks.from,
    storage: {
      from: mocks.storageFrom,
    },
  },
}));

vi.mock("@/lib/utils/qr", () => ({
  generateQrToken: mocks.generateQrToken,
  generateQrPng: mocks.generateQrPng,
}));

vi.mock("@/lib/email/send-qr", () => ({
  sendQrEmail: mocks.sendQrEmail,
}));

const validRegistration = {
  full_name: "Duplicate Email Registrant",
  email: "duplicate@example.com",
  phone: "91234567",
  age: 61,
  gender: "male",
  postal_code: "560100",
  participant_category: "warga_emas",
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/register", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chains.length = 0;
  });

  it("creates a new participant when the email is already registered", async () => {
    const { POST } = await import("@/app/api/register/route");

    const res = await POST(postRequest(validRegistration));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      success: true,
      participant_id: "new-participant-id",
    });

    const insertChain = mocks.chains.find((chain) => chain.insert.mock.calls.length > 0);
    expect(insertChain?.insert).toHaveBeenCalledWith({
      ...validRegistration,
      qr_token: "11111111-1111-4111-8111-111111111111",
    });
  });
});
