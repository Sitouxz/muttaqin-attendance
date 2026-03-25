-- =============================================================
-- COMPREHENSIVE SEED — covers every test flow
-- Run: supabase db reset  OR  paste into Supabase SQL editor
-- Today's date is resolved dynamically so data is always fresh
-- =============================================================

-- ---------------------------------------------------------------
-- CLEAR existing data (FK-safe order)
-- ---------------------------------------------------------------
DELETE FROM public.attendance;
DELETE FROM public.session_programmes;
DELETE FROM public.sessions;
DELETE FROM public.participants;
DELETE FROM public.programmes;

-- ---------------------------------------------------------------
-- 1. PROGRAMMES  (3 active programmes)
-- ---------------------------------------------------------------
INSERT INTO public.programmes (id, name, description, colour, is_default, is_active, sort_order)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'Kuliah',   'Ceramah agama mingguan',        '#3B82F6', true,  true, 1),
  ('11111111-0000-0000-0000-000000000002', 'Jahit',    'Program jahitan & kraftangan',  '#10B981', false, true, 2),
  ('11111111-0000-0000-0000-000000000003', 'Senaman',  'Aktiviti fizikal & kesihatan',  '#F59E0B', false, true, 3);

-- ---------------------------------------------------------------
-- 2. PARTICIPANTS  (20 participants — realistic Singapore data)
--    qr_token = '33333333-0000-0000-0000-{n:012}' for easy testing
-- ---------------------------------------------------------------
INSERT INTO public.participants
  (id, full_name, email, phone, age, postal_code, qr_token, is_active, email_consent)
VALUES
  ('22222222-0000-0000-0000-000000000001','Ahmad Bin Hassan',        'ahmad.hassan@email.com',    '81234567', 45, '560123', '33333333-0000-0000-0000-000000000001', true, true),
  ('22222222-0000-0000-0000-000000000002','Siti Noor Binte Ismail',  'siti.noor@email.com',       '91234568', 38, '730456', '33333333-0000-0000-0000-000000000002', true, true),
  ('22222222-0000-0000-0000-000000000003','Mohamed Rizal Bin Othman','m.rizal@email.com',         '82345678', 52, '410789', '33333333-0000-0000-0000-000000000003', true, true),
  ('22222222-0000-0000-0000-000000000004','Noraini Binte Abd Rahman', 'noraini.ar@email.com',     '93456789', 41, '650234', '33333333-0000-0000-0000-000000000004', true, true),
  ('22222222-0000-0000-0000-000000000005','Khairul Anuar Bin Zakaria','k.anuar@email.com',        '84567890', 33, '520567', '33333333-0000-0000-0000-000000000005', true, true),
  ('22222222-0000-0000-0000-000000000006','Fatimah Binte Yusof',     'fatimah.y@email.com',      '95678901', 60, '820890', '33333333-0000-0000-0000-000000000006', true, true),
  ('22222222-0000-0000-0000-000000000007','Zulkifli Bin Ramli',      'zulkifli.r@email.com',     '86789012', 47, '180123', '33333333-0000-0000-0000-000000000007', true, true),
  ('22222222-0000-0000-0000-000000000008','Hasnah Binte Hamid',      'hasnah.h@email.com',       '97890123', 55, '310456', '33333333-0000-0000-0000-000000000008', true, true),
  ('22222222-0000-0000-0000-000000000009','Roslan Bin Idris',        'roslan.i@email.com',       '88901234', 39, '470789', '33333333-0000-0000-0000-000000000009', true, true),
  ('22222222-0000-0000-0000-000000000010','Noor Aishah Binte Musa',  'n.aishah@email.com',       '99012345', 44, '640012', '33333333-0000-0000-0000-000000000010', true, true),
  ('22222222-0000-0000-0000-000000000011','Hafiz Bin Kamaruddin',    'hafiz.k@email.com',        '81122334', 28, '530345', '33333333-0000-0000-0000-000000000011', true, true),
  ('22222222-0000-0000-0000-000000000012','Salbiah Binte Daud',      'salbiah.d@email.com',      '92233445', 62, '720678', '33333333-0000-0000-0000-000000000012', true, true),
  ('22222222-0000-0000-0000-000000000013','Azri Bin Samsudin',       'azri.s@email.com',         '83344556', 31, '390901', '33333333-0000-0000-0000-000000000013', true, true),
  ('22222222-0000-0000-0000-000000000014','Ramlah Binte Wahab',      'ramlah.w@email.com',       '94455667', 57, '610234', '33333333-0000-0000-0000-000000000014', true, true),
  ('22222222-0000-0000-0000-000000000015','Faizal Bin Nordin',       'faizal.n@email.com',       '85566778', 36, '560567', '33333333-0000-0000-0000-000000000015', true, true),
  ('22222222-0000-0000-0000-000000000016','Zuraidah Binte Ghazali',  'zuraidah.g@email.com',     '96677889', 49, '780890', '33333333-0000-0000-0000-000000000016', true, true),
  ('22222222-0000-0000-0000-000000000017','Rahim Bin Taib',          'rahim.t@email.com',        '87788990', 53, '430123', '33333333-0000-0000-0000-000000000017', true, true),
  ('22222222-0000-0000-0000-000000000018','Maisarah Binte Sulaiman', 'maisarah.s@email.com',     '98899001', 27, '270456', '33333333-0000-0000-0000-000000000018', true, true),
  ('22222222-0000-0000-0000-000000000019','Haikal Bin Osman',        'haikal.o@email.com',       '89900112', 34, '590789', '33333333-0000-0000-0000-000000000019', true, true),
  ('22222222-0000-0000-0000-000000000020','Asiah Binte Majid',       'asiah.m@email.com',        '90011223', 66, '360012', '33333333-0000-0000-0000-000000000020', true, true);

