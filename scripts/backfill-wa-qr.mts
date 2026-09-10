import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

/**
 * Sends the approved WhatsApp QR template to WhatsApp-route registrants still
 * marked `wa_qr_pending` — people who registered before cold sends were live and
 * never messaged the bot, so never received their card on WhatsApp.
 *
 * Uses the app's own `sendQrWhatsApp`, so this exercises exactly the production
 * send path. Twilio accepting a message is not WhatsApp delivering it: after each
 * send this polls the message until it reaches a terminal status, and clears the
 * pending flag only on delivered/read — a device receipt. A failed, undelivered
 * or still-unconfirmed card stays pending, so inbound-first delivery and the
 * admin "QR pending" badge still cover that person.
 *
 * Twilio credentials come from the environment; Supabase from .env.local.
 *
 *   TWILIO_WHATSAPP_NUMBER=whatsapp:+6589913776 TWILIO_QR_TEMPLATE_SID=HX... npx tsx --env-file=<chatbot>/.env.local scripts/backfill-wa-qr.mts [flags]
 *
 * Always set TWILIO_WHATSAPP_NUMBER explicitly. The chatbot's local .env.local
 * points at the WhatsApp Sandbox sender, which fails every real recipient with
 * error 63015 — the first canary run of this script did exactly that. Variables
 * already in the environment take precedence over --env-file.
 *
 *   --only=SE0029,SE0034   restrict to these serials
 *   --skip-test            exclude rows whose name contains "test"
 *   --apply                actually send (default is a dry run)
 *
 * Prints serials and statuses only — never names or phone numbers.
 */

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const SKIP_TEST = args.includes("--skip-test");
const ONLY = args
  .find((a) => a.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

// Only a device receipt counts. "sent" is not terminal: WhatsApp can still report
// undelivered after it — in the first backfill SE0034 went sent -> undelivered
// (63024) after this script had already cleared its pending flag.
const OK = new Set(["delivered", "read"]);
const BAD = new Set(["failed", "undelivered", "canceled"]);

/**
 * Twilio credentials arrive via --env-file from the chatbot project, which may
 * define its own Supabase vars. The attendance database must win for those, or
 * this reads the wrong project and builds the wrong media prefix — so Supabase
 * keys from this repo's .env.local always override; everything else only fills
 * gaps.
 */
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const [key, ...value] = line.split("=");
    const k = key?.trim();
    if (!k || !value.length) continue;
    const isSupabase = k.startsWith("NEXT_PUBLIC_SUPABASE_") || k.startsWith("SUPABASE_");
    if (isSupabase || !process.env[k]) process.env[k] = value.join("=").trim();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Must precede the send-qr import: its media prefix is read from
  // NEXT_PUBLIC_SUPABASE_URL when the module loads.
  loadEnvLocal();
  const { sendQrWhatsApp } = await import("../src/lib/whatsapp/send-qr");
  const { getTwilioClient, isWhatsAppConfigured } = await import("../src/lib/whatsapp/client");

  if (APPLY && !isWhatsAppConfigured()) {
    console.error("Twilio env incomplete (need ACCOUNT_SID, AUTH_TOKEN, WHATSAPP_NUMBER, QR_TEMPLATE_SID).");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let query = supabase
    .from("participants")
    .select("id, serial_code, full_name, phone, qr_card_url")
    .eq("reg_channel", "whatsapp")
    .eq("wa_qr_pending", true)
    .not("qr_card_url", "is", null)
    .order("serial_code");
  if (ONLY?.length) query = query.in("serial_code", ONLY);

  const { data, error } = await query;
  if (error) throw error;

  const targets = (data ?? []).filter((p) => !(SKIP_TEST && /test/i.test(p.full_name ?? "")));
  console.log(`${targets.length} pending registrant(s) targeted.`);
  if (!targets.length) return;

  if (!APPLY) {
    for (const p of targets) console.log(`  ${p.serial_code}`);
    console.log("\nDry run. Re-run with --apply to send.");
    return;
  }

  const client = getTwilioClient();
  const tally = { ok: 0, bad: 0, unknown: 0 };

  for (const p of targets) {
    const result = await sendQrWhatsApp({
      full_name: p.full_name,
      phone: p.phone,
      serial_code: p.serial_code,
      qr_card_url: p.qr_card_url!,
    });
    if (!result.delivered || !result.sid) {
      console.log(`  ${p.serial_code}: not accepted by Twilio — ${result.reason}: ${result.error ?? ""}`);
      tally.bad++;
      continue;
    }

    // Poll to a terminal status; "queued"/"accepted" say nothing about WhatsApp.
    let status = "accepted";
    let errorCode: number | null = null;
    for (let i = 0; i < 15 && !OK.has(status) && !BAD.has(status); i++) {
      await sleep(3000);
      const msg = await client.messages(result.sid).fetch();
      status = msg.status;
      errorCode = msg.errorCode;
    }

    if (OK.has(status)) {
      await supabase
        .from("participants")
        .update({ wa_qr_pending: false })
        .eq("id", p.id)
        .eq("wa_qr_pending", true);
      console.log(`  ${p.serial_code}: ${status} (${result.sid}) — pending cleared`);
      tally.ok++;
    } else if (BAD.has(status)) {
      console.log(`  ${p.serial_code}: ${status}, error ${errorCode} (${result.sid}) — left pending`);
      tally.bad++;
    } else {
      console.log(`  ${p.serial_code}: still ${status} after 45s (${result.sid}) — left pending`);
      tally.unknown++;
    }
  }

  console.log(`\nok ${tally.ok} · failed ${tally.bad} · unconfirmed ${tally.unknown}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
