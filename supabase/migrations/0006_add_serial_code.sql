-- supabase/migrations/0006_add_serial_code.sql
-- Human-readable registration code tied to every participant: SE0001, SE0002, ...
-- Pure sequence per client request (no year scoping). 4-digit zero pad; rolls
-- over to 5 digits naturally at SE10000.

CREATE SEQUENCE IF NOT EXISTS public.participants_serial_seq;

ALTER TABLE public.participants
  ADD COLUMN serial_code TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.assign_participant_serial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.serial_code IS NULL THEN
    NEW.serial_code := 'SE' || lpad(nextval('public.participants_serial_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_participant_serial
  BEFORE INSERT ON public.participants
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_participant_serial();

-- Backfill existing participants in registration order.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.participants
    WHERE serial_code IS NULL
    ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE public.participants
      SET serial_code = 'SE' || lpad(nextval('public.participants_serial_seq')::text, 4, '0')
      WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.participants
  ALTER COLUMN serial_code SET NOT NULL;
