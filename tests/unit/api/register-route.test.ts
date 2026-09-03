import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const participant = {
    id: "new-participant-id",
    serial_code: "SE0007",
    full_name: "Nur Registrant",
    email: "nur@example.com",
    phone: "91234567",
    age: 61,
    gender: "male",
    postal_code: "560100",
    participant_category: "warga_emas",
    reg_channel: "email",
    qr_token: "11111111-1111-4111-8111-111111111111",
    qr_image_url: null,
    qr_card_url: null,
  };

  const insert = vi.fn(() => chain);
  const update = vi.fn(() => chain);
  const chain = {
    insert,
    update,
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: participant, error: null })),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  };

  return {
    participant,
    insert,
    from: vi.fn(() => chain),
    uploadQrAssets: vi.fn().mockResolvedValue({
      qr_image_url: "https://example.test/qr.png",
      qr_card_url: "https://example.test/cards/SE0007.png",
    }),
    sendQrEmail: vi.fn().mockResolvedValue({ id: "email-id" }),
    sendQrWhatsApp: vi.fn().mockResolvedValue({ delivered: true, sid: "SM1" }),
  };
});

vi.mock("@/lib/supabase/service", () => ({
  serviceClient: { from: mocks.from },
}));
vi.mock("@/lib/qr/assets", () => ({ uploadQrAssets: mocks.uploadQrAssets }));
vi.mock("@/lib/email/send-qr", () => ({ sendQrEmail: mocks.sendQrEmail }));
vi.mock("@/lib/whatsapp/send-qr", () => ({ sendQrWhatsApp: mocks.sendQrWhatsApp }));

const baseRegistration = {
  full_name: "Nur Registrant",
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
  });

  it("registers via email: stores channel, provisions assets, emails the card", async () => {
    const { POST } = await import("@/app/api/register/route");

    const res = await POST(
      postRequest({ ...baseRegistration, reg_channel: "email", email: "nur@example.com" }),
    );

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      success: true,
      participant_id: "new-participant-id",
      serial_code: "SE0007",
      reg_channel: "email",
      delivery: "sent",
    });

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ reg_channel: "email", email: "nur@example.com" }),
    );
    expect(mocks.uploadQrAssets).toHaveBeenCalledOnce();
    expect(mocks.sendQrEmail).toHaveBeenCalledOnce();
    expect(mocks.sendQrWhatsApp).not.toHaveBeenCalled();
  });

  it("rejects an email-channel registration with no email address", async () => {
    const { POST } = await import("@/app/api/register/route");
    const res = await POST(postRequest({ ...baseRegistration, reg_channel: "email" }));
    expect(res.status).toBe(400);
  });

  it("registers via WhatsApp: no email required, delivers over WhatsApp", async () => {
    mocks.participant.reg_channel = "whatsapp";
    mocks.participant.email = null as unknown as string;
    const { POST } = await import("@/app/api/register/route");

    const res = await POST(postRequest({ ...baseRegistration, reg_channel: "whatsapp" }));

    expect(res.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ reg_channel: "whatsapp", email: null }),
    );
    expect(mocks.sendQrWhatsApp).toHaveBeenCalledOnce();
    expect(mocks.sendQrEmail).not.toHaveBeenCalled();
  });
});
