-- supabase/migrations/0004_add_participant_gender.sql
ALTER TABLE public.participants
  ADD COLUMN gender TEXT NOT NULL DEFAULT 'unspecified'
    CHECK (gender IN ('male','female','unspecified'));
