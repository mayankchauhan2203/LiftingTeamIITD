-- ============================================================
-- IIT Delhi Weightlifting — Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com → project → SQL Editor)
-- ============================================================

-- 1. WORKOUT PLANS
CREATE TABLE workout_plans (
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
CREATE TABLE attendance (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id        UUID        NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  user_id        TEXT        NOT NULL,
  user_name      TEXT        NOT NULL,
  user_initials  TEXT        NOT NULL,
  phase          TEXT        NOT NULL CHECK (phase IN ('checkin', 'checkout')),
  marked_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, user_id, phase)   -- prevents duplicate attendance
);

-- 3. INDEXES
CREATE INDEX idx_workout_plans_date   ON workout_plans(date);
CREATE INDEX idx_attendance_plan_id   ON attendance(plan_id);
CREATE INDEX idx_attendance_user_id   ON attendance(user_id);

-- 4. DISABLE RLS (we use our own auth system, not Supabase Auth)
ALTER TABLE workout_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance    DISABLE ROW LEVEL SECURITY;

-- 5. ENABLE REALTIME (so clients get live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE workout_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
