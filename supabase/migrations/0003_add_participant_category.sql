-- supabase/migrations/0003_add_participant_category.sql
ALTER TABLE public.participants
  ADD COLUMN participant_category TEXT NOT NULL DEFAULT 'selain'
    CHECK (participant_category IN ('warga_emas','penjaga','kedua_dua','selain'));