-- ---------------------------------------------------------------
-- 3. SESSIONS + SESSION_PROGRAMMES + ATTENDANCE
--    Generated via PL/pgSQL for 30 rolling days
-- ---------------------------------------------------------------
DO $$
DECLARE
  -- Programme IDs
  prog_kuliah UUID := '11111111-0000-0000-0000-000000000001';
  prog_jahit  UUID := '11111111-0000-0000-0000-000000000002';
  prog_senam  UUID := '11111111-0000-0000-0000-000000000003';

  -- All 20 participant IDs as array (index 1..20)
  pids UUID[] := ARRAY[
    '22222222-0000-0000-0000-000000000001'::UUID,
    '22222222-0000-0000-0000-000000000002'::UUID,
    '22222222-0000-0000-0000-000000000003'::UUID,
    '22222222-0000-0000-0000-000000000004'::UUID,
    '22222222-0000-0000-0000-000000000005'::UUID,
    '22222222-0000-0000-0000-000000000006'::UUID,
    '22222222-0000-0000-0000-000000000007'::UUID,
    '22222222-0000-0000-0000-000000000008'::UUID,
    '22222222-0000-0000-0000-000000000009'::UUID,
    '22222222-0000-0000-0000-000000000010'::UUID,
    '22222222-0000-0000-0000-000000000011'::UUID,
    '22222222-0000-0000-0000-000000000012'::UUID,
    '22222222-0000-0000-0000-000000000013'::UUID,
    '22222222-0000-0000-0000-000000000014'::UUID,
    '22222222-0000-0000-0000-000000000015'::UUID,
    '22222222-0000-0000-0000-000000000016'::UUID,
    '22222222-0000-0000-0000-000000000017'::UUID,
    '22222222-0000-0000-0000-000000000018'::UUID,
    '22222222-0000-0000-0000-000000000019'::UUID,
    '22222222-0000-0000-0000-000000000020'::UUID
  ];

  sid       UUID;
  d         DATE;
  dow       INTEGER;  -- 0=Sun, 1=Mon … 6=Sat
  prog_id   UUID;
  n_attend  INTEGER;
  offset_i  INTEGER;
  p_idx     INTEGER;
  checkin_ts TIMESTAMPTZ;
  day_offset INTEGER;

