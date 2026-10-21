-- ====================================================================
-- LABSHIFT PERSONAL — RSUD SULTAN SYARIF MOHAMAD ALKADRIE PONTIANAK
-- Supabase Schema & Initial Migrations
-- ====================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  job_title TEXT DEFAULT 'Ahli Teknologi Laboratorium Medik (ATLM)',
  work_unit TEXT DEFAULT 'Instalasi Laboratorium Patologi Klinik RSUD Sultan Syarif Mohamad Alkadrie',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SHIFT TYPES (Reference data: Exactly 6 official colors)
CREATE TABLE IF NOT EXISTS public.shift_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SHIFT TASKS (Template task items for each shift type)
CREATE TABLE IF NOT EXISTS public.shift_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_type_id UUID NOT NULL REFERENCES public.shift_types(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COWORKERS (Personal contacts entered by the ATLM)
CREATE TABLE IF NOT EXISTS public.coworkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SHIFTS
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_type_id UUID NOT NULL REFERENCES public.shift_types(id),
  start_time TIME,
  end_time TIME,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'changed', 'cancelled')),
  original_shift_type_id UUID REFERENCES public.shift_types(id),
  is_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SHIFT COWORKERS (Junction table)
CREATE TABLE IF NOT EXISTS public.shift_coworkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  coworker_id UUID NOT NULL REFERENCES public.coworkers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shift_id, coworker_id)
);

-- 7. SHIFT TASK CHECKS (Shift-specific checklist progress)
CREATE TABLE IF NOT EXISTS public.shift_task_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SHIFT CHANGE LOGS (Append-only audit trail of schedule changes)
CREATE TABLE IF NOT EXISTS public.shift_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL,
  old_shift_date DATE,
  new_shift_date DATE,
  old_shift_type_id UUID REFERENCES public.shift_types(id),
  new_shift_type_id UUID REFERENCES public.shift_types(id),
  old_start_time TIME,
  new_start_time TIME,
  old_end_time TIME,
  new_end_time TIME,
  reason TEXT,
  source TEXT DEFAULT 'manual',
  source_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PERSONAL NOTES
