/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Supabase PostgreSQL Schema for LabShift Personal ATLM
 * Run this SQL script in your Supabase SQL Editor to set up all tables,
 * foreign keys, indexes, and Row Level Security (RLS) policies.
 */

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE (Linked with Supabase Auth auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  job_title text default 'Ahli Teknologi Laboratorium Medik',
  work_unit text default 'Instalasi Laboratorium Patologi Klinik RSUD SSMA Pontianak',
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, job_title, work_unit)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'ATLM Patologi Klinik'),
    coalesce(new.raw_user_meta_data ->> 'job_title', 'Ahli Teknologi Laboratorium Medik'),
    coalesce(new.raw_user_meta_data ->> 'work_unit', 'Instalasi Laboratorium Patologi Klinik RSUD SSMA Pontianak')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================================
-- 2. SHIFT TYPES TABLE (Master Shift Colors & Definitions)
-- ============================================================================
create table if not exists public.shift_types (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade, -- null for global defaults, or user-specific
  code text not null, -- 'KUNING', 'BIRU', 'UNGU', 'ABU_ABU', 'HIJAU', 'PINK', 'SIANG', 'MALAM'
  name text not null,
  color_hex text not null,
  description text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.shift_types enable row level security;

create policy "Users can view global or own shift types"
  on public.shift_types for select
  using (user_id is null or user_id = auth.uid());

create policy "Users can insert own shift types"
  on public.shift_types for insert
  with check (user_id = auth.uid());

create policy "Users can update own shift types"
  on public.shift_types for update
  using (user_id = auth.uid());


-- ============================================================================
-- 3. SHIFT TASKS TABLE (Checklist tasks per shift type)
-- ============================================================================
create table if not exists public.shift_tasks (
  id uuid default uuid_generate_v4() primary key,
  shift_type_id uuid references public.shift_types on delete cascade not null,
  task_name text not null,
  sort_order int default 0
);

alter table public.shift_tasks enable row level security;

create policy "Users can view shift tasks"
  on public.shift_tasks for select
  using (true);


-- ============================================================================
-- 4. COWORKERS TABLE (Rekan Sejawat / Petugas Lab)
-- ============================================================================
create table if not exists public.coworkers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  nickname text,
  notes text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.coworkers enable row level security;

create policy "Users can CRUD own coworkers"
  on public.coworkers for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================================
-- 5. SHIFTS TABLE (Main Shift Schedules)
-- ============================================================================
create table if not exists public.shifts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  shift_date date not null, -- YYYY-MM-DD
  shift_type_id uuid references public.shift_types on delete restrict not null,
  start_time time, -- HH:mm
  end_time time,   -- HH:mm
  location text default 'Laboratorium Patologi Klinik',
  notes text,
  status text check (status in ('scheduled', 'changed', 'cancelled')) default 'scheduled',
  original_shift_type_id uuid references public.shift_types on delete set null,
  is_confirmed boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_shifts_user_date on public.shifts(user_id, shift_date);

alter table public.shifts enable row level security;

create policy "Users can CRUD own shifts"
  on public.shifts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================================
-- 6. SHIFT COWORKERS RELATION (Many-to-many between shifts and coworkers)
-- ============================================================================
create table if not exists public.shift_coworkers (
  shift_id uuid references public.shifts on delete cascade not null,
  coworker_id uuid references public.coworkers on delete cascade not null,
  primary key (shift_id, coworker_id)
);

alter table public.shift_coworkers enable row level security;

create policy "Users can CRUD own shift coworkers"
  on public.shift_coworkers for all
  using (
    exists (
      select 1 from public.shifts s
      where s.id = shift_id and s.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 7. SHIFT TASK CHECKS TABLE (Checklist progress per shift)
-- ============================================================================
create table if not exists public.shift_task_checks (
  id uuid default uuid_generate_v4() primary key,
  shift_id uuid references public.shifts on delete cascade not null,
  task_name text not null,
  is_completed boolean default false,
  completed_at timestamp with time zone
);

alter table public.shift_task_checks enable row level security;

create policy "Users can CRUD own shift task checks"
  on public.shift_task_checks for all
  using (
    exists (
      select 1 from public.shifts s
      where s.id = shift_id and s.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 8. SHIFT CHANGE LOGS TABLE (Audit trail of schedule changes)
-- ============================================================================
create table if not exists public.shift_change_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  shift_id uuid references public.shifts on delete set null,
  change_type text check (change_type in ('created', 'updated', 'cancelled', 'swapped')) not null,
  old_shift_date date,
  new_shift_date date,
  old_shift_type_id uuid references public.shift_types on delete set null,
  new_shift_type_id uuid references public.shift_types on delete set null,
  old_start_time time,
  new_start_time time,
  old_end_time time,
  new_end_time time,
  reason text,
  source text check (source in ('manual', 'chat_text', 'screenshot', 'imported')) default 'manual',
  source_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_change_logs_user on public.shift_change_logs(user_id, created_at desc);

alter table public.shift_change_logs enable row level security;

create policy "Users can CRUD own change logs"
  on public.shift_change_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================================
-- 9. PERSONAL NOTES TABLE (Catatan Personal Lab)
-- ============================================================================
create table if not exists public.personal_notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  shift_id uuid references public.shifts on delete set null,
  note_date date,
  title text not null,
  content text not null,
  is_pinned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_notes_user on public.personal_notes(user_id, is_pinned desc, created_at desc);

alter table public.personal_notes enable row level security;

create policy "Users can CRUD own personal notes"
  on public.personal_notes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================================
-- 10. REMINDER SETTINGS TABLE (Notification Preferences)
-- ============================================================================
create table if not exists public.reminder_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade unique not null,
  enabled boolean default true,
  day_before_enabled boolean default true,
  day_before_time time default '20:00:00',
  minutes_before_shift int default 60,
  browser_notifications_enabled boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reminder_settings enable row level security;

create policy "Users can CRUD own reminder settings"
  on public.reminder_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================================
-- 11. SEED DEFAULT SHIFT TYPES (Global standard shift types)
-- ============================================================================
insert into public.shift_types (code, name, color_hex, description, sort_order) values
('KUNING', 'Shift Kuning', '#FEF08A', 'Shift pagi utama (Aturan warna khusus shift pagi)', 1),
('BIRU', 'Shift Biru', '#BAE6FD', 'Shift pagi tambahan / cadangan', 2),
('UNGU', 'Shift Ungu', '#E9D5FF', 'Shift siang / sore', 3),
('ABU_ABU', 'Shift Abu-Abu', '#E2E8F0', 'Shift siang atau rotasi', 4),
('HIJAU', 'Shift Hijau', '#BBF7D0', 'Shift pagi / khusus', 5),
('PINK', 'Shift Pink', '#FFCED8', 'Shift pagi / khusus lab', 6),
('SIANG', 'Shift Siang', '#FED7AA', 'Shift siang standar (14.00 - 21.30)', 7),
('MALAM', 'Shift Malam', '#C7D2FE', 'Shift malam (21.00 - 07.00)', 8)
on conflict do nothing;
