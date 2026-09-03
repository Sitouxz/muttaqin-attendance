-- Santunan Emas QR Attendance App — Initial Schema
-- Applied: 2026-03-25
-- Project: pbeizncjbyyppwtecrau (Muttaqin Attendance, ap-southeast-1)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- admins
CREATE TABLE public.admins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  role         TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('super_admin','operator')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- programmes
CREATE TABLE public.programmes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  colour      TEXT NOT NULL DEFAULT '#3B82F6',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- participants
CREATE TABLE public.participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT NOT NULL,
  age           INTEGER NOT NULL CHECK (age BETWEEN 1 AND 120),
  postal_code   TEXT NOT NULL,
  qr_token      UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  qr_image_url  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  email_consent BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sessions
CREATE TABLE public.sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE NOT NULL,
  title        TEXT,
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','active','completed','cancelled')),
  start_time   TIME,
  end_time     TIME,
  notes        TEXT,
  created_by   UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- session_programmes (junction)
CREATE TABLE public.session_programmes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
  UNIQUE (session_id, programme_id)
);

-- attendance
CREATE TABLE public.attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL REFERENCES public.participants(id) ON DELETE RESTRICT,
  session_id      UUID NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  programme_id    UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_in_method TEXT NOT NULL DEFAULT 'qr_scan'
                    CHECK (check_in_method IN ('qr_scan','manual','walk_in')),
  checked_in_by   UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  is_synced       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  UNIQUE (participant_id, session_id, programme_id)
);

-- otp_requests (used for QR retrieval OTP flow — not in original spec, added by plan)
CREATE TABLE public.otp_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  otp_hash   TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_participants_email       ON public.participants(email);
CREATE INDEX idx_participants_qr_token    ON public.participants(qr_token) WHERE is_active = true;
CREATE INDEX idx_participants_phone       ON public.participants(phone);
CREATE INDEX idx_participants_name_search ON public.participants USING GIN (to_tsvector('simple', full_name));
CREATE INDEX idx_sessions_status         ON public.sessions(status) WHERE status = 'active';
CREATE INDEX idx_sessions_date           ON public.sessions(session_date);
CREATE INDEX idx_attendance_session      ON public.attendance(session_id);
CREATE INDEX idx_attendance_participant  ON public.attendance(participant_id);
CREATE INDEX idx_attendance_checked_in   ON public.attendance(checked_in_at);
CREATE INDEX idx_attendance_session_prog ON public.attendance(session_id, programme_id);
CREATE INDEX idx_otp_requests_email      ON public.otp_requests(email);
CREATE INDEX idx_otp_requests_expires    ON public.otp_requests(expires_at);
