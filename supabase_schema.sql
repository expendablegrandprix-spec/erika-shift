/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Supabase PostgreSQL Schema & RLS Fix for LabShift Personal ATLM
 * Salin dan jalankan skrip SQL ini di Supabase SQL Editor untuk menghubungkan
 * database, membuka akses Row Level Security (RLS) untuk sinkronisasi lintas browser,
 * dan memastikan foto profil tersimpan permanen di cloud database.
 */

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE (Profil Petugas ATLM & Foto Profil)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  display_name text not null default 'ATLM Patologi Klinik',
  job_title text default 'Ahli Teknologi Laboratorium Medik (ATLM)',
  work_unit text default 'Instalasi Laboratorium Patologi Klinik RSUD SSMA Pontianak',
  photo_url text,
  email text,
  password text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Lepas foreign key ke auth.users agar dapat disimpan dari aplikasi lintas peramban tanpa terhalang auth session
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Tambah kolom jika tabel sudah dibuat sebelumnya
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'photo_url') then
    alter table public.profiles add column photo_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
    alter table public.profiles add column email text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'password') then
    alter table public.profiles add column password text;
  end if;
end $$;

-- Enable RLS & Izinkan akses penuh (SELECT, INSERT, UPDATE, DELETE) untuk sinkronisasi aplikasi
alter table public.profiles enable row level security;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Allow all on profiles" on public.profiles;
create policy "Allow all on profiles" on public.profiles for all using (true) with check (true);

