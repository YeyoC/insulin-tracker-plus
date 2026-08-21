CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  wake_time text,
  target numeric,
  range_min numeric,
  range_max numeric,
  icr numeric,
  isf numeric,
  hydration_goal numeric,
  emergency_contact jsonb,
  inventory jsonb,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.glucose_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  value numeric NOT NULL,
  moment text NOT NULL,
  notes text,
  occurred_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glucose_entries TO authenticated;
GRANT ALL ON public.glucose_entries TO service_role;
ALTER TABLE public.glucose_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own glucose" ON public.glucose_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX glucose_entries_user_idx ON public.glucose_entries (user_id, occurred_at DESC);

CREATE TABLE public.insulin_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type text NOT NULL,
  units numeric NOT NULL,
  site text,
  notes text,
  recommended numeric,
  diff_reason text,
  occurred_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insulin_entries TO authenticated;
GRANT ALL ON public.insulin_entries TO service_role;
ALTER TABLE public.insulin_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insulin" ON public.insulin_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX insulin_entries_user_idx ON public.insulin_entries (user_id, occurred_at DESC);

CREATE TABLE public.meal_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  foods jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  occurred_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_entries TO authenticated;
GRANT ALL ON public.meal_entries TO service_role;
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meals" ON public.meal_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX meal_entries_user_idx ON public.meal_entries (user_id, occurred_at DESC);

CREATE TABLE public.exercise_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type text NOT NULL,
  duration_min numeric NOT NULL DEFAULT 0,
  intensity text,
  context text,
  notes text,
  occurred_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_entries TO authenticated;
GRANT ALL ON public.exercise_entries TO service_role;
ALTER TABLE public.exercise_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercise" ON public.exercise_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX exercise_entries_user_idx ON public.exercise_entries (user_id, occurred_at DESC);

CREATE TABLE public.alerts (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  key text NOT NULL,
  level text NOT NULL,
  message_key text NOT NULL,
  message_params jsonb,
  fired_at timestamptz NOT NULL,
  response text,
  responded_at timestamptz,
  resent boolean,
  resent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts" ON public.alerts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX alerts_user_idx ON public.alerts (user_id, fired_at DESC);