import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { QrEmail } from "@/emails/QrEmail";

const participant = {
  full_name: "Nur Aisyah binti Abdul Rahman",
  serial_code: "SE0024",
  qr_card_url: "https://example.test/cards/SE0024.png",
  qr_image_url: "https://example.test/qr/tok.png",
  qr_token: "tok",
};

/** The download link's markup, from the opening <a ...> to its closing tag. */
function downloadAnchor(html: string) {
  const match = html.match(/<a[^>]*href="https:\/\/example\.test\/cards\/SE0024\.png"[\s\S]*?<\/a>/);
  if (!match) throw new Error("download anchor not found");
  return match[0];
}

describe("QrEmail", () => {
  it("shows the participant's name, serial code and QR card", async () => {
    const html = await render(QrEmail({ participant }));

    expect(html).toContain("Nur Aisyah binti Abdul Rahman");
    expect(html).toContain("SE0024");
    expect(html).toContain(`src="${participant.qr_card_url}"`);
  });

  it("points the download link at the branded QR card", async () => {
    const html = await render(QrEmail({ participant }));

    expect(downloadAnchor(html)).toContain('href="https://example.test/cards/SE0024.png"');
  });

  // Regression: the label used to be "Muat Turun Kod QR / Download QR Card" on a
  // bare inline <a>. Inline elements apply padding per line-box, so once the label
  // wrapped on a narrow client the first line overflowed the container and clipped
  // while the second became a stray pill. Reported by the client 2026-09-04.
  it("renders the download button as a block that cannot wrap or overflow", async () => {
    const anchor = downloadAnchor(await render(QrEmail({ participant })));

    expect(anchor).toMatch(/display:\s*inline-block/);
    expect(anchor).toMatch(/max-width:\s*100%/);
  });

  it("keeps the button label short enough to stay on one line", async () => {
    const anchor = downloadAnchor(await render(QrEmail({ participant })));
    const label = anchor.replace(/<[^>]*>/g, "").replace(/&#\d+;/g, "").trim();

    expect(label).toBe("Muat Turun Kod QR");
    expect(label).not.toContain("/");
  });

  it("keeps the English wording as a caption outside the button", async () => {
    const html = await render(QrEmail({ participant }));

    expect(html).toContain("Download QR Card");
    expect(downloadAnchor(html)).not.toContain("Download QR Card");
  });
});
