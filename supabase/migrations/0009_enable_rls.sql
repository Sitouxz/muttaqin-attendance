-- Lock the public schema down to the service role.
--
-- Until now no table carried row level security, so the anon key — which ships
-- in the browser bundle of every page — could read and write every table
-- directly through PostgREST, app routes or not. That made the participant
-- roster (names, phones, qr_token) world-readable, and qr_token is the
-- check-in credential.
--
-- The app does not need anon table access: every route now reads and writes
-- with the service role, which bypasses RLS. Enabling RLS with no anon policy
-- therefore denies the anon key everything and changes nothing the app does.
--
-- The one exception is the admin dashboard's live attendance counter, which
-- subscribes to attendance INSERTs over Supabase Realtime from the browser as
-- a signed-in user. Realtime honours RLS, so authenticated admins keep SELECT
-- on attendance.
--
-- RUN THIS FIRST, BEFORE DEPLOYING THE MATCHING CODE. Admin access now requires
-- an active public.admins row whose auth_user_id matches the signed-in user.
-- Any auth user without one loses access (that is the point — an invite used to
-- create an auth.users row and nothing else, which granted full admin). Confirm
-- the real admins are provisioned before shipping:
--
--   SELECT u.id, u.email, a.id AS admin_id, a.role, a.is_active
--   FROM auth.users u
--   LEFT JOIN public.admins a ON a.auth_user_id = u.id
--   ORDER BY u.created_at;
--
-- Every person who must keep access needs a non-null admin_id with
-- is_active = true. To repair one:
--
--   INSERT INTO public.admins (auth_user_id, email, full_name, role)
--   VALUES ('<auth.users.id>', '<email>', '<name>', 'super_admin')
--   ON CONFLICT (email) DO UPDATE
--     SET auth_user_id = EXCLUDED.auth_user_id, is_active = true;
--
-- Rollback (restores the previous, open behaviour):
--   ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;  -- per table
--   DROP POLICY IF EXISTS attendance_select_active_admins ON public.attendance;
--   DROP FUNCTION IF EXISTS public.is_active_admin();

ALTER TABLE public.admins             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_agenda     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_requests       ENABLE ROW LEVEL SECURITY;

-- Is the caller a signed-in, still-active admin?
--
-- SECURITY DEFINER because a policy that selected from public.admins directly
-- would itself be filtered by that table's RLS, and deny every time.
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    WHERE a.auth_user_id = (SELECT auth.uid())
      AND a.is_active
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;

-- Realtime: the live attendance counter on the session detail page.
CREATE POLICY attendance_select_active_admins
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

-- Every other table has no policy on purpose: anon and authenticated get
-- nothing, and all application access goes through the service role.
