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

  it("stars the main programme's session only", async () => {
    const session = (id: string, title: string, isDefault: boolean) => ({
      id,
      title,
      session_date: "2026-11-04",
      start_time: null,
      end_time: null,
      status: "active",
      session_programmes: [
        { programme_id: `p-${id}`, programmes: { id: `p-${id}`, name: title, colour: "#173d35", is_default: isDefault } },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sessions: [
            session("kuliah", "Sesi 1: Kuliah 300 Hadith Bimbingan", true),
            session("activity", "Sesi 1: Senaman Bersama HPB", false),
          ],
        }),
      })
    );

    render(await LandingPage());

    const stars = screen.getAllByRole("img", { name: "Program utama / Main programme" });
    expect(stars).toHaveLength(1);
    expect(stars[0].parentElement).toHaveTextContent("Sesi 1: Kuliah 300 Hadith Bimbingan");
  });
});
