import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LandingPage from "@/app/(public)/page";

describe("LandingPage", () => {
  it("shows the Santunan Emas logo at the top", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sessions: [] }),
      })
    );

    render(await LandingPage());

    const logo = screen.getByRole("img", { name: "Santunan Emas logo" });

    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", expect.stringContaining("logo.png"));
  });
});
