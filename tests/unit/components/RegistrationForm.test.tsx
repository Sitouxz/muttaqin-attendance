import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { RegistrationForm } from "@/components/public/RegistrationForm";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function fillField(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement;
  fireEvent.change(el, { target: { value } });
}

async function submitForm() {
  const btn = screen.getByRole("button", { name: /daftar sekarang/i });
  await act(async () => {
    fireEvent.click(btn);
  });
}

describe("RegistrationForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all form fields", () => {
    render(<RegistrationForm />);
    expect(document.getElementById("full_name")).toBeInTheDocument();
    expect(document.getElementById("email")).toBeInTheDocument();
    expect(document.getElementById("phone")).toBeInTheDocument();
    expect(document.getElementById("age")).toBeInTheDocument();
    expect(document.getElementById("postal_code")).toBeInTheDocument();
    expect(document.getElementById("email_consent")).toBeInTheDocument();
  });

  it("shows validation error for invalid phone number on submit", async () => {
    render(<RegistrationForm />);

    fillField("full_name", "Ahmad Bin Ali");
    fillField("email", "ahmad@test.com");
    // Invalid phone: starts with 1 (not 8 or 9)
    fillField("phone", "12345678");
    fillField("age", "30");
    fillField("postal_code", "123456");

    await submitForm();

    await waitFor(() => {
      expect(
        screen.getByText(/valid singapore mobile/i)
      ).toBeInTheDocument();
    });
  });

  it("shows bilingual error message when API returns 409 (email exists)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 409,
        ok: false,
        json: async () => ({ error: "EMAIL_EXISTS" }),
      })
    );

    render(<RegistrationForm />);

    fillField("full_name", "Ahmad Bin Ali");
    fillField("email", "ahmad@test.com");
    fillField("phone", "91234567");
    // age is a number field - use valueAsNumber simulation
    const ageEl = document.getElementById("age") as HTMLInputElement;
    fireEvent.change(ageEl, { target: { value: "30", valueAsNumber: 30 } });
    fillField("postal_code", "123456");

    await submitForm();

    await waitFor(() => {
      expect(screen.getByText(/e-mel sudah didaftarkan/i)).toBeInTheDocument();
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
  });
});
