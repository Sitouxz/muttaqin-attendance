-- supabase/migrations/0008_wa_qr_pending.sql
-- WhatsApp inbound-first delivery: business-initiated WhatsApp is blocked until
-- Meta business verification, so a WhatsApp-route registrant is marked pending
-- and their QR card is delivered when they first message the SE number (which
-- opens a 24h free-form window). The chatbot webhook clears this flag.

ALTER TABLE public.participants
  ADD COLUMN wa_qr_pending BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_participants_wa_qr_pending
  ON public.participants(phone)
  WHERE wa_qr_pending = true;