BEGIN
  -- ---- PAST 30 DAYS ---- --
  FOR day_offset IN REVERSE 30..1 LOOP
    d   := CURRENT_DATE - day_offset;
    dow := EXTRACT(DOW FROM d)::INTEGER;  -- 0=Sun, 6=Sat

    -- Skip Sundays; Saturday = Senaman only; others use day pattern
    IF dow = 0 THEN CONTINUE; END IF;

    -- Pick programme based on day of week
    IF dow = 6 THEN
      prog_id  := prog_senam;
      n_attend := 5 + (day_offset % 4);   -- 5..8
    ELSIF dow IN (1, 3, 5) THEN            -- Mon, Wed, Fri → Kuliah
      prog_id  := prog_kuliah;
      n_attend := 9 + (day_offset % 5);   -- 9..13
    ELSE                                   -- Tue, Thu → Jahit
      prog_id  := prog_jahit;
      n_attend := 6 + (day_offset % 4);   -- 6..9
    END IF;

    -- Create completed session
    sid := gen_random_uuid();
    INSERT INTO public.sessions (id, session_date, title, status, start_time, end_time)
    VALUES (
      sid,
      d,
      CASE prog_id
        WHEN prog_kuliah THEN 'Kuliah — ' || TO_CHAR(d, 'DD Mon YYYY')
        WHEN prog_jahit  THEN 'Kelas Jahit — ' || TO_CHAR(d, 'DD Mon YYYY')
        ELSE                  'Senaman — ' || TO_CHAR(d, 'DD Mon YYYY')
      END,
      'completed',
      '09:00', '11:00'
    );

    INSERT INTO public.session_programmes (session_id, programme_id)
    VALUES (sid, prog_id);

    -- Attendance: n_attend participants, staggered check-in times
    offset_i := day_offset % 20;  -- deterministic rotation through participants
    FOR i IN 0..(n_attend - 1) LOOP
      p_idx      := ((offset_i + i) % 20) + 1;
      checkin_ts := (d::TEXT || ' 09:' || LPAD(((i * 4) % 60)::TEXT, 2, '0') || ':00+08')::TIMESTAMPTZ;

      INSERT INTO public.attendance
        (participant_id, session_id, programme_id, checked_in_at, check_in_method)
      VALUES
        (pids[p_idx], sid, prog_id, checkin_ts, 'qr_scan')
      ON CONFLICT DO NOTHING;
    END LOOP;

  END LOOP;  -- end past 30 days


  -- ---- TODAY — ACTIVE SESSION (all 3 programmes) ---- --
  sid := 'aaaaaaaa-0000-0000-0000-000000000001'::UUID;
  INSERT INTO public.sessions (id, session_date, title, status, start_time, end_time, notes)
  VALUES (
    sid,
    CURRENT_DATE,
    'Sesi Hari Ini — ' || TO_CHAR(CURRENT_DATE, 'DD Mon YYYY'),
    'active',
    '08:30', '12:00',
    'Sesi aktif — gunakan untuk menguji imbasan QR'
  );

  INSERT INTO public.session_programmes (session_id, programme_id) VALUES (sid, prog_kuliah);
  INSERT INTO public.session_programmes (session_id, programme_id) VALUES (sid, prog_jahit);
  INSERT INTO public.session_programmes (session_id, programme_id) VALUES (sid, prog_senam);

  -- Pre-seed 3 attendances today so dashboard "Kehadiran Hari Ini" > 0
  INSERT INTO public.attendance (participant_id, session_id, programme_id, checked_in_at, check_in_method)
  VALUES
    (pids[1], sid, prog_kuliah, (CURRENT_DATE::TEXT || ' 08:35:00+08')::TIMESTAMPTZ, 'qr_scan'),
    (pids[2], sid, prog_jahit,  (CURRENT_DATE::TEXT || ' 08:42:00+08')::TIMESTAMPTZ, 'manual'),
    (pids[3], sid, prog_senam,  (CURRENT_DATE::TEXT || ' 08:50:00+08')::TIMESTAMPTZ, 'qr_scan')
  ON CONFLICT DO NOTHING;


  -- ---- FUTURE SESSIONS (scheduled) ---- --
  -- Tomorrow
  INSERT INTO public.sessions (id, session_date, title, status, start_time, end_time)
  VALUES (
    gen_random_uuid(),
    CURRENT_DATE + 1,
    'Kuliah — ' || TO_CHAR(CURRENT_DATE + 1, 'DD Mon YYYY'),
    'draft', '09:00', '11:00'
  )
  RETURNING id INTO sid;
  INSERT INTO public.session_programmes (session_id, programme_id) VALUES (sid, prog_kuliah);

  -- 3 days from now
  INSERT INTO public.sessions (id, session_date, title, status, start_time, end_time)
  VALUES (
    gen_random_uuid(),
    CURRENT_DATE + 3,
    'Kelas Jahit — ' || TO_CHAR(CURRENT_DATE + 3, 'DD Mon YYYY'),
    'draft', '10:00', '12:00'
  )
  RETURNING id INTO sid;
  INSERT INTO public.session_programmes (session_id, programme_id) VALUES (sid, prog_jahit);

  -- 7 days from now
  INSERT INTO public.sessions (id, session_date, title, status, start_time, end_time)
  VALUES (
    gen_random_uuid(),
    CURRENT_DATE + 7,
    'Senaman — ' || TO_CHAR(CURRENT_DATE + 7, 'DD Mon YYYY'),
    'draft', '08:00', '10:00'
  )
  RETURNING id INTO sid;
  INSERT INTO public.session_programmes (session_id, programme_id) VALUES (sid, prog_senam);

END $$;
