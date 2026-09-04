#!/usr/bin/env node
/**
 * Santunan Emas — WhatsApp QR-card template setup.
 *
 * Creates the Twilio Content template used to deliver the branded QR card to
 * new registrants over WhatsApp, submits it to Meta for approval, and lets you
 * poll the status. Run it against the same Twilio account the Muttaqin Chatbot
 * uses.
 *
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN in the environment.
 * The Chatbot repo's .env.local has both — run with Node's --env-file:
 *
 *   node --env-file="D:/Works/Neu Entity/Muttaqin Chatbot/.env.local" \
 *        scripts/whatsapp-template-setup.mjs <command>
 *
 * Commands:
 *   senders            List WhatsApp senders on the account (find SE's number + status)
 *   create             Create the template + submit for WhatsApp approval → prints HX SID
 *   status <HX...>     Check the approval status of a template
 *   send-test <HX...> <toE164> <fromE164>
 *                      Send the template to a number (that number must have
 *                      messaged the sender in the last 24h, OR the template
 *                      must already be APPROVED)
 *   delete <HX...>     Delete a template
 */

import twilio from "twilio";

// Meta burns the name of a rejected template — bump the suffix to resubmit.
const FRIENDLY_NAME = "santunan_emas_qr_card_v3";
const LANGUAGE = "ms"; // Bahasa Melayu
const CATEGORY = "UTILITY";

// {{1}} = QR card image URL (media header), {{2}} = serial code (SE0001).
// Matches contentVariables in src/lib/whatsapp/send-qr.ts.
const BODY =
  "Pendaftaran anda telah berjaya. Nombor rujukan anda ialah {{2}}. " +
  "Sila simpan kod QR ini dan tunjukkannya semasa pendaftaran.";

const SAMPLE = {
  1: "https://pbeizncjbyyppwtecrau.supabase.co/storage/v1/object/public/qr-codes/cards/_sample.png",
  2: "SE0001",
};

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
if (!sid || !token) {
  console.error("Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in the environment.");
  console.error('Run with:  node --env-file="…/Muttaqin Chatbot/.env.local" scripts/whatsapp-template-setup.mjs <command>');
  process.exit(1);
}
const client = twilio(sid, token);
const [cmd, ...args] = process.argv.slice(2);

async function listSenders() {
  // WhatsApp senders (Channels v2)
  try {
    const res = await client.request({
      method: "GET",
      uri: `https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp&PageSize=50`,
    });
    const senders = res.body?.senders ?? [];
    console.log(`WhatsApp senders (${senders.length}):`);
    for (const s of senders) {
      console.log(`  ${s.sender_id ?? s.sid}\tstatus=${s.status}\tprofile=${s.profile?.name ?? ""}`);
    }
  } catch (err) {
    console.log("Could not list WhatsApp senders:", err.message);
  }

  // Messaging services (a WhatsApp sender is usually attached to one)
  const services = await client.messaging.v1.services.list({ limit: 50 });
  console.log(`\nMessaging Services (${services.length}):`);
  for (const svc of services) console.log(`  ${svc.sid}\t${svc.friendlyName}`);

  // Existing content templates (so we don't create a duplicate)
  const contents = await client.content.v1.contents.list({ limit: 100 });
  const mine = contents.filter((c) => c.friendlyName?.includes("santunan") || c.friendlyName?.includes("qr"));
  console.log(`\nContent templates matching santunan/qr (${mine.length}):`);
  for (const c of mine) console.log(`  ${c.sid}\t${c.friendlyName}\t${c.language}`);
}

async function submitApproval(hx) {
  const approval = await client.content.v1
    .contents(hx)
    .approvalCreate.create({ name: FRIENDLY_NAME, category: CATEGORY });
  console.log("Approval submitted:", approval.status);
  return approval;
}

async function create() {
  // Reuse an existing template with this friendly name if one is already there.
  const existing = (await client.content.v1.contents.list({ limit: 200 })).find(
    (c) => c.friendlyName === FRIENDLY_NAME,
  );
  let content = existing;
  if (existing) {
    console.log("Reusing existing template:", existing.sid);
  } else {
    content = await client.content.v1.contents.create({
      friendlyName: FRIENDLY_NAME,
      language: LANGUAGE,
      variables: SAMPLE,
      types: {
        "twilio/media": { body: BODY, media: ["{{1}}"] },
      },
    });
    console.log("Created template:", content.sid);
  }

  await submitApproval(content.sid);

  console.log("\nNext:");
  console.log(`  1. Poll:  node --env-file=… scripts/whatsapp-template-setup.mjs status ${content.sid}`);
  console.log("  2. When APPROVED, set in the santunan-emas Vercel project:");
  console.log(`       TWILIO_QR_TEMPLATE_SID=${content.sid}`);
  console.log("       TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN  (same as chatbot)");
  console.log("       TWILIO_WHATSAPP_NUMBER=whatsapp:+65XXXXXXXX  (SE's registered sender)");
  console.log("       SE_WHATSAPP_NOTIFY_NUMBER=+65XXXXXXXX        (SE's own WhatsApp, for the copy)");
  console.log("       NEXT_PUBLIC_WHATSAPP_ENABLED=true");
}

async function status(hx) {
  if (!hx) return console.error("usage: status <HX...>");
  const content = await client.content.v1.contents(hx).fetch();
  console.log("friendlyName:", content.friendlyName, "| language:", content.language);
  const approvals = await client.content.v1.contents(hx).approvalFetch().fetch().catch((e) => {
    console.log("(approvalFetch failed:", e.message + ")");
    return null;
  });
  const wa = approvals?.whatsapp;
  console.log("whatsapp status:", wa?.status ?? "unknown", "| category:", wa?.category ?? "");
  if (wa?.rejectionReason) console.log("rejectionReason:", wa.rejectionReason);
  console.log(JSON.stringify(approvals ?? {}, null, 2));
}

async function sendTest(hx, to, from) {
  if (!hx || !to || !from) return console.error("usage: send-test <HX...> <toE164> <fromE164>");
  const msg = await client.messages.create({
    from: `whatsapp:${from}`,
    to: `whatsapp:${to}`,
    contentSid: hx,
    contentVariables: JSON.stringify(SAMPLE),
  });
  console.log("sid:", msg.sid, "status:", msg.status);
}

async function del(hx) {
  if (!hx) return console.error("usage: delete <HX...>");
  await client.content.v1.contents(hx).remove();
  console.log("deleted", hx);
}

const run = {
  senders: listSenders,
  create,
  status: () => status(args[0]),
  "send-test": () => sendTest(args[0], args[1], args[2]),
  delete: () => del(args[0]),
}[cmd];

if (!run) {
  console.error("commands: senders | create | status <HX> | send-test <HX> <to> <from> | delete <HX>");
  process.exit(1);
}
run().catch((err) => {
  console.error("Error:", err.message);
  if (err.code) console.error("code:", err.code, "moreInfo:", err.moreInfo ?? "");
  process.exit(1);
});
