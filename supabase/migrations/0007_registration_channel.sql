-- supabase/migrations/0007_registration_channel.sql
-- Two registration routes (email / WhatsApp) and a branded QR card image.

ALTER TABLE public.participants
  ADD COLUMN reg_channel TEXT NOT NULL DEFAULT 'email'
    CHECK (reg_channel IN ('email', 'whatsapp')),
  ADD COLUMN qr_card_url TEXT;

-- Email is no longer mandatory: WhatsApp-route registrants may not have one.
ALTER TABLE public.participants
  ALTER COLUMN email DROP NOT NULL;

-- Every participant must still be reachable on at least one channel.
ALTER TABLE public.participants
  ADD CONSTRAINT participants_contact_present
    CHECK (email IS NOT NULL OR phone IS NOT NULL);
