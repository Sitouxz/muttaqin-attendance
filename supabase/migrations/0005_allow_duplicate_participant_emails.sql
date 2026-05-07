-- Allow multiple participants to register with the same email address.
-- A non-unique idx_participants_email index already exists for lookups.
ALTER TABLE public.participants
  DROP CONSTRAINT IF EXISTS participants_email_key;

DROP INDEX IF EXISTS public.participants_email_key;
