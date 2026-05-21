-- ============================================================
-- IIT Delhi Weightlifting — Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com → project → SQL Editor)
-- ============================================================

-- 1. WORKOUT PLANS
CREATE TABLE IF NOT EXISTS workout_plans (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  date             DATE        NOT NULL,
  title            TEXT        NOT NULL,
  description      TEXT        DEFAULT '',
  exercises        JSONB       DEFAULT '[]'::JSONB,
  created_by       TEXT        NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  attendance_status TEXT       DEFAULT 'not_started'
    CHECK (attendance_status IN (
      'not_started', 'checkin_open', 'checkin_done', 'checkout_open', 'done'
    ))
);

-- 2. ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id        UUID        NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  user_id        TEXT        NOT NULL,
  user_name      TEXT        NOT NULL,
  user_initials  TEXT        NOT NULL,
  phase          TEXT        NOT NULL CHECK (phase IN ('checkin', 'checkout')),
  marked_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, user_id, phase)
);

-- 3. TEAM MEMBERS  (populated manually / by admin — maps kerberos_id → role)
CREATE TABLE IF NOT EXISTS team_members (
  id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  kerberos_id               TEXT        UNIQUE NOT NULL,
  name                      TEXT        NOT NULL,
  initials                  TEXT,
  role                      TEXT        NOT NULL DEFAULT 'athlete'
                              CHECK (role IN ('coach', 'captain', 'athlete')),
  weight_class              TEXT,
  year                      TEXT,
  body_weight               NUMERIC,
  body_weight_updated_at    TIMESTAMPTZ,
  snatch_pr                 NUMERIC,
  snatch_pr_updated_at      TIMESTAMPTZ,
  cj_pr                     NUMERIC,
  cj_pr_updated_at          TIMESTAMPTZ,
  front_squat_pr            NUMERIC,
  front_squat_pr_updated_at  TIMESTAMPTZ,
  back_squat_pr             NUMERIC,
  back_squat_pr_updated_at   TIMESTAMPTZ,
  deadlift_pr               NUMERIC,
  deadlift_pr_updated_at     TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_workout_plans_date   ON workout_plans(date);
CREATE INDEX IF NOT EXISTS idx_attendance_plan_id   ON attendance(plan_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id   ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_kerb    ON team_members(kerberos_id);

-- 5. DISABLE RLS (we use our own auth check via Express, not Supabase Auth)
ALTER TABLE workout_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance    DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members  DISABLE ROW LEVEL SECURITY;

-- 7. JOIN REQUESTS
CREATE TABLE IF NOT EXISTS join_requests (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  kerberos_id  TEXT        UNIQUE NOT NULL,
  name         TEXT        NOT NULL,
  year         TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);
ALTER TABLE join_requests DISABLE ROW LEVEL SECURITY;

-- 8. PR CHANGE REQUESTS
CREATE TABLE IF NOT EXISTS pr_change_requests (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  kerberos_id       TEXT        NOT NULL,
  athlete_name      TEXT        NOT NULL,
  requested_changes JSONB       NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pr_requests_kerberos ON pr_change_requests(kerberos_id);
CREATE INDEX IF NOT EXISTS idx_pr_requests_status   ON pr_change_requests(status);
ALTER TABLE pr_change_requests DISABLE ROW LEVEL SECURITY;

-- 6. ENABLE REALTIME (errors silently if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE workout_plans;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SEED DATA — add your team members here
-- Replace kerberos_id with actual IITD Kerberos IDs
-- ============================================================

-- INSERT INTO team_members (kerberos_id, name, initials, role, weight_class, year) VALUES
--   ('coach_kerberos', 'Coach R. Verma', 'RV', 'coach',   NULL,   NULL),
--   ('arjun_kerberos', 'Arjun Singh',    'AS', 'captain', '73kg', '4th Year'),
--   ('rahul_kerberos', 'Rahul Kumar',    'RK', 'athlete', '89kg', '3rd Year'),
--   ('priya_kerberos', 'Priya Sharma',   'PS', 'athlete', '59kg', '2nd Year');

-- ============================================================
-- MIGRATION: Run this if your team_members table already exists
-- ============================================================
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS body_weight NUMERIC;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS body_weight_updated_at TIMESTAMPTZ;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS snatch_pr_updated_at TIMESTAMPTZ;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS cj_pr_updated_at TIMESTAMPTZ;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS front_squat_pr NUMERIC;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS front_squat_pr_updated_at TIMESTAMPTZ;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS back_squat_pr NUMERIC;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS back_squat_pr_updated_at TIMESTAMPTZ;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS deadlift_pr NUMERIC;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS deadlift_pr_updated_at TIMESTAMPTZ;

-- 9. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title          TEXT        NOT NULL,
  message        TEXT        NOT NULL,
  posted_by_name TEXT        NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
