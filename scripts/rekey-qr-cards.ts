import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

/**
 * One-off: move branded QR cards off the guessable `cards/<serial_code>.png`
 * path onto `cards/<qr_token>.png`.
 *
 * The `qr-codes` bucket is public, so an exact object path is fetchable with no
 * auth, and serials run SE0001, SE0002, … — guessing one guessed everyone's.
 * A card carries a scannable QR, so that was a route to checking in as another
 * participant. UUID paths are not enumerable.
 *
 * Copies first, repoints `qr_card_url`, and only then deletes the old object, so
 * an interrupted run leaves a working card rather than a dead link. Re-runnable.
 *
 *   npx tsx scripts/rekey-qr-cards.ts          # report only
 *   npx tsx scripts/rekey-qr-cards.ts --apply  # perform the move
 */

const BUCKET = "qr-codes";
const APPLY = process.argv.includes("--apply");

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const vars: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const [key, ...value] = line.split("=");
    if (key && value.length) vars[key.trim()] = value.join("=").trim();
  }
  return vars;
}

const env = loadEnv();
const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
const serviceKey = env["SUPABASE_SERVICE_ROLE_KEY"];
if (!supabaseUrl || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const storage = supabase.storage.from(BUCKET);

async function main() {
  const { data: participants, error } = await supabase
    .from("participants")
    .select("id, serial_code, qr_token, qr_card_url")
    .not("qr_card_url", "is", null)
    .order("serial_code");

  if (error) throw error;

  const stale = (participants ?? []).filter(
    (p) => p.qr_card_url && !p.qr_card_url.includes(`cards/${p.qr_token}.png`),
  );

  console.log(`${participants?.length ?? 0} participants with a card, ${stale.length} to rekey.`);
  if (!stale.length) return;

  if (!APPLY) {
    for (const p of stale) console.log(`  ${p.serial_code}  ->  cards/${p.qr_token}.png`);
    console.log("\nDry run. Re-run with --apply to perform the move.");
    return;
  }

  let moved = 0;
  for (const p of stale) {
    const oldPath = `cards/${p.serial_code}.png`;
    const newPath = `cards/${p.qr_token}.png`;

    const { error: copyError } = await storage.copy(oldPath, newPath);
    // A repeat run finds the destination already there; that is not a failure.
    if (copyError && !/exists/i.test(copyError.message)) {
      console.error(`  ${p.serial_code}: copy failed — ${copyError.message}`);
      continue;
    }

    const publicUrl = storage.getPublicUrl(newPath).data.publicUrl;
    const { error: updateError } = await supabase
      .from("participants")
      .update({ qr_card_url: publicUrl })
      .eq("id", p.id);
    if (updateError) {
      console.error(`  ${p.serial_code}: db update failed — ${updateError.message}`);
      continue;
    }

    // Last, so a failure above never strands the participant without a card.
    const { error: removeError } = await storage.remove([oldPath]);
    if (removeError) {
      console.error(`  ${p.serial_code}: moved, but old object remains — ${removeError.message}`);
    } else {
      console.log(`  ${p.serial_code}: moved to ${newPath}`);
    }
    moved++;
  }

  console.log(`\nRekeyed ${moved}/${stale.length}.`);
  const { data: left } = await storage.list("cards");
  const serialKeyed = (left ?? []).filter((o) => /^SE\d+\.png$/.test(o.name));
  console.log(
    serialKeyed.length
      ? `Still serial-keyed: ${serialKeyed.map((o) => o.name).join(", ")}`
      : "No serial-keyed cards remain.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
