# Registration v2 — Unique Codes, WhatsApp Route, Branded QR

**Source:** ClickUp [86ewztd4c](https://app.clickup.com/t/86ewztd4c), latest client comment (Sep 2026).
**Status:** Phase 1 in progress · Phase 2 blocked on Twilio template approval.
**Branch:** `feat/registration-v2` off `codex/allow-duplicate-email-registration` (stacks on the "email optional" PR).

---

## 1. What the client asked for

| # | Request | Phase |
|---|---------|-------|
| 1 | Every registration tied to a unique human code — `SE0001`, `SE0002`, … | 1 |
| 2 | **Route 1 — Phone/WhatsApp:** register with phone; QR + code sent via WhatsApp from SE's number | 2 |
| 3 | **Route 2 — Email:** register with email; QR + code sent via email | 1 |
| 4 | SE receives a copy of every email / WhatsApp sent to a registrant | 1 (email) / 2 (WA) |
| 5 | Unique code + QR image visible in the admin dashboard | 1 |
| 6 | Branded QR card image: SE logo, name, QR + code, caption *"Tunjukkan kod QR ini semasa pendaftaran"* | 1 |

---

## 2. Current system (as built)

- Next.js 16 (webpack) + Supabase (production project `bquhcqvjpadrfeurfmfl`) + Resend + Vercel (`santunan-emas`, domain `attendance.santunanemas.sg`).
  - Note: `0001_initial_schema.sql` has a stale `hqiwdihnihdfjgbjpbqr` comment; `.env.local` points at `pbeizncjbyyppwtecrau` — both need reconciling with prod.
- `participants`: `qr_token` (UUID, the QR payload), `qr_image_url` (plain PNG in `qr-codes` bucket), `email` (was UNIQUE — dropped in migration 0005), `phone` (SG mobile, always required).
- Register flow: `POST /api/register` → insert → `generateQrPng(qr_token)` → upload `<token>.png` → `sendQrEmail`.
- Retrieve QR: email-only OTP (`otp_requests`), 10-min TTL.
- WhatsApp precedent: **Muttaqin Chatbot** repo uses `twilio` v5, `client.messages.create({ from: TWILIO_WHATSAPP_NUMBER, to, body })`, `requireEnv`/`cleanEnv` BOM guard, `twilio.validateRequest` for inbound signatures. It only ever *replies* inside the 24h window — it has **no business-initiated / template send** to copy from. SE's local number is already a registered WhatsApp sender on that Twilio account.

---

## 3. Design decisions

### 3.1 Serial code `SE0001`
- Postgres `SEQUENCE participants_serial_seq`.
- `serial_code TEXT UNIQUE` filled by a `BEFORE INSERT` trigger: `'SE' || lpad(nextval(...)::text, 4, '0')`.
- 4-digit pad now; rolls over to 5 digits naturally at `SE10000`.
- Backfill existing rows ordered by `created_at ASC`, then set the sequence past the max.
- Pure sequence, no year scoping (per client).

### 3.2 Two images per participant
| Column | Content | Consumer | Bucket path |
|--------|---------|----------|-------------|
| `qr_image_url` | plain QR, quiet zone, no decoration | the scanner (`/scan`) | `qr-codes/<qr_token>.png` (unchanged) |
| `qr_card_url` | branded card: logo · name · QR · `SE0001` · caption | humans — email body, WhatsApp media, admin, print | `qr-codes/cards/<serial>.png` |

Rationale: decorated QRs scan less reliably; keep the machine-read image clean and give people a separate nice card. Both are generated at registration.

### 3.3 Branded card rendering
- `sharp` 0.34.5 is installed (full librsvg + pango + fontconfig).
- Build an SVG string: background, SE logo + plain-QR embedded as base64 `<image>`, `<text>` for name / `SE0001` / caption, bundled font via base64 `@font-face` (don't trust Vercel system fonts).
- `sharp(Buffer.from(svg)).png()` → upload.
- Card copy: name (large), `SE0001` (mono, prominent), caption *"Tunjukkan kod QR ini semasa pendaftaran"* + EN subtitle *"Show this QR code during registration"*.
- Bundle a font at `src/assets/fonts/` (e.g. Inter or DejaVuSans, OFL/Apache).

### 3.4 Channels
- `reg_channel TEXT NOT NULL DEFAULT 'email' CHECK (reg_channel IN ('email','whatsapp'))`.
- `email` → nullable. Add `CHECK (email IS NOT NULL OR phone IS NOT NULL)`.
- `RegisterSchema`: `phone` always required (SG mobile). `email` optional but **required when `reg_channel = 'email'`** (zod `superRefine`).
- Form: channel toggle (Emel / WhatsApp). Email field hidden + skipped when WhatsApp is chosen.
- Success page copy switches on channel ("Semak WhatsApp anda" vs "Semak e-mel anda").

### 3.5 SE gets a copy
- Email: `bcc: process.env.SE_NOTIFY_EMAIL ?? 'info@santunanemas.sg'` on `sendQrEmail` + `sendReminderEmail`.
- WhatsApp: after the registrant send, a second `messages.create` to `SE_WHATSAPP_NOTIFY_NUMBER` (plain templated text summary + card media). Twilio has no BCC.

### 3.6 WhatsApp send (Phase 2)
- `src/lib/whatsapp/client.ts` + `send-qr.ts` are done; feature-gated on `TWILIO_QR_TEMPLATE_SID`.
- Business-initiated + media ⇒ **Meta-approved image-header template required**. Send is
  `client.messages.create({ from, to, contentSid, contentVariables: { 1: cardUrl, 2: serial } })`.
- `scripts/whatsapp-template-setup.mjs` — creates the template + submits for approval + polls
  status. Run with `node --env-file="…/Muttaqin Chatbot/.env.local" scripts/whatsapp-template-setup.mjs <cmd>`.
- `scripts/…` also uploaded a sample card to `qr-codes/cards/_sample.png` (Meta validates the
  sample media URL at submission).

**Twilio state discovered (2026-09-04):**
- Account `the shared Twilio account` (shared with the chatbot).
- WhatsApp sender **`whatsapp:+6589913776`** — ONLINE, quality HIGH, profile "Masjid Al-Muttaqin SG",
  WABA `2136470433934641`. This is the production sender. (`+14155238886` is the unused sandbox.)
- **Zero approved templates ever on this WABA.** Three UTILITY image-header submissions
  (`santunan_emas_qr_card` v1–v3) were **instantly rejected** — v1 for the sample URL (fixed),
  v2/v3 "Unknown rejection reason" with clean transactional copy.
- Diagnosis: this is a **WABA-level block**, not a copy problem. Almost certainly **Meta Business
  verification is incomplete** for the business behind WABA `2136470433934641` (fits: chatbot works
  because it only sends session replies; templates need a verified business). `HXaac7685ed2f24136550bd6e0fa38d298`
  (v3, rejected) is left on the account so SE can open it in Twilio Console for Meta's detailed reason.

**SE / account owner must:**
1. Meta Business Manager (business.facebook.com) → Security Centre → complete **Business Verification**
   for the business owning WABA `2136470433934641`.
2. Then re-run `scripts/whatsapp-template-setup.mjs create` (bump `FRIENDLY_NAME` suffix — Meta burns
   rejected names), or build it in Twilio Console → Content Template Builder.
3. On `APPROVED`, set the env vars in §6.

**Fallback if verification stalls:** registration tells the WhatsApp-route user to send any message
to `+65 8991 3776` first; an inbound message opens a 24h window and SE (or an autoresponder) replies
with the card as a free-form media message — no template needed. Different UX (needs a user action).

### 3.7 Admin dashboard
- `GET /api/admin/participants` + `/[id]` selects → add `serial_code`, `qr_card_url`, `reg_channel`.
- Participants list: `SE0001` column (mono), search `q` also matches `serial_code`.
- Participant detail: show serial prominently + card thumbnail with download link; "Resend QR" respects `reg_channel`.
- Exports (`participants/export`, `attendance/export`): add `Code` column.

---

## 4. Migrations

- `0006_add_serial_code.sql` — sequence + column + trigger + backfill + setval.
- `0007_registration_channel.sql` — `reg_channel`, `email` nullable, `qr_card_url`, contact CHECK, drop `email_consent` NOT NULL default? (leave as-is).
- Regenerate `src/lib/supabase/types.ts`.
- Storage: `qr-codes` bucket already public; cards go in a `cards/` prefix (same bucket, no new policy).

## 5. Files touched

**Phase 1**
- `supabase/migrations/0006_*.sql`, `0007_*.sql`
- `src/lib/supabase/types.ts`
- `src/lib/validations/participant.ts` — channel + optional email
- `src/lib/utils/qr-card.ts` *(new)* — SVG→PNG card
- `src/assets/fonts/*` *(new)*
- `src/app/api/register/route.ts` — serial (from returned row), card, channel branch, bcc
- `src/lib/email/send-qr.ts`, `src/emails/QrEmail.tsx` — bcc, serial, card image
- `src/lib/email/send-reminder.ts` — bcc
- `src/components/public/RegistrationForm.tsx` — channel toggle
- `src/app/(public)/register/success/page.tsx` — channel-aware copy
- `src/app/api/admin/participants/route.ts` + `[id]/route.ts` — select serial/card/channel, search
- `src/app/admin/(protected)/participants/page.tsx` + `[id]/page.tsx` — display
- `src/app/api/admin/participants/[id]/resend-qr/route.ts` — channel-aware
- `src/app/api/admin/participants/export/route.ts`, `attendance/export/route.ts` — Code column
- `.env.example` — `SE_NOTIFY_EMAIL`
- tests: register route, qr-card, validation

**Phase 2**
- `src/lib/whatsapp/twilio.ts` *(new)*
- `src/lib/whatsapp/send-qr.ts` *(new)* — registrant + SE copy
- `src/app/api/register/route.ts` — wire WhatsApp branch
- `src/app/api/admin/participants/[id]/resend-qr/route.ts` — WhatsApp resend
- retrieve-qr by phone (WhatsApp OTP) — `src/app/api/retrieve-qr/*`, form
- `.env.example` — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, `TWILIO_QR_TEMPLATE_SID`, `SE_WHATSAPP_NOTIFY_NUMBER`

## 6. Open items for the client / Owen

1. **Meta Business Verification** for WABA `2136470433934641` (see §3.6) — the blocker for the
   WhatsApp template. Then run `scripts/whatsapp-template-setup.mjs create` and share the `HX` Content SID.
2. Confirm the **SE notification numbers/inbox**: `SE_NOTIFY_EMAIL` (default `info@santunanemas.sg`),
   `SE_WHATSAPP_NOTIFY_NUMBER` (a WhatsApp number SE staff watch — can't be the sender `+6589913776` itself).
3. Twilio env into the **santunan-emas** Vercel project (currently only on the chatbot project):
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER=whatsapp:+6589913776`,
   `TWILIO_QR_TEMPLATE_SID=HX…`, `SE_WHATSAPP_NOTIFY_NUMBER=+65…`, `NEXT_PUBLIC_WHATSAPP_ENABLED=true`.
4. Existing participants: keep their UUID QR; they get a `serial_code` on backfill but **no re-send** unless requested.
5. Apply migrations `0006`/`0007` to the **production** Supabase project (`bquhcqvjpadrfeurfmfl` per Executor) via CI `supabase db push` or Owen — it is not on the connected Supabase MCP. Reconcile the stale `hqiwdihnihdfjgbjpbqr` comment in `0001` and the `pbeizncjbyyppwtecrau` ref in `.env.local`.

## 7. Verification

- `pnpm test` (vitest) + `pnpm test:e2e` (Playwright) green.
- `pnpm build` clean.
- Manual: register via email → receive card + serial, SE bcc'd; admin shows both; scan still works off `qr_image_url`.
- Phase 2: Twilio test number end-to-end once template approved.