-- ============================================================================
-- 2. SHIFT TYPES TABLE (Master Jenis Shift & Warna)
-- ============================================================================
create table if not exists public.shift_types (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid,
  code text not null, -- 'KUNING', 'BIRU', 'UNGU', 'ABU_ABU', 'HIJAU', 'PINK', 'SIANG', 'MALAM'
  name text not null,
  color_hex text not null,
  description text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.shift_types drop constraint if exists shift_types_user_id_fkey;
alter table public.shift_types enable row level security;
drop policy if exists "Users can view global or own shift types" on public.shift_types;
drop policy if exists "Users can insert own shift types" on public.shift_types;
drop policy if exists "Users can update own shift types" on public.shift_types;
drop policy if exists "Allow all on shift_types" on public.shift_types;
create policy "Allow all on shift_types" on public.shift_types for all using (true) with check (true);

-- ============================================================================
-- 3. SHIFT TASKS TABLE (Tugas Checklist per Jenis Shift)
-- ============================================================================
create table if not exists public.shift_tasks (
  id uuid default uuid_generate_v4() primary key,
  shift_type_id uuid references public.shift_types on delete cascade not null,
  task_name text not null,
  sort_order int default 0
);

alter table public.shift_tasks enable row level security;
drop policy if exists "Users can view shift tasks" on public.shift_tasks;
drop policy if exists "Allow all on shift_tasks" on public.shift_tasks;
create policy "Allow all on shift_tasks" on public.shift_tasks for all using (true) with check (true);

-- ============================================================================
-- 4. COWORKERS TABLE (Rekan Sejawat / Petugas Lab)
-- ============================================================================
create table if not exists public.coworkers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid,
  name text not null,
  nickname text,
  notes text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.coworkers drop constraint if exists coworkers_user_id_fkey;
alter table public.coworkers enable row level security;
drop policy if exists "Users can CRUD own coworkers" on public.coworkers;
drop policy if exists "Allow all on coworkers" on public.coworkers;
create policy "Allow all on coworkers" on public.coworkers for all using (true) with check (true);

-- ============================================================================
-- 5. SHIFTS TABLE (Jadwal Shift Dinas)
-- ============================================================================
create table if not exists public.shifts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid,
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

create index if not exists idx_shifts_user_date on public.shifts(shift_date);
alter table public.shifts drop constraint if exists shifts_user_id_fkey;
alter table public.shifts enable row level security;
drop policy if exists "Users can CRUD own shifts" on public.shifts;
drop policy if exists "Allow all on shifts" on public.shifts;
create policy "Allow all on shifts" on public.shifts for all using (true) with check (true);

-- ============================================================================
-- 6. SHIFT COWORKERS RELATION (Relasi Shift dengan Rekan Jaga)
-- ============================================================================
create table if not exists public.shift_coworkers (
  shift_id uuid references public.shifts on delete cascade not null,
  coworker_id uuid references public.coworkers on delete cascade not null,
  primary key (shift_id, coworker_id)
);

alter table public.shift_coworkers enable row level security;
drop policy if exists "Users can CRUD own shift coworkers" on public.shift_coworkers;
drop policy if exists "Allow all on shift_coworkers" on public.shift_coworkers;
create policy "Allow all on shift_coworkers" on public.shift_coworkers for all using (true) with check (true);

-- ============================================================================
-- 7. SHIFT TASK CHECKS TABLE (Checklist Tugas Shift)
-- ============================================================================
create table if not exists public.shift_task_checks (
  id uuid default uuid_generate_v4() primary key,
  shift_id uuid references public.shifts on delete cascade not null,
  task_name text not null,
  is_completed boolean default false,
  completed_at timestamp with time zone
);

alter table public.shift_task_checks enable row level security;
drop policy if exists "Users can CRUD own shift task checks" on public.shift_task_checks;
drop policy if exists "Allow all on shift_task_checks" on public.shift_task_checks;
create policy "Allow all on shift_task_checks" on public.shift_task_checks for all using (true) with check (true);

-- ============================================================================
-- 8. SHIFT CHANGE LOGS TABLE (Riwayat Perubahan & Tukar Shift)
-- ============================================================================
create table if not exists public.shift_change_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid,
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

create index if not exists idx_change_logs_created on public.shift_change_logs(created_at desc);
alter table public.shift_change_logs drop constraint if exists shift_change_logs_user_id_fkey;
alter table public.shift_change_logs enable row level security;
drop policy if exists "Users can CRUD own change logs" on public.shift_change_logs;
drop policy if exists "Allow all on shift_change_logs" on public.shift_change_logs;
create policy "Allow all on shift_change_logs" on public.shift_change_logs for all using (true) with check (true);

-- ============================================================================
-- 9. PERSONAL NOTES TABLE (Catatan Pribadi Petugas Lab)
-- ============================================================================
create table if not exists public.personal_notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid,
  shift_id uuid references public.shifts on delete set null,
  note_date date,
  title text not null,
  content text not null,
  is_pinned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_notes_pinned on public.personal_notes(is_pinned desc, created_at desc);
alter table public.personal_notes drop constraint if exists personal_notes_user_id_fkey;
alter table public.personal_notes enable row level security;
drop policy if exists "Users can CRUD own personal notes" on public.personal_notes;
drop policy if exists "Allow all on personal_notes" on public.personal_notes;
create policy "Allow all on personal_notes" on public.personal_notes for all using (true) with check (true);

-- ============================================================================
-- 10. REMINDER SETTINGS TABLE (Pengaturan Notifikasi)
-- ============================================================================
create table if not exists public.reminder_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid unique,
  enabled boolean default true,
  day_before_enabled boolean default true,
  day_before_time time default '20:00:00',
  minutes_before_shift int default 60,
  browser_notifications_enabled boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reminder_settings drop constraint if exists reminder_settings_user_id_fkey;
alter table public.reminder_settings enable row level security;
drop policy if exists "Users can CRUD own reminder settings" on public.reminder_settings;
drop policy if exists "Allow all on reminder_settings" on public.reminder_settings;
create policy "Allow all on reminder_settings" on public.reminder_settings for all using (true) with check (true);

-- ============================================================================
-- 11. INITIAL SEED (Master Shift Kuning, Biru, Ungu, Abu-abu, Hijau, Pink, Siang, Malam)
-- ============================================================================
insert into public.shift_types (code, name, color_hex, description, sort_order)
values
  ('KUNING', 'Shift Kuning', '#FEF08A', 'Shift pagi utama (Aturan warna khusus shift pagi)', 1),
  ('BIRU', 'Shift Biru', '#BAE6FD', 'Shift pagi tambahan / cadangan', 2),
  ('UNGU', 'Shift Ungu', '#E9D5FF', 'Shift siang / sore', 3),
  ('ABU_ABU', 'Shift Abu-abu', '#E2E8F0', 'Shift malam utama', 4),
  ('HIJAU', 'Shift Hijau', '#BBF7D0', 'Shift libur / off dinas resmi', 5),
  ('PINK', 'Shift Pink', '#FBCFE8', 'Shift cuti tahunan / cuti khusus', 6),
  ('SIANG', 'Shift Siang Standar', '#DDD6FE', 'Dinas laboratorium siang', 7),
  ('MALAM', 'Shift Malam Standar', '#CBD5E1', 'Dinas laboratorium malam', 8)
on conflict do nothing;

-- ============================================================================
-- 12. AKTIFKAN REALTIME PUBLICATION UNTUK SINKRONISASI OTOMATIS
-- ============================================================================
do $$
begin
  alter publication supabase_realtime add table public.profiles;
  alter publication supabase_realtime add table public.shifts;
  alter publication supabase_realtime add table public.coworkers;
  alter publication supabase_realtime add table public.shift_coworkers;
  alter publication supabase_realtime add table public.shift_task_checks;
  alter publication supabase_realtime add table public.shift_change_logs;
  alter publication supabase_realtime add table public.personal_notes;
  alter publication supabase_realtime add table public.reminder_settings;
exception
  when others then null;
end $$;