CREATE TABLE IF NOT EXISTS public.personal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  note_date DATE,
  title TEXT NOT NULL,
  content TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. REMINDER SETTINGS
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  day_before_enabled BOOLEAN DEFAULT TRUE,
  day_before_time TIME DEFAULT '20:00',
  minutes_before_shift INTEGER DEFAULT 60,
  browser_notifications_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_shifts_user_date ON public.shifts(user_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_coworkers_user_name ON public.coworkers(user_id, name);
CREATE INDEX IF NOT EXISTS idx_change_logs_user_created ON public.shift_change_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_date ON public.personal_notes(user_id, note_date);
CREATE INDEX IF NOT EXISTS idx_shift_task_checks_shift ON public.shift_task_checks(shift_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coworkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_coworkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_task_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

-- Reference Tables: Anyone authenticated can read shift types and tasks, but cannot modify
CREATE POLICY "Allow authenticated read shift_types"
  ON public.shift_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read shift_tasks"
  ON public.shift_tasks FOR SELECT
  TO authenticated
  USING (true);

-- User-owned tables: strictly user_id = auth.uid()
CREATE POLICY "Users can manage own profile"
  ON public.profiles FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can manage own coworkers"
  ON public.coworkers FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own shifts"
  ON public.shifts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own shift_coworkers"
  ON public.shift_coworkers FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.shifts WHERE id = shift_coworkers.shift_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shifts WHERE id = shift_coworkers.shift_id AND user_id = auth.uid())
    AND
    EXISTS (SELECT 1 FROM public.coworkers WHERE id = shift_coworkers.coworker_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can manage own shift_task_checks"
  ON public.shift_task_checks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read and insert own shift_change_logs"
  ON public.shift_change_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own shift_change_logs"
  ON public.shift_change_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own personal_notes"
  ON public.personal_notes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own reminder_settings"
  ON public.reminder_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ====================================================================
-- SEED DATA: 6 OFFICIAL SHIFT PROFILES & PROCEDURES
-- ====================================================================

DO $$
DECLARE
  v_kuning_id UUID := '11111111-1111-1111-1111-111111111111';
  v_biru_id UUID   := '22222222-2222-2222-2222-222222222222';
  v_ungu_id UUID   := '33333333-3333-3333-3333-333333333333';
  v_abu_id UUID    := '44444444-4444-4444-4444-444444444444';
  v_hijau_id UUID  := '55555555-5555-5555-5555-555555555555';
  v_pink_id UUID   := '66666666-6666-6666-6666-666666666666';
BEGIN
  -- Insert Shift Types
  INSERT INTO public.shift_types (id, code, name, color_hex, description, sort_order)
  VALUES
    (v_kuning_id, 'KUNING', 'Kuning', '#FACC15', 'Laboratorium Urinalisis, Feses & Mikroskopik Khusus', 1),
    (v_biru_id, 'BIRU', 'Biru', '#3B82F6', 'Kimia Klinik, Serologi, Elektrolit & Hormon', 2),
    (v_ungu_id, 'UNGU', 'Ungu', '#8B5CF6', 'Hematologi, Imunoserologi Khusus & Sediaan Darah', 3),
    (v_abu_id, 'ABU_ABU', 'Abu-Abu', '#9CA3AF', 'Operator LIS, Validasi & Pelaporan Nilai Kritis', 4),
    (v_hijau_id, 'HIJAU', 'Hijau', '#22C55E', 'Laboratorium TB / Mikrobiologi Molekuler (TCM, BTA, PCR)', 5),
    (v_pink_id, 'PINK', 'Pink', '#EC4899', 'Merangkap Petugas BDRS (Bank Darah Rumah Sakit)', 6)
  ON CONFLICT (code) DO NOTHING;

  -- Insert Tasks for KUNING
  INSERT INTO public.shift_tasks (shift_type_id, task_name, sort_order) VALUES
    (v_kuning_id, 'Urine', 1),
    (v_kuning_id, 'Feses', 2),
    (v_kuning_id, 'Sekret', 3),
    (v_kuning_id, 'Mikroskopik', 4),
    (v_kuning_id, 'Malaria', 5),
    (v_kuning_id, 'Diff', 6),
    (v_kuning_id, 'BTA', 7)
  ON CONFLICT DO NOTHING;

  -- Insert Tasks for BIRU
  INSERT INTO public.shift_tasks (shift_type_id, task_name, sort_order) VALUES
    (v_biru_id, 'Kimia Klinik', 1),
    (v_biru_id, 'Serologi', 2),
    (v_biru_id, 'Kromatografi', 3),
    (v_biru_id, 'Elektrolit', 4),
    (v_biru_id, 'AGD', 5),
    (v_biru_id, 'HbA1c', 6),
    (v_biru_id, 'Imuno Serologi', 7),
    (v_biru_id, 'Hormon', 8)
  ON CONFLICT DO NOTHING;

  -- Insert Tasks for UNGU
  INSERT INTO public.shift_tasks (shift_type_id, task_name, sort_order) VALUES
    (v_ungu_id, 'PH', 1),
    (v_ungu_id, 'Widal', 2),
    (v_ungu_id, 'Goldar', 3),
    (v_ungu_id, 'Tubex', 4),
    (v_ungu_id, 'Pembuatan sediaan darah', 5),
    (v_ungu_id, 'Pengecatan sediaan darah', 6)
  ON CONFLICT DO NOTHING;

  -- Insert Tasks for ABU_ABU
  INSERT INTO public.shift_tasks (shift_type_id, task_name, sort_order) VALUES
    (v_abu_id, 'Operator LIS', 1),
    (v_abu_id, 'Terima telepon', 2),
    (v_abu_id, 'Validasi hasil', 3),
    (v_abu_id, 'Lapor nilai kritis', 4),
    (v_abu_id, 'Catat nilai kritis', 5)
  ON CONFLICT DO NOTHING;

  -- Insert Tasks for HIJAU
  INSERT INTO public.shift_tasks (shift_type_id, task_name, sort_order) VALUES
    (v_hijau_id, 'TCM', 1),
    (v_hijau_id, 'Pembuatan BTA', 2),
    (v_hijau_id, 'Pengecatan BTA', 3),
    (v_hijau_id, 'SARS-CoV-2 Antigen', 4),
    (v_hijau_id, 'PCR', 5)
  ON CONFLICT DO NOTHING;

  -- Insert Tasks for PINK
  INSERT INTO public.shift_tasks (shift_type_id, task_name, sort_order) VALUES
    (v_pink_id, 'Merangkap petugas BDRS', 1)
  ON CONFLICT DO NOTHING;
END $$;
